// ─────────────────────────────────────────────────────────────────────────────
// Chat Store (Zustand) — Full SSE Streaming State Machine
// Ported from doc_maanagement/src/store/conversation-store.ts
// RN adaptations:
//   - fetch() → axios (api) for all non-streaming calls
//   - SSE streaming → streamPost() from src/api/stream.ts (expo/fetch)
//   - After [DONE]: 4s timeout → re-fetch messages for RAGAS confidence scores
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import api from '../api/client';
import { streamPost } from '../api/stream';
import {
  fetchConversations,
  createConversation,
  updateConversation,
  deleteConversation as apiDeleteConversation,
  fetchMessages,
} from '../api/conversations';
import { Message, Conversation, Citation, CragConfirmation, StreamEvent } from '../types';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isGenerating: boolean;
  isLoading: boolean;

  // Credit / wallet
  showCreditModal: boolean;
  creditErrorData: { balance: number; required: number } | null;
  walletBalance: number | null;
  isBYOK: boolean;

  // Actions
  loadConversations: (workspaceId: string) => Promise<void>;
  createConversation: (title: string, workspaceId: string, knowledgeBaseId?: string, documentId?: string) => Promise<string>;
  setActiveConversation: (id: string | null) => void;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (content: string, workspaceId: string, knowledgeBaseId?: string, documentId?: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  pinConversation: (id: string, pinned: boolean) => Promise<void>;
  resolveWebSearch: (conversationId: string, pendingId: string, consent: boolean) => Promise<void>;
  fetchWalletBalance: () => Promise<void>;
  setShowCreditModal: (show: boolean, data?: { balance: number; required: number } | null) => void;

  // Internal
  _setGenerating: (v: boolean) => void;
  _addMessage: (m: Message) => void;
  _appendToken: (chunk: string) => void;
  _setCitations: (citations: Citation[]) => void;
  _setConfirmation: (data: CragConfirmation) => void;
  _setSynthesized: () => void;
  _finalizeStream: (astMsgId: string) => void;
  _consumeSSEStream: (path: string, body: unknown, astMsgId: string, conversationId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isGenerating: false,
  isLoading: false,
  showCreditModal: false,
  creditErrorData: null,
  walletBalance: null,
  isBYOK: false,

  setShowCreditModal: (show, data) =>
    set({ showCreditModal: show, creditErrorData: data ?? null }),

  fetchWalletBalance: async () => {
    try {
      const res = await api.get('/api/wallet');
      set({ isBYOK: res.data.isBYOK ?? false, walletBalance: res.data.balance ?? null });
    } catch {
      // Ignore
    }
  },

  loadConversations: async (workspaceId) => {
    try {
      const conversations = await fetchConversations(workspaceId);
      set({ conversations });
    } catch (e) {
      console.error('[ChatStore] loadConversations:', e);
    }
  },

  createConversation: async (title, workspaceId, knowledgeBaseId, documentId) => {
    const convo = await createConversation(title, workspaceId, knowledgeBaseId, documentId);
    set((s) => ({
      conversations: [convo, ...s.conversations],
      activeConversationId: convo.id,
      messages: [],
    }));
    return convo.id;
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id });
    if (id) get().loadMessages(id);
    else set({ messages: [] });
  },

  loadMessages: async (conversationId) => {
    set({ isLoading: true });
    try {
      const messages = await fetchMessages(conversationId);
      set({ messages });
    } catch (e) {
      console.error('[ChatStore] loadMessages:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  deleteConversation: async (id) => {
    try {
      await apiDeleteConversation(id);
      set((s) => ({
        conversations: s.conversations.filter((c) => c.id !== id),
        activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
        messages: s.activeConversationId === id ? [] : s.messages,
      }));
    } catch (e) {
      console.error('[ChatStore] deleteConversation:', e);
    }
  },

  renameConversation: async (id, title) => {
    try {
      await updateConversation(id, { title });
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === id ? { ...c, title } : c,
        ),
      }));
    } catch (e) {
      console.error('[ChatStore] renameConversation:', e);
    }
  },

  pinConversation: async (id, pinned) => {
    try {
      await updateConversation(id, { isPinned: pinned });
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === id ? { ...c, isPinned: pinned } : c,
        ),
      }));
    } catch (e) {
      console.error('[ChatStore] pinConversation:', e);
    }
  },

  sendMessage: async (content, workspaceId, knowledgeBaseId, documentId) => {
    const { activeConversationId, messages } = get();

    // Check for pending CRAG confirmation — handle yes/no implicitly
    const lastAsst = [...messages].reverse().find((m) => m.role === 'assistant');
    if (lastAsst?.needsConfirmation && !lastAsst.confirmationResolved && activeConversationId) {
      const normalized = content.toLowerCase().trim().replace(/[.,!?;]+$/, '');
      const affirmative = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'do it', 'search', 'y', 'go ahead'];
      const negative = ['no', 'nope', 'nah', "don't", 'stop', 'cancel', 'n'];
      if (affirmative.includes(normalized)) {
        get()._addMessage({ id: crypto.randomUUID(), conversationId: activeConversationId, role: 'user', content, createdAt: new Date().toISOString() });
        await get().resolveWebSearch(activeConversationId, lastAsst.needsConfirmation.pendingId, true);
        return;
      } else if (negative.includes(normalized)) {
        get()._addMessage({ id: crypto.randomUUID(), conversationId: activeConversationId, role: 'user', content, createdAt: new Date().toISOString() });
        await get().resolveWebSearch(activeConversationId, lastAsst.needsConfirmation.pendingId, false);
        return;
      }
    }

    let conversationId = activeConversationId;
    if (!conversationId) {
      try {
        conversationId = await get().createConversation(
          content.substring(0, 30),
          workspaceId,
          knowledgeBaseId,
          documentId,
        );
      } catch {
        return;
      }
    }

    // Optimistic user message
    const userMsgId = crypto.randomUUID();
    get()._addMessage({
      id: userMsgId,
      conversationId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    });
    get()._setGenerating(true);

    // Optimistic assistant streaming placeholder
    const astMsgId = crypto.randomUUID();
    get()._addMessage({
      id: astMsgId,
      conversationId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      createdAt: new Date().toISOString(),
    });

    try {
      await get()._consumeSSEStream(
        `/api/conversations/${conversationId}/messages`,
        { message: content },
        astMsgId,
        conversationId,
      );
      // Refresh conversation list to pick up auto-renamed title
      get().loadConversations(workspaceId);
    } catch (e: any) {
      if (e?.status === 402) {
        get().setShowCreditModal(true, e.data);
        set((s) => ({
          messages: s.messages.filter((m) => m.id !== userMsgId && m.id !== astMsgId),
        }));
      } else {
        get()._appendToken(' ⚠️ Sorry, an error occurred. Please try again.');
        get()._finalizeStream(astMsgId);
      }
    } finally {
      get()._setGenerating(false);
    }
  },

  resolveWebSearch: async (conversationId, pendingId, consent) => {
    const { messages } = get();
    const lastMsg = [...messages].reverse().find(
      (m) => m.role === 'assistant' && m.needsConfirmation?.pendingId === pendingId,
    );
    if (!lastMsg) return;

    // Optimistically mark confirmed + start streaming
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === lastMsg.id ? { ...m, confirmationResolved: true, isStreaming: true } : m,
      ),
    }));
    get()._setGenerating(true);

    try {
      await get()._consumeSSEStream(
        `/api/conversations/${conversationId}/messages/resolve`,
        { pendingId, consent },
        lastMsg.id,
        conversationId,
      );
    } catch (e: any) {
      if (e?.status === 410) {
        get()._appendToken('\n\n_This confirmation expired — please ask your question again._');
      } else if (e?.status === 402) {
        get().setShowCreditModal(true, e.data);
      } else {
        get()._appendToken('\n\n⚠️ Error resolving web search.');
      }
      get()._finalizeStream(lastMsg.id);
    } finally {
      get()._setGenerating(false);
    }
  },

  _consumeSSEStream: async (path, body, astMsgId, conversationId) => {
    await streamPost(path, body, (event: StreamEvent) => {
      switch (event.kind) {
        case 'token':
          get()._appendToken(event.text);
          break;
        case 'citations':
          get()._setCitations(event.data);
          break;
        case 'synthesis':
          get()._setSynthesized();
          break;
        case 'needs_confirmation':
          get()._setConfirmation(event.data);
          break;
        case 'done':
          get()._finalizeStream(astMsgId);
          // After stream: wait 4s then re-fetch messages for RAGAS confidence scores
          setTimeout(async () => {
            try {
              const messages = await fetchMessages(conversationId);
              set({ messages });
            } catch {
              // Ignore RAGAS re-fetch errors
            }
          }, 4000);
          break;
      }
    });
  },

  // ── Internal mutation helpers ──────────────────────────────────────────────

  _setGenerating: (v) => set({ isGenerating: v }),

  _addMessage: (m) =>
    set((s) => ({ messages: [...s.messages, m] })),

  _appendToken: (chunk) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
      }
      return { messages: msgs };
    }),

  _setCitations: (citations) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, citations };
      }
      return { messages: msgs };
    }),

  _setConfirmation: (data) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, needsConfirmation: data };
      }
      return { messages: msgs };
    }),

  _setSynthesized: () =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, isSynthesized: true };
      }
      return { messages: msgs };
    }),

  _finalizeStream: (astMsgId) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === astMsgId ? { ...m, isStreaming: false } : m,
      ),
    })),
}));
