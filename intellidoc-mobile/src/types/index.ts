// ─────────────────────────────────────────────────────────────
// All TypeScript types mirrored from prisma/schema.prisma
// and from the AI service schemas/chat.py
// ─────────────────────────────────────────────────────────────

// ── Enums ────────────────────────────────────────────────────

export type Plan = 'FREE' | 'PRO' | 'ENTERPRISE';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
export type DocumentStatus = 'PENDING' | 'UPLOADED' | 'PROCESSING' | 'INDEXED' | 'ERROR' | 'CANCELLED';
export type CreditTxType = 'SIGNUP_GRANT' | 'PURCHASE' | 'DEBIT_CHAT' | 'DEBIT_EMBEDDING' | 'DEBIT_VOICE' | 'DEBIT_SUMMARY' | 'REFUND' | 'ADJUSTMENT';

// ── User ─────────────────────────────────────────────────────

export interface User {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  image?: string;
  emailVerified?: string;
  plan: Plan;
  subscriptionStatus?: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
}

// ── Workspace ─────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  role?: WorkspaceRole; // added by API from WorkspaceMember
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
  user?: Pick<User, 'id' | 'name' | 'email' | 'image'>;
}

export interface Invitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  status: InviteStatus;
  expiresAt: string;
  invitedBy: string;
  createdAt: string;
}

// ── Documents ─────────────────────────────────────────────────

export interface Document {
  id: string;
  workspaceId: string;
  uploadedBy: string;
  filename: string;
  mimeType: string;
  storageKey: string;
  status: DocumentStatus;
  progress: number;
  currentStep?: string | null;
  chunkCount?: number | null;
  embeddingModel?: string | null;
  errorMessage?: string | null;
  jobId?: string | null;
  summary?: string | null;
  suggestedQuestions?: string[] | null;
  title?: string | null;
  fileSize?: number | null;
  knowledgeBaseId?: string | null;
  folderId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  workspaceId: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Knowledge Base ─────────────────────────────────────────────

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { documents: number };
}

// ── Chat ─────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  workspaceId: string;
  title: string;
  userId: string;
  isPinned: boolean;
  isArchived: boolean;
  knowledgeBaseId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  messages?: { content: string; createdAt: string }[];
}

export interface Citation {
  id?: string;
  score?: number | null;
  text_snippet?: string;
  full_text?: string;
  metadata?: Record<string, unknown>;
  // DB-stored citation fields
  messageId?: string;
  docId?: string;
  chunkId?: string;
  pageNumber?: number;
  excerpt?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[] | null;
  confidence?: number | null;
  hallucinationScore?: number | null;
  hasWarning?: boolean;
  faithfulness?: number | null;
  answerRelevancy?: number | null;
  contextPrecision?: number | null;
  contextRecall?: number | null;
  createdAt: string;
  // UI-only streaming fields
  isStreaming?: boolean;
  isSynthesized?: boolean;
  needsConfirmation?: CragConfirmation | null;
  confirmationResolved?: boolean;
}

export interface CragConfirmation {
  pendingId: string;
  verdict: string;
  reason: string;
  goodDocsCount: number;
  answerability?: string;
}

// ── SSE Stream Events (from ai_service/services/chat_service.py) ──

export type StreamEvent =
  | { kind: 'token'; text: string }
  | { kind: 'citations'; data: Citation[] }
  | { kind: 'synthesis'; reason: string }
  | { kind: 'needs_confirmation'; data: CragConfirmation }
  | { kind: 'done' };

// ── Wallet & Billing ─────────────────────────────────────────

export interface CreditWallet {
  id: string;
  userId: string;
  balance: number;
  lifetimeGranted: number;
  lifetimeSpent: number;
  isBYOK?: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: Plan;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  plan: Plan;
  createdAt: string;
  updatedAt: string;
}

// ── Analytics ─────────────────────────────────────────────────

export interface Analytics {
  totalDocuments: number;
  totalConversations: number;
  totalMessages: number;
  storageUsed?: number;
}

// ── Shared Links ──────────────────────────────────────────────

export interface SharedLink {
  id: string;
  token: string;
  resourceId: string;
  resourceType: 'DOCUMENT' | 'CONVERSATION' | 'FOLDER';
  workspaceId: string;
  createdBy: string;
  expiresAt?: string | null;
  accessCount: number;
  createdAt: string;
}

// ── Upload ────────────────────────────────────────────────────

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
  file?: any;
}

export interface UploadQueueItem {
  name: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

// ── API Key ───────────────────────────────────────────────────

export interface ApiKeyStatus {
  hasOpenAIKey: boolean;
  hasGeminiKey: boolean;
  openaiKeyPreview?: string;
  geminiKeyPreview?: string;
}
