import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

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

    // Cancel processing and reset active steps/progress
    const updatedDoc = await db.document.update({
      where: { id: documentId },
      data: {
        status: "CANCELLED",
        currentStep: "Processing cancelled by user",
        progress: 0,
        errorMessage: null,
      }
    });

    return NextResponse.json({
      success: true,
      message: "Document processing cancelled",
      document: updatedDoc
    });
  } catch (error: any) {
    console.error("Cancel document processing error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
