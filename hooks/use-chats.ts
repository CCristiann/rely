"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Chat, Message, CreateChatInput, DeleteChatInput } from "@/types";

interface RenameChatInput {
  name: string;
}

async function fetchChats(projectId: string): Promise<Chat[]> {
  const res = await fetch(`/api/projects/${projectId}/chats`);
  if (!res.ok) throw new Error("Failed to fetch chats");
  return res.json();
}

async function fetchChat(projectId: string, chatId: string): Promise<Chat & { messages: Message[] }> {
  const res = await fetch(`/api/projects/${projectId}/chats/${chatId}`);
  if (!res.ok) throw new Error("Failed to fetch chat");
  return res.json();
}

async function createChat(projectId: string, data: CreateChatInput): Promise<Chat> {
  const res = await fetch(`/api/projects/${projectId}/chats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to create chat");
  }
  return res.json();
}

async function renameChat(projectId: string, chatId: string, data: RenameChatInput): Promise<Chat> {
  const res = await fetch(`/api/projects/${projectId}/chats/${chatId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to rename chat");
  }
  return res.json();
}

async function deleteChat(projectId: string, chatId: string): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/chat`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, projectId })
  });
  if (!res.ok) throw new Error("Failed to delete chat");
}

export function useChats(projectId: string) {
  return useQuery({
    queryKey: ["chats", projectId],
    queryFn: () => fetchChats(projectId),
    enabled: !!projectId,
  });
}

export function useChat(projectId: string, chatId: string | null) {
  return useQuery({
    queryKey: ["chats", projectId, chatId],
    queryFn: () => fetchChat(projectId, chatId!),
    enabled: !!projectId && !!chatId,
  });
}

export function useCreateChat(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateChatInput) => createChat(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats", projectId] });
    },
  });
}

export function useRenameChat(projectId: string, chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RenameChatInput) => renameChat(projectId, chatId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats", projectId] });
    },
  });
}

export function useDeleteChat(projectId: string, chatId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: DeleteChatInput) => deleteChat(projectId, chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats", projectId] });
    },
  })
}
