import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ragQuery } from "@/lib/rag/query";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const chatSchema = z.object({
  // Cap user question at 4 000 characters to prevent token exhaustion attacks.
  question: z.string().min(1).max(4000),
  // chatId must be a non-empty string; UUIDs are 36 chars but we allow up to
  // 128 to stay compatible with any ID format without leaking schema details.
  chatId: z.string().min(1).max(128),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        // Cap each history message at 8 000 characters (roughly 2k tokens).
        // The AI SDK further constrains the overall context window; this limit
        // prevents a crafted large history from exhausting quota or tokens.
        content: z.string().min(1).max(8000),
      })
    )
    // Limit the number of history turns sent per request.
    .max(50)
    .optional()
    .default([]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 20 chat requests per minute per user (Gemini is expensive)
  const rl = await rateLimit(`chat:${session.user.id}`, { limit: 20, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before sending another message." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.reset - Math.floor(Date.now() / 1000)) },
      }
    );
  }

  const { id: projectId } = await params;

  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = chatSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { question, chatId, history } = parsed.data;

  // Verify chat belongs to project
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, projectId },
  });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  // Save user message
  await prisma.message.create({
    data: { chatId, role: "user", content: question },
  });

  // Create a placeholder assistant message BEFORE streaming starts.
  // This guarantees a DB record exists even if the server times out or crashes
  // mid-stream — preventing conversations where a user message has no reply.
  const aiPlaceholder = await prisma.message.create({
    data: { chatId, role: "assistant", content: "" },
  });

  // Stream RAG response
  const result = await ragQuery({ question, projectId, chatHistory: history });

  let fullContent = "";

  const stream = result.toDataStream();
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });

          // Extract text from AI SDK data stream format
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("0:")) {
              try {
                const text = JSON.parse(line.slice(2));
                fullContent += text;
              } catch { }
            }
          }

          controller.enqueue(value);
        }

        // Update placeholder with real content, or delete it if stream was empty
        if (fullContent) {
          await prisma.message.update({
            where: { id: aiPlaceholder.id },
            data: { content: fullContent },
          });

          // Update chat name from first user message if it's the default
          if (chat.name === "New Chat") {
            await prisma.chat.update({
              where: { id: chatId },
              data: { name: question.slice(0, 60) },
            });
          }

          // Touch chat updatedAt
          await prisma.chat.update({
            where: { id: chatId },
            data: { updatedAt: new Date() },
          });
        } else {
          await prisma.message.delete({ where: { id: aiPlaceholder.id } });
        }

        controller.close();
      } catch (err) {
        // Persist whatever was accumulated so far, or clean up empty placeholder
        if (fullContent) {
          await prisma.message.update({
            where: { id: aiPlaceholder.id },
            data: { content: fullContent },
          }).catch(() => {});
        } else {
          await prisma.message.delete({ where: { id: aiPlaceholder.id } }).catch(() => {});
        }
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Vercel-AI-Data-Stream": "v1",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = z.object({ chatId: z.string(), projectId: z.string() }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { chatId, projectId } = parsed.data;

  // Verify chat belongs to project
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, projectId },
  });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  // Delete chat
  await prisma.chat.delete({
    where: { id: chatId, projectId },
  });

  return NextResponse.json({ success: true });
}
