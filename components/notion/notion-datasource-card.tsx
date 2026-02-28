"use client";

import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSyncNotion } from "@/hooks/use-notion";
import { cn } from "@/lib/utils";

interface NotionDataSourceCardProps {
  projectId: string;
  workspaceName: string;
  status: "READY" | "SYNCING" | "ERROR";
  lastSyncedAt: Date | null;
  pageCount: number;
}

export function NotionDataSourceCard({
  projectId,
  workspaceName,
  status,
  lastSyncedAt,
  pageCount,
}: NotionDataSourceCardProps) {
  const { mutate: sync, isPending } = useSyncNotion(projectId);
  const isBusy = isPending || status === "SYNCING";

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-white text-sm font-bold text-black">
            N
          </div>
          <div>
            <p className="text-sm font-medium">{workspaceName}</p>
            <p className="text-xs text-muted-foreground">
              {pageCount} page{pageCount !== 1 ? "s" : ""} indexed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === "SYNCING" && (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Syncing
            </Badge>
          )}
          {status === "READY" && (
            <Badge
              variant="outline"
              className="gap-1 border-emerald-500/30 text-emerald-500"
            >
              <CheckCircle2 className="h-3 w-3" />
              Ready
            </Badge>
          )}
          {status === "ERROR" && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Error
            </Badge>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => sync()}
            disabled={isBusy}
            title="Re-sync Notion pages"
          >
            <RefreshCw
              className={cn("h-4 w-4", isBusy && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {lastSyncedAt && (
        <p className="text-xs text-muted-foreground">
          Last synced: {new Date(lastSyncedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
