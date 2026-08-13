// ─────────────────────────────────────────────────────────────────────────────
// Axios API Client
// Cookie-based auth: reads session cookie from SecureStore and sends it as
// Cookie: header on every request (belt + braces — native jar alone is unreliable
// across iOS/Android/Expo Go).
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios';
import { loadSessionCookie, clearSessionCookie } from '../lib/secureStore';
import { router } from 'expo-router';

// On both web and native, use the URL from .env (e.g. production Vercel URL).
// Only fallback to localhost if the env variable is completely missing.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // send native cookie jar
});

// ── Request interceptor: attach session cookie header (native only) ─────────

api.interceptors.request.use(async (config) => {
  // Always send X-Mobile-Cookie to bypass cross-origin cookie issues when testing in Expo Web.
  const cookie = await loadSessionCookie();
  if (cookie) {
    config.headers['X-Mobile-Cookie'] = `${cookie.name}=${cookie.value}`;
  }
  return config;
});

// ── Response interceptor: 401 → wipe + redirect to login ──────────────────

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearSessionCookie();
      // Navigate to login without a full reload
      router.replace('/(auth)/login');
    }
    return Promise.reject(error);
  }
);

export { api, BASE_URL };
export default api;
