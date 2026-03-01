# File Type Icon Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Display a colored, type-specific icon + label chip per document type (PDF, DOCX, Notion) in the document table.

**Architecture:** Create a reusable `FileTypeIcon` component driven by a `getFileTypeConfig(mimeType)` mapping function. The existing icon container in `document-table.tsx` is replaced with `<FileTypeIcon>`, and a small colored label chip is added to the filename subtitle area.

**Tech Stack:** React, Lucide React, Tailwind CSS v4, `cn()` utility

---

### Task 1: Create `file-type-icon.tsx`

**Files:**
- Create: `components/documents/file-type-icon.tsx`

**Step 1: Create the file with config map and component**

```tsx
import { FileText, FileType, BookOpen, File } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type FileTypeConfig = {
    label: string;
    Icon: LucideIcon;
    containerClass: string;
    iconClass: string;
    chipClass: string;
};

export function getFileTypeConfig(mimeType: string): FileTypeConfig {
    if (mimeType === "application/pdf") {
        return {
            label: "PDF",
            Icon: FileText,
            containerClass: "bg-red-500/10 border-red-500/20",
            iconClass: "text-red-500",
            chipClass: "text-red-500/70",
        };
    }
    if (mimeType.includes("wordprocessingml")) {
        return {
            label: "DOCX",
            Icon: FileType,
            containerClass: "bg-blue-500/10 border-blue-500/20",
            iconClass: "text-blue-500",
            chipClass: "text-blue-500/70",
        };
    }
    if (mimeType === "notion/page") {
        return {
            label: "Notion",
            Icon: BookOpen,
            containerClass: "bg-purple-500/10 border-purple-500/20",
            iconClass: "text-purple-500",
            chipClass: "text-purple-500/70",
        };
    }
    return {
        label: mimeType.split("/").pop()?.toUpperCase() ?? "FILE",
        Icon: File,
        containerClass: "bg-primary/10 border-primary/20",
        iconClass: "text-primary",
        chipClass: "text-muted-foreground",
    };
}

interface FileTypeIconProps {
    mimeType: string;
    className?: string;
}

export function FileTypeIcon({ mimeType, className }: FileTypeIconProps) {
    const { Icon, containerClass, iconClass } = getFileTypeConfig(mimeType);
    return (
        <div
            className={cn(
                "flex items-center justify-center w-9 h-9 rounded-md border shrink-0 shadow-sm transition-transform group-hover:scale-105",
                containerClass,
                className
            )}
        >
            <Icon className={cn("h-4 w-4", iconClass)} />
        </div>
    );
}
```

---

### Task 2: Update `document-table.tsx`

**Files:**
- Modify: `components/documents/document-table.tsx`

**Step 1: Replace icon imports and add new imports**

Remove `FileText`, `FileIcon` from lucide imports (no longer used directly).
Add import:
```tsx
import { FileTypeIcon, getFileTypeConfig } from "@/components/documents/file-type-icon";
```

**Step 2: Replace the icon container in the table row**

Find this block (~lines 173-178):
```tsx
<div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 border border-primary/20 shrink-0 shadow-sm transition-transform group-hover:scale-105">
    {doc.mimeType.includes("pdf") ? (
        <FileText className="h-4 w-4 text-primary" />
    ) : (
        <FileIcon className="h-4 w-4 text-primary" />
    )}
</div>
```

Replace with:
```tsx
<FileTypeIcon mimeType={doc.mimeType} />
```

**Step 3: Add the type chip in the subtitle area**

Find the subtitle div (~lines 184-189):
```tsx
<div className="flex items-center gap-2 mt-0.5">
    {/* Show size on small screens since column is hidden */}
    <span className="text-[11px] text-muted-foreground md:hidden">
        {formatBytes(doc.fileSize)}
    </span>
</div>
```

Replace with:
```tsx
<div className="flex items-center gap-1.5 mt-0.5">
    <span className={cn("text-[10px] font-semibold uppercase tracking-wide", getFileTypeConfig(doc.mimeType).chipClass)}>
        {getFileTypeConfig(doc.mimeType).label}
    </span>
    <span className="text-[10px] text-muted-foreground/40 md:hidden">·</span>
    <span className="text-[11px] text-muted-foreground md:hidden">
        {formatBytes(doc.fileSize)}
    </span>
</div>
```

**Step 4: Add `cn` to imports if not already present**

`cn` is already imported via `formatBytes, getFileExtension` — check if `cn` is in the import from `@/lib/utils`. If not, add it.

---

### Task 3: Verify and commit

**Step 1: Check for TypeScript errors**

```bash
npm run build 2>&1 | head -40
```

Expected: no errors related to changed files.

**Step 2: Commit**

```bash
git add components/documents/file-type-icon.tsx components/documents/document-table.tsx
git commit -m "feat: add colored file type icons and label chips to document table"
```
