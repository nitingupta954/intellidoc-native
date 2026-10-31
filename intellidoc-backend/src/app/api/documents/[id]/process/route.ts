import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { publishDocumentJob } from "@/lib/rabbitmq";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const documentId = resolvedParams.id;

    const document = await db.document.findUnique({
      where: { id: documentId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const isOwner = document.uploadedBy === session.user.id;
    const isMember = (document.workspace?.members?.length ?? 0) > 0;
    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Set initial processing state in database
    let updatedDoc = await db.document.update({
      where: { id: documentId },
      data: {
        status: "PROCESSING",
        currentStep: "Queueing asynchronous processing...",
        progress: 10,
        errorMessage: null,
      }
    });

    const minioPath = `minio://${process.env.S3_BUCKET_NAME || "intellidoc-documents"}/${document.storageKey}`;
    let dispatchSuccess = false;

    // 1. Attempt RabbitMQ queue
    try {
      await publishDocumentJob(
        document.id,
        minioPath,
        session.user.id,
        document.workspaceId,
        document.knowledgeBaseId || null
      );
      dispatchSuccess = true;
      updatedDoc = await db.document.update({
        where: { id: documentId },
        data: {
          currentStep: "Job queued to message broker",
          progress: 20
        }
      });
      console.log(`[Process] Dispatched document ${documentId} via RabbitMQ`);
    } catch (mqErr) {
      console.warn(`[Process] RabbitMQ unavailable, falling back to HTTP:`, mqErr);
    }

    // 2. HTTP Fallback to AI Service if RabbitMQ didn't queue it
    if (!dispatchSuccess) {
      try {
        let rawAiUrl = process.env.AI_SERVICE_URL || process.env.API_URL || "https://intellidoc-native.onrender.com";
        if (rawAiUrl.includes("=")) {
          rawAiUrl = rawAiUrl.split("=").pop()?.replace(/^["']|["']$/g, '') || rawAiUrl;
        }
        const aiServiceBase = rawAiUrl
          .trim()
          .replace(/\/+$/, '')
          .replace(/\/api\/v1$/, '')
          .replace(':8001', ':8000');

        console.log(`[Process] Triggering AI service at: ${aiServiceBase}/api/v1/documents/process`);

        const res = await fetch(`${aiServiceBase}/api/v1/documents/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            document_id: document.id,
            file_path: minioPath,
            workspace_id: document.workspaceId,
            knowledge_base_id: document.knowledgeBaseId || null,
            uploaded_by: session.user.id,
            metadata: {}
          }),
          signal: AbortSignal.timeout(15000)
        });

        if (res.ok) {
          dispatchSuccess = true;
          updatedDoc = await db.document.update({
            where: { id: documentId },
            data: {
              currentStep: "Processing in AI service background",
              progress: 20
            }
          });
          console.log(`[Process] AI Service accepted async job for ${documentId}`);
        } else {
          const errDetail = await res.text();
          console.error(`[Process] AI Service returned error: ${res.status} - ${errDetail}`);
        }
      } catch (httpErr: any) {
        console.error(`[Process] HTTP fallback error:`, httpErr);
      }
    }

    if (!dispatchSuccess) {
      updatedDoc = await db.document.update({
        where: { id: documentId },
        data: {
          status: "ERROR",
          currentStep: "Dispatch failed",
          errorMessage: "Failed to queue asynchronous processing. Please ensure the AI worker is reachable."
        }
      });
      return NextResponse.json({
        success: false,
        error: "Unable to dispatch job to processing service.",
        document: updatedDoc
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: "Asynchronous processing successfully started",
      document: updatedDoc
    });

  } catch (error: any) {
    console.error("Document process route error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
