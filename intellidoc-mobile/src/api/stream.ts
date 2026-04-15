// ─────────────────────────────────────────────────────────────────────────────
// SSE Transport + Parser (transport-agnostic)
// Uses expo/fetch which provides a WHATWG-compliant ReadableStream.
// React Native's native fetch does NOT have response.body — do not use it.
// ─────────────────────────────────────────────────────────────────────────────

import { fetch as expoFetch } from 'expo/fetch';
import { loadSessionCookie } from '../lib/secureStore';
import { StreamEvent, Citation, CragConfirmation } from '../types';

export type { StreamEvent };

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// ── Parser ────────────────────────────────────────────────────────────────────
// Feed it raw chunk strings; it emits parsed StreamEvents.

export function createSSEParser(emit: (e: StreamEvent) => void) {
  let buffer = '';
  return (chunk: string) => {
    buffer += chunk;
    let i: number;
    while ((i = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, i).replace(/\r$/, '');
      buffer = buffer.slice(i + 1);
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6);
      if (payload === '[DONE]') {
        emit({ kind: 'done' });
        return;
      }
      try {
        const parsed = JSON.parse(payload);
        if (typeof parsed === 'string') {
          emit({ kind: 'token', text: parsed });
        } else if (parsed?.event === 'citations') {
          emit({ kind: 'citations', data: parsed.data as Citation[] });
        } else if (parsed?.event === 'synthesis_mode') {
          emit({ kind: 'synthesis', reason: parsed.data?.reason ?? '' });
        } else if (parsed?.event === 'needs_confirmation') {
          const d = parsed.data;
          const conf: CragConfirmation = {
            pendingId: d.pending_id,
            verdict: d.verdict,
            reason: d.reason,
            goodDocsCount: d.good_docs_count,
            answerability: d.answerability,
          };
          emit({ kind: 'needs_confirmation', data: conf });
        }
      } catch {
        // Fallback: raw text that is not JSON
        if (payload && !payload.startsWith('{')) {
          emit({ kind: 'token', text: payload });
        }
      }
    }
  };
}

// ── Transport ─────────────────────────────────────────────────────────────────
// Opens a streaming POST request and feeds chunks through the parser.

export async function streamPost(
  path: string,
  body: unknown,
  onEvent: (e: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };

  // On web the browser manages cookies automatically — we just need credentials:'include'.
  // On native we manually inject the session cookie from SecureStore.
  let credentials: RequestCredentials = 'include';
  if (typeof navigator !== 'undefined' && navigator.product !== 'ReactNative') {
    // Web: browser handles cookies via credentials:'include'
    credentials = 'include';
  } else {
    // Native: manually set cookie header
    const cookie = await loadSessionCookie();
    if (cookie) {
      headers['Cookie'] = `${cookie.name}=${cookie.value}`;
    }
  }

  const response = await expoFetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
    credentials,
    // @ts-ignore — expo/fetch specific option for streaming
    reactNative: { textStreaming: true },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw { status: response.status, message: text };
  }

  if (!response.body) {
    throw new Error('No response body — streaming not supported on this device');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parse = createSSEParser(onEvent);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    parse(chunk);
  }
}
