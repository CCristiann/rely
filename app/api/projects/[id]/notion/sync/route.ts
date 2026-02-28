import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  const dataSource = await prisma.dataSource.findFirst({
    where: { projectId, type: "NOTION", project: { userId: session.user.id } },
  });
  if (!dataSource) {
    return NextResponse.json({ error: "Notion not connected" }, { status: 404 });
  }

  await inngest.send({
    name: "notion/sync.requested",
    data: { dataSourceId: dataSource.id, projectId },
  });

  return NextResponse.json({ status: "syncing" });
}
