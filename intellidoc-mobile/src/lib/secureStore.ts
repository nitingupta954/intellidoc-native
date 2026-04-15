import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CookieManager = Platform.OS !== 'web' ? require('@react-native-cookies/cookies').default : null;
const SESSION_COOKIE_KEY = 'intellidoc_session_cookie';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface StoredCookie {
  name: string;
  value: string;
  expires?: string;
  domain?: string;
  path?: string;
}

/**
 * Save session cookie to SecureStore (Keychain / Keystore).
 * This is the single source of truth for the session.
 */
export async function saveSessionCookie(cookie: StoredCookie): Promise<void> {
  await SecureStore.setItemAsync(SESSION_COOKIE_KEY, JSON.stringify(cookie));
}

/**
 * Load session cookie from SecureStore.
 */
export async function loadSessionCookie(): Promise<StoredCookie | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_COOKIE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredCookie;
  } catch {
    return null;
  }
}

/**
 * Clear session cookie from both SecureStore and the native cookie jar.
 */
export async function clearSessionCookie(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_COOKIE_KEY);
  try {
    if (CookieManager) {
      await CookieManager.clearAll();
    }
  } catch {
    // Ignore jar errors
  }
}

/**
 * Rehydrate the native cookie jar from SecureStore.
 * Call this on cold start before any API requests.
 * Returns the cookie header string for use in Axios interceptor.
 */
export async function rehydrateCookieJar(): Promise<string | null> {
  const cookie = await loadSessionCookie();
  if (!cookie) return null;

  try {
    if (CookieManager) {
      await CookieManager.set(BASE_URL, {
        name: cookie.name,
        value: cookie.value,
        domain: new URL(BASE_URL).hostname,
        path: '/',
        version: '1',
        expires: cookie.expires ?? '2099-01-01T00:00:00.000Z',
      });
    }
    return `${cookie.name}=${cookie.value}`;
  } catch (e) {
    console.warn('[CookieManager] Failed to rehydrate jar:', e);
    return `${cookie.name}=${cookie.value}`; // still return for explicit header
  }
}

/**
 * Extract the NextAuth session cookie from a Set-Cookie header string.
 * NextAuth v5 sets: authjs.session-token or __Secure-authjs.session-token
 */
export function parseSessionCookieFromHeader(setCookieHeader: string): StoredCookie | null {
  // Try each known cookie name
  const cookieNames = ['__Secure-authjs.session-token', 'authjs.session-token'];
  const parts = setCookieHeader.split(';').map((p) => p.trim());
  const nameValue = parts[0];
  if (!nameValue) return null;

  const eqIdx = nameValue.indexOf('=');
  if (eqIdx === -1) return null;

  const name = nameValue.slice(0, eqIdx);
  const value = nameValue.slice(eqIdx + 1);

  if (!cookieNames.includes(name)) return null;

  const expiresStr = parts.find((p) => p.toLowerCase().startsWith('expires='));
  const expires = expiresStr ? expiresStr.split('=')[1] : undefined;

  return { name, value, expires };
}
