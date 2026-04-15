/**
 * services/constants.js — State labels, colors, and step definitions
 */

export const STATE_LABELS = {
  0: 'CREATED',
  1: 'ACCEPTED',
  2: 'FUNDED',
  3: 'DELIVERED',
  4: 'RELEASED',
  5: 'DISPUTED',
  6: 'EXPIRED',
  7: 'CANCELLED',
  8: 'VIOLATED',
  9: 'REFUNDED',
};

export const STEPS = ['CREATED', 'ACCEPTED', 'FUNDED', 'DELIVERED', 'RELEASED'];
export const ERROR_STATES = ['DISPUTED', 'EXPIRED', 'CANCELLED', 'VIOLATED', 'REFUNDED'];

export const STATE_COLORS = {
  CREATED:    { bg: '#334155', text: '#94a3b8', border: '#475569' },
  ACCEPTED:   { bg: '#1e3a5f', text: '#38bdf8', border: '#0ea5e9' },
  FUNDED:     { bg: '#1e3a5f', text: '#60a5fa', border: '#3b82f6' },
  DELIVERED:  { bg: '#1a3a2a', text: '#4ade80', border: '#22c55e' },
  RELEASED:   { bg: '#064e3b', text: '#34d399', border: '#10b981' },
  DISPUTED:   { bg: '#451a03', text: '#fb923c', border: '#f59e0b' },
  EXPIRED:    { bg: '#450a0a', text: '#f87171', border: '#ef4444' },
  CANCELLED:  { bg: '#1c1917', text: '#a8a29e', border: '#78716c' },
  VIOLATED:   { bg: '#4a0519', text: '#fb7185', border: '#e11d48' },
  REFUNDED:   { bg: '#2e1065', text: '#c084fc', border: '#a855f7' },
};

export const ROLES = ['buyer', 'farmer', 'verifier', 'admin'];

export const ROLE_LABELS = {
  buyer: '🛒 Buyer',
  farmer: '🌾 Farmer',
  verifier: '✅ Verifier',
  admin: '🔧 Admin',
};

export const ROLE_COLORS = {
  buyer:    '#6366f1',
  farmer:   '#10b981',
  verifier: '#f59e0b',
  admin:    '#ef4444',
};

export const POLL_INTERVAL = 5000; // 5 seconds

// Status filter groups for contract history
export const STATUS_FILTERS = {
  all:       null,
  active:    ['CREATED', 'ACCEPTED', 'FUNDED', 'DELIVERED'],
  completed: ['RELEASED', 'REFUNDED'],
  rejected:  ['VIOLATED', 'DISPUTED', 'EXPIRED', 'CANCELLED'],
};
