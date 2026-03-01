import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient, STORAGE_BUCKET } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    include: { _count: { select: { documents: true, chats: true } } },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id!;

  const project = await prisma.project.findFirst({
    where: { id, userId },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Clean up Supabase Storage files for this project
  try {
    const supabase = createServerSupabaseClient();
    const { data: files } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(`${userId}/${id}`);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${userId}/${id}/${f.name}`);
      await supabase.storage.from(STORAGE_BUCKET).remove(paths);
    }
  } catch (err) {
    console.error("Failed to clean up storage files:", err);
    // Non-fatal: proceed with DB delete
  }

  await prisma.project.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
