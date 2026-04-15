import api from './client';
import { KnowledgeBase } from '../types';

export async function fetchKnowledgeBases(workspaceId: string): Promise<KnowledgeBase[]> {
  const res = await api.get(`/api/knowledge-bases?workspaceId=${workspaceId}`);
  return res.data.knowledgeBases ?? [];
}

export async function createKnowledgeBase(
  name: string,
  description: string,
  workspaceId: string,
): Promise<KnowledgeBase> {
  const res = await api.post(`/api/knowledge-bases?workspaceId=${workspaceId}`, {
    name,
    description,
    workspaceId,
  });
  return res.data.knowledgeBase;
}

export async function attachDocumentsToKb(
  kbId: string,
  documentIds: string[],
): Promise<void> {
  await api.post(`/api/knowledge-bases/${kbId}/documents`, { documentIds });
}

export async function deleteKnowledgeBase(id: string): Promise<void> {
  await api.delete(`/api/knowledge-bases/${id}`);
}
