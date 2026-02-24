import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient, STORAGE_BUCKET } from "@/lib/supabase";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, docId } = await params;

  // Verify project ownership — prevents IDOR: a user can only delete
  // documents that belong to projects they own.
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Find the document and confirm it belongs to the verified project.
  const document = await prisma.document.findFirst({
    where: { id: docId, projectId },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await prisma.document.delete({
    where: { id: docId },
  });

  return NextResponse.json({ success: true });
}
