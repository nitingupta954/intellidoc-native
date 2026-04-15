import api from './client';
import { User, ApiKeyStatus, CreditWallet, Subscription, Payment, Analytics } from '../types';

// ── Profile ────────────────────────────────────────────────────

export async function updateProfile(data: { name?: string; image?: string }): Promise<User> {
  const res = await api.patch('/api/user/profile', data);
  return res.data.user;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post('/api/user/password', { currentPassword, newPassword });
}

// ── API Keys (BYOK) ────────────────────────────────────────────

export async function getApiKeys(): Promise<ApiKeyStatus> {
  const res = await api.get('/api/user/key');
  return res.data;
}

export async function saveApiKey(provider: 'openai' | 'gemini', key: string): Promise<void> {
  await api.post('/api/user/key', { provider, key });
}

export async function deleteApiKey(provider: 'openai' | 'gemini'): Promise<void> {
  await api.delete(`/api/user/key?provider=${provider}`);
}

// ── Notification Preferences ────────────────────────────────────

export async function getNotificationPrefs(): Promise<Record<string, boolean>> {
  const res = await api.get('/api/user/notifications');
  return res.data.preferences ?? {};
}

export async function updateNotificationPrefs(prefs: Record<string, boolean>): Promise<void> {
  await api.patch('/api/user/notifications', { preferences: prefs });
}

// ── Wallet & Billing ────────────────────────────────────────────

export async function fetchWallet(): Promise<CreditWallet> {
  const res = await api.get('/api/wallet');
  return res.data;
}

export async function fetchSubscription(): Promise<Subscription | null> {
  const res = await api.get('/api/subscriptions/current');
  return res.data.subscription ?? null;
}

export async function fetchPaymentHistory(): Promise<Payment[]> {
  const res = await api.get('/api/payments/history');
  return res.data.payments ?? [];
}

// ── Analytics ───────────────────────────────────────────────────

export async function fetchAnalytics(workspaceId: string): Promise<Analytics> {
  const res = await api.get(`/api/analytics?workspaceId=${workspaceId}`);
  return res.data;
}

// ── Shared Links ─────────────────────────────────────────────────

export async function createSharedLink(
  resourceId: string,
  resourceType: 'DOCUMENT' | 'CONVERSATION' | 'FOLDER',
  workspaceId: string,
  expiresInDays?: number,
): Promise<string> {
  const res = await api.post('/api/shared-links', {
    resourceId,
    resourceType,
    workspaceId,
    expiresInDays,
  });
  return res.data.token;
}
