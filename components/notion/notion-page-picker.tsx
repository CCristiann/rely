"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import {
  useNotionPages,
  useSaveNotionPages,
  type NotionPageMeta,
} from "@/hooks/use-notion";

interface NotionPagePickerProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotionPagePicker({
  projectId,
  open,
  onOpenChange,
}: NotionPagePickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: pages, isLoading, error } = useNotionPages(projectId, open);
  const { mutate: savePages, isPending } = useSaveNotionPages(projectId);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSave() {
    if (!pages) return;
    const selectedPageIds = [...selected];
    const pageMetadata = Object.fromEntries(
      pages
        .filter((p) => selected.has(p.id))
        .map((p) => [p.id, { title: p.title, url: p.url }])
    );
    savePages(
      { selectedPageIds, pageMetadata },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Notion pages to index</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <p className="py-4 text-sm text-destructive">
            Failed to load pages. Make sure you shared pages with your Notion
            integration.
          </p>
        )}

        {pages && pages.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">
            No pages found. Share some pages with your Notion integration first,
            then try again.
          </p>
        )}

        {pages && pages.length > 0 && (
          <ScrollArea className="h-64 pr-4">
            <div className="space-y-1">
              {pages.map((page: NotionPageMeta) => (
                <label
                  key={page.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border accent-primary"
                    checked={selected.has(page.id)}
                    onChange={() => toggle(page.id)}
                  />
                  <span className="truncate text-sm">
                    {page.icon && (
                      <span className="mr-1">{page.icon}</span>
                    )}
                    {page.title || "Untitled"}
                  </span>
                </label>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={selected.size === 0 || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Index{" "}
            {selected.size > 0
              ? `${selected.size} page${selected.size > 1 ? "s" : ""}`
              : "pages"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
