import api from './client';
import { Workspace, WorkspaceMember, Invitation, WorkspaceRole } from '../types';

// ── Workspaces ────────────────────────────────────────────────

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const res = await api.get('/api/workspaces');
  return res.data.workspaces ?? [];
}

export async function createWorkspace(name: string, description?: string): Promise<Workspace> {
  const res = await api.post('/api/workspaces', { name, description });
  return res.data.workspace;
}

export async function updateWorkspace(id: string, data: { name?: string; description?: string }): Promise<Workspace> {
  const res = await api.patch(`/api/workspaces/${id}`, data);
  return res.data.workspace;
}

export async function deleteWorkspace(id: string): Promise<void> {
  await api.delete(`/api/workspaces/${id}`);
}

// ── Members ───────────────────────────────────────────────────

export async function fetchMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const res = await api.get(`/api/workspaces/${workspaceId}/members`);
  return res.data.members ?? [];
}

export async function removeMember(workspaceId: string, userId: string): Promise<void> {
  await api.delete(`/api/workspaces/${workspaceId}/members?userId=${userId}`);
}

// ── Invitations ───────────────────────────────────────────────

export async function inviteMember(
  workspaceId: string,
  email: string,
  role: WorkspaceRole,
): Promise<Invitation> {
  const res = await api.post(`/api/workspaces/${workspaceId}/invite`, { email, role, client: 'mobile' });
  return res.data.invitation;
}

export async function getInvitePreview(token: string): Promise<Invitation> {
  const res = await api.get(`/api/invite/${token}`);
  return res.data.invitation;
}

export async function acceptInvite(token: string): Promise<void> {
  await api.post('/api/invite/accept', { token });
}
