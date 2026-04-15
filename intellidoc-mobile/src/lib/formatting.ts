// ── File size formatting ────────────────────────────────────────

export function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ── MIME type formatting ────────────────────────────────────────

export function formatMimeType(mime?: string | null): string {
  if (!mime) return 'FILE';
  const lower = mime.toLowerCase();
  if (lower.includes('wordprocessingml.document')) return 'DOCX';
  if (lower.includes('spreadsheetml.sheet')) return 'XLSX';
  if (lower.includes('presentationml.presentation')) return 'PPTX';
  if (lower.includes('pdf')) return 'PDF';
  if (lower.includes('csv')) return 'CSV';
  if (lower.includes('plain')) return 'TXT';
  if (lower.includes('markdown')) return 'MD';
  if (lower.includes('json')) return 'JSON';
  const parts = mime.split('/');
  const ext = parts[1]?.toUpperCase() ?? 'FILE';
  return ext.length > 8 ? ext.substring(0, 8) + '…' : ext;
}

// ── Date formatting ─────────────────────────────────────────────

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Document status label ────────────────────────────────────────

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Queued',
    PROCESSING: 'Processing',
    INDEXED: 'Ready',
    ERROR: 'Failed',
    CANCELLED: 'Cancelled',
  };
  return labels[status] ?? status;
}

// ── Confidence score ──────────────────────────────────────────────

export function formatConfidenceScore(score?: number | null): string {
  if (score == null) return '—';
  return `${Math.round(score * 100)}%`;
}

// ── Credit amount ───────────────────────────────────────────────

export function formatCredits(amount: number): string {
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
  return `${amount}`;
}
