import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const renameChatSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; chatId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, chatId } = await params;

  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, projectId },
  });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  // Load the most recent 50 messages to avoid OOM on long conversations.
  // Messages are fetched newest-first then reversed so the client receives
  // them in chronological order.
  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  messages.reverse();

  return NextResponse.json({ ...chat, messages });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; chatId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, chatId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = renameChatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const chat = await prisma.chat.findFirst({ where: { id: chatId, projectId } });
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const updated = await prisma.chat.update({
    where: { id: chatId },
    data: { name: parsed.data.name },
  });

  return NextResponse.json(updated);
}
