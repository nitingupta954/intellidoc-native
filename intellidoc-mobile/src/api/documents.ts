import api from './client';
import { Document, Folder } from '../types';

// ── Documents ─────────────────────────────────────────────────

export async function fetchDocuments(workspaceId: string, knowledgeBaseId?: string): Promise<Document[]> {
  let url = `/api/documents?workspaceId=${workspaceId}`;
  if (knowledgeBaseId) url += `&knowledgeBaseId=${knowledgeBaseId}`;
  const res = await api.get(url);
  return res.data.documents ?? [];
}

export async function fetchDocument(id: string): Promise<Document> {
  const res = await api.get(`/api/documents/${id}`);
  return res.data.document;
}

export async function updateDocument(id: string, data: Partial<Document>): Promise<Document> {
  const res = await api.patch(`/api/documents/${id}`, data);
  return res.data.document;
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/api/documents/${id}`);
}

export async function getDocumentDownloadUrl(id: string): Promise<string> {
  // Returns a download URL — we construct it and use FileSystem.downloadAsync
  return `${api.defaults.baseURL}/api/documents/${id}/download`;
}

// ── Folders ───────────────────────────────────────────────────

export async function fetchFolders(workspaceId: string): Promise<Folder[]> {
  const res = await api.get(`/api/folders?workspaceId=${workspaceId}`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function createFolder(
  name: string,
  workspaceId: string,
  parentId?: string | null,
): Promise<Folder> {
  const res = await api.post('/api/folders', { name, workspaceId, parentId });
  return res.data.folder ?? res.data;
}

export async function deleteFolder(id: string): Promise<void> {
  await api.delete(`/api/folders/${id}`);
}
