import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createDocumentRecord } from "@/actions/documents";
import { publishDocumentJob } from "@/lib/rabbitmq";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { storageKey, fileName, fileType, fileSize, workspaceId, knowledgeBaseId, folderId } = body;

    if (!storageKey || !workspaceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Now that the file is successfully uploaded to S3, we create the database record
    const dbRecord = await createDocumentRecord({
      title: fileName.split('.').slice(0, -1).join('.'),
      filename: storageKey, // We use storageKey as filename to avoid duplicates
      storageKey: storageKey,
      fileSize: fileSize,
      mimeType: fileType,
      uploadedBy: session.user.id,
      workspaceId,
      knowledgeBaseId,
      folderId,
    });

    if (!dbRecord.success || !dbRecord.data) {
      return NextResponse.json({ error: "Failed to create database record" }, { status: 500 });
    }

    const document = dbRecord.data;

    // Trigger RabbitMQ Job
    const minioPath = `minio://${process.env.S3_BUCKET_NAME || "intellidoc-documents"}/${document.storageKey}`;
    let processingQueued = false;

    try {
      await publishDocumentJob(
        document.id,
        minioPath,
        session.user.id,
        document.workspaceId,
        document.knowledgeBaseId || null
      );
      processingQueued = true;
    } catch (mqError) {
      console.error("Failed to push job to RabbitMQ:", mqError);
      console.log("Falling back to HTTP async processing...");
      try {
        // AI service base URL normalization (strip trailing slashes, /api/v1, or accidental prefix typos)
        let rawAiUrl = process.env.AI_SERVICE_URL || process.env.API_URL || "https://intellidoc-native.onrender.com";
        if (rawAiUrl.includes("=")) {
          rawAiUrl = rawAiUrl.split("=").pop()?.replace(/^["']|["']$/g, '') || rawAiUrl;
        }
        const aiServiceBase = rawAiUrl
          .trim()
          .replace(/\/+$/, '')
          .replace(/\/api\/v1$/, '')
          .replace(':8001', ':8000');

        console.log(`Dispatching async document processing to: ${aiServiceBase}/api/v1/documents/process`);
        const response = await fetch(`${aiServiceBase}/api/v1/documents/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Secret": process.env.INTERNAL_SERVICE_SECRET || "your_super_secret_internal_key",
            "X-OpenAI-API-Key": process.env.OPENAI_API_KEY || "",
            "X-Gemini-API-Key": process.env.GEMINI_API_KEY || ""
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

        if (response.ok) {
          processingQueued = true;
          console.log(`Successfully queued async processing for document: ${document.id}`);
        } else {
          const errText = await response.text();
          console.error("HTTP async fallback failed with status:", response.status, errText);
        }
      } catch (httpError) {
        console.error("HTTP fallback failed:", httpError);
      }
    }

    if (processingQueued) {
      await db.document.update({
        where: { id: document.id },
        data: {
          status: "PROCESSING",
          currentStep: "Queued for processing",
          progress: 15
        }
      }).catch(err => console.warn("Failed to update initial processing status:", err));
    }

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error("Upload complete route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
