import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import { formatDistanceToNowStrict } from "date-fns"

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function formatRelativeTime(date: Date) {
  return formatDistanceToNowStrict(date, { addSuffix: true })
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
  );
}

export function getFileExtension(filename: string) {
  return filename.split(".").pop();
}

export function truncate(text: string, length: number) {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function getActiveProjectIdFromPath(pathname: string) {
  const segments = pathname.split("/");
  const projectIndex = segments.indexOf("projects");
  if (projectIndex !== -1 && projectIndex + 1 < segments.length) {
    return segments[projectIndex + 1];
  }
  return null;
}

export function getActiveChatIdFromPath(pathname: string) {
  const segments = pathname.split("/");
  const chatIndex = segments.indexOf("chat");
  if (chatIndex !== -1 && chatIndex + 1 < segments.length) {
    return segments[chatIndex + 1];
  }
  return null;
}
