export const Colors = {
  // Brand — Modern Indigo / Blue
  primary: '#3b82f6',        // blue-500
  primaryLight: '#60a5fa',   // blue-400
  primaryDark: '#2563eb',    // blue-600
  accent: '#a78bfa',         // violet-400

  // Backgrounds — Premium Dark Slate
  bgDark: '#334155',         // slate-700 (overall app background, matches landing)
  bgCard: '#1e293b',         // slate-800 (cards on the dark bg)
  bgCardLight: '#475569',    // slate-600
  surface: '#475569',        // slate-600 (for subtle elevations)

  authBg: '#334155',         // slate-700

  // Text
  text: '#ffffff',           // white
  textSecondary: '#cbd5e1',  // slate-300
  textMuted: '#94a3b8',      // slate-400

  // Status
  success: '#10b981',        // emerald-500
  warning: '#f59e0b',        // amber-500
  error: '#ef4444',          // red-500
  info: '#3b82f6',           // blue-500

  // Document status
  statusPending: '#94a3b8',  
  statusProcessing: '#60a5fa',
  statusIndexed: '#10b981',
  statusError: '#ef4444',

  // Borders
  border: 'rgba(255, 255, 255, 0.15)', // light translucent border
  borderFocus: 'rgba(59, 130, 246, 0.4)',

  // Overlays
  overlay: 'rgba(15, 23, 42, 0.8)',
  glass: 'rgba(30, 41, 59, 0.85)',

  // Stat card icon colors
  blue: '#60a5fa',
  purple: '#a78bfa',
  amber: '#fbbf24',
  teal: '#2dd4bf',
};

export const DarkColors = {
  primary: '#818cf8',        // indigo-400
  primaryLight: '#a5b4fc',   // indigo-300
  primaryDark: '#4f46e5',    // indigo-600
  accent: '#a78bfa',         // violet-400

  bgDark: '#0f172a',         // slate-900
  bgCard: '#1e293b',         // slate-800
  bgCardLight: '#1e293b',
  surface: '#334155',        // slate-700

  authBg: '#020617',         // slate-950

  text: '#f8fafc',           // slate-50
  textSecondary: '#94a3b8',  // slate-400
  textMuted: '#64748b',      // slate-500

  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  statusPending: '#64748b',
  statusProcessing: '#818cf8',
  statusIndexed: '#10b981',
  statusError: '#ef4444',

  border: '#334155',         // slate-700
  borderFocus: 'rgba(129, 140, 248, 0.4)',

  overlay: 'rgba(2, 6, 23, 0.8)',
  glass: 'rgba(30, 41, 59, 0.85)',

  blue: '#60a5fa',
  purple: '#a78bfa',
  amber: '#fbbf24',
  teal: '#2dd4bf',
};

export const theme = {
  colors: Colors,
  dark: false,
};
