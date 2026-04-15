import api from './client';
import { Conversation, Message } from '../types';

// ── Conversations ─────────────────────────────────────────────

export async function fetchConversations(workspaceId: string): Promise<Conversation[]> {
  const res = await api.get(`/api/conversations?workspaceId=${workspaceId}`);
  return res.data.conversations ?? [];
}

export async function createConversation(
  title: string,
  workspaceId: string,
  knowledgeBaseId?: string,
  documentId?: string,
): Promise<Conversation> {
  const metadata: Record<string, string> = {};
  if (documentId) metadata.documentId = documentId;

  const res = await api.post('/api/conversations', {
    title,
    workspaceId,
    knowledgeBaseId,
    metadata,
  });
  return res.data.conversation;
}

export async function updateConversation(
  id: string,
  data: { title?: string; isPinned?: boolean; isArchived?: boolean },
): Promise<Conversation> {
  const res = await api.patch(`/api/conversations/${id}`, data);
  return res.data.conversation;
}

export async function deleteConversation(id: string): Promise<void> {
  await api.delete(`/api/conversations/${id}`);
}

// ── Messages ──────────────────────────────────────────────────

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const res = await api.get(`/api/conversations/${conversationId}/messages`);
  const msgs = res.data.messages ?? [];
  // Parse citations if they come as JSON strings
  return msgs.map((m: Message & { citations: unknown }) => ({
    ...m,
    citations:
      typeof m.citations === 'string' ? JSON.parse(m.citations) : m.citations,
  }));
}
// Note: sendMessage is handled by the streaming transport in chatStore.ts
// using expo/fetch directly, not axios.
