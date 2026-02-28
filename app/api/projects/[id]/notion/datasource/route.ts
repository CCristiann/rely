import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface NotionConfig {
  workspaceName: string;
  selectedPageIds: string[];
}

export async function GET(
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const config = dataSource.config as unknown as NotionConfig;

  return NextResponse.json({
    id: dataSource.id,
    workspaceName: config.workspaceName,
    status: dataSource.status,
    lastSyncedAt: dataSource.lastSyncedAt?.toISOString() ?? null,
    pageCount: config.selectedPageIds?.length ?? 0,
  });
}
