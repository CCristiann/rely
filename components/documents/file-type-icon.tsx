import { FileText, FileType, BookOpen, File } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
