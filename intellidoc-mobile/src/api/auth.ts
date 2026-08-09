// ─────────────────────────────────────────────────────────────────────────────
// Auth API — React Native mobile auth flows
//
// Uses dedicated /api/auth/mobile-* endpoints that bypass NextAuth's CSRF
// requirement (which cannot be satisfied from React Native's native HTTP stack).
// On web, falls back to the standard NextAuth session cookie flow.
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios';
import { Platform } from 'react-native';

import { BASE_URL } from './client';
import {
  saveSessionCookie,
  clearSessionCookie,
  loadSessionCookie,
  StoredCookie,
} from '../lib/secureStore';
import { User } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * After a successful mobile-login / mobile-verify-otp call, store the returned
 * JWT as our session cookie in SecureStore.
 */
async function storeTokenFromResponse(data: {
  token: string;
  cookieName: string;
  expires: string;
  user: User;
}): Promise<User> {
  // Always save session cookie (even on web) so we can manually send X-Mobile-Cookie
  // to bypass cross-origin cookie issues when testing in Expo Web.
  const cookie: StoredCookie = {
    name: data.cookieName,
    value: data.token,
    expires: data.expires,
  };
  await saveSessionCookie(cookie);
  return data.user;
}

// ── Public Auth Functions ─────────────────────────────────────────────────────

/**
 * Login with email + password.
 * Native: calls /api/auth/mobile-login which returns a JWT directly.
 * Web: calls the same endpoint (it also sets a Set-Cookie so the browser works too).
 */
export async function login(email: string, password: string): Promise<User> {
  const res = await axios.post(
    `${BASE_URL}/api/auth/mobile-login`,
    { email, password },
    { timeout: 20_000 }
  );

  if (res.status !== 200) {
    throw new Error(res.data?.error ?? 'Login failed.');
  }

  return storeTokenFromResponse(res.data);
}

/**
 * OTP verification — completes registration and logs the user in.
 */
export async function verifyOtp(email: string, otp: string): Promise<User> {
  const res = await axios.post(
    `${BASE_URL}/api/auth/mobile-verify-otp`,
    { email, otp },
    { timeout: 20_000 }
  );

  if (res.status !== 200) {
    throw new Error(res.data?.error ?? 'OTP verification failed.');
  }

  return storeTokenFromResponse(res.data);
}

/**
 * Register a new user — sends OTP email but does NOT log in.
 * Follow up with verifyOtp().
 */
export async function register(
  name: string,
  email: string,
  password: string,
): Promise<void> {
  const res = await axios.post(
    `${BASE_URL}/api/auth/register`,
    { name, email, password },
    { timeout: 20_000 }
  );
  if (res.status !== 201) {
    const msg = res.data?.error ?? 'Registration failed';
    throw new Error(msg);
  }
}

/**
 * Fetch current session user from NextAuth.
 * Sends the stored session JWT as X-Mobile-Cookie (rewritten to Cookie in middleware).
 */
export async function getCurrentUser(): Promise<User> {
  const headers: Record<string, string> = {};

  const storedCookie = await loadSessionCookie();
  if (storedCookie) {
    headers['X-Mobile-Cookie'] = `${storedCookie.name}=${storedCookie.value}`;
  }

  const res = await axios.get(`${BASE_URL}/api/auth/session`, {
    headers,
    timeout: 10_000,
  });

  const user = res.data?.user as User | undefined;
  if (!user?.id) throw new Error('Not authenticated');
  return user;
}

/**
 * Logout: clear local session state.
 * We don't call NextAuth's /api/auth/signout because it also requires CSRF.
 * The JWT expiry handles server-side invalidation.
 */
export async function logout(): Promise<void> {
  await clearSessionCookie();
}

export async function forgotPassword(email: string): Promise<void> {
  const res = await axios.post(
    `${BASE_URL}/api/auth/forgot-password`,
    { email },
    { timeout: 15_000 }
  );
  if (res.status >= 400) {
    throw new Error(res.data?.error ?? 'Failed to send reset email');
  }
}

export async function resetPassword(
  email: string,
  otp: string,
  password: string,
): Promise<void> {
  const res = await axios.post(
    `${BASE_URL}/api/auth/reset-password`,
    { email, otp, password },
    { timeout: 15_000 }
  );
  if (res.status >= 400) {
    throw new Error(res.data?.error ?? 'Failed to reset password');
  }
}
