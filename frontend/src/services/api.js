/**
 * services/api.js — HARDCODED MOCK API for hackathon demo
 * No backend / MongoDB needed. All data is in-memory.
 */

import { MOCK_TRADES, MOCK_VERIFIERS, DEMO_ADDRESSES } from './mockData';

// In-memory state (so actions mutate trades during the demo)
let trades = JSON.parse(JSON.stringify(MOCK_TRADES));
let verifiers = JSON.parse(JSON.stringify(MOCK_VERIFIERS));

const ok = (data) => Promise.resolve({ data: { success: true, data } });
const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

// ─── Auth ───────────────────────────
export const verifyWallet = async (wallet_address, role) => {
  await delay(300);
  return ok({ access_token: 'mock-jwt-token-' + role, token_type: 'bearer' });
};

// ─── Users ──────────────────────────
export const getUser = async (address) => {
  await delay(200);
  const completedTrades = trades.filter(t =>
    (t.farmer_address === address || t.buyer_address === address) && t.state === 'RELEASED'
  );
  return ok({
    wallet_address: address,
    role: 'buyer',
    name: 'Demo User',
    phone: '+91-9876543210',
    location: 'Pune, Maharashtra',
    total_earned_algo: completedTrades.reduce((s, t) => s + (t.amount_micro_algo / 1_000_000), 0),
    trades_completed: completedTrades.length,
    created_at: '2026-01-15T10:00:00Z',
  });
};

export const updateUser = async (data) => {
  await delay(200);
  return ok({ ...data, updated: true });
};

// ─── Trades ─────────────────────────
export const createTrade = async (data) => {
  await delay(500);
  const newTrade = {
    _id: 'trade_' + String(trades.length + 1).padStart(3, '0'),
    trade_id: 'TRD-2026-' + String(trades.length + 1).padStart(3, '0'),
    buyer_address: DEMO_ADDRESSES.buyer,
    farmer_address: data.farmer_address || DEMO_ADDRESSES.farmer,
    verifier_address: data.verifier_address || DEMO_ADDRESSES.verifier,
    crop_type: data.crop_type,
    quantity_kg: data.quantity_kg,
    price_per_kg: data.price_per_kg,
    amount_micro_algo: Math.round(data.quantity_kg * data.price_per_kg * 1_000_000),
    delivery_deadline: data.delivery_deadline,
    state: 'CREATED',
    state_code: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  trades.unshift(newTrade);
  return ok(newTrade);
};

export const getTrades = async (status) => {
  await delay(200);
  let result = trades;
  if (status) {
    result = trades.filter(t => t.state === status);
  }
  return ok(result);
};

export const getPendingVerification = async () => {
  await delay(200);
  return ok(trades.filter(t => t.state === 'DELIVERED'));
};

export const getTrade = async (id) => {
  await delay(200);
  const trade = trades.find(t => t._id === id);
  return ok(trade || null);
};

export const getTradeStatus = async (id) => {
  await delay(100);
  const trade = trades.find(t => t._id === id);
  return ok({ state: trade?.state, state_code: trade?.state_code });
};

// ─── Contract Lifecycle ─────────────
export const acceptContract = async (id) => {
  await delay(600);
  const t = trades.find(t => t._id === id);
  if (t) { t.state = 'ACCEPTED'; t.state_code = 1; t.updated_at = new Date().toISOString(); }
  return ok(t);
};

export const buildFundTxn = async (id) => {
  await delay(600);
  const t = trades.find(t => t._id === id);
  if (t) { t.state = 'FUNDED'; t.state_code = 2; t.updated_at = new Date().toISOString(); }
  // Return mock unsigned txns so the UI doesn't crash
  return ok({
    unsigned_txns: {
      payment_txn: 'MOCK_PAYMENT_TXN_BASE64',
      app_call_txn: 'MOCK_APP_CALL_TXN_BASE64',
    },
    // Flag so we skip actual wallet signing in demo
    mock: true,
  });
};

export const markDelivered = async (id, formData) => {
  await delay(600);
  const t = trades.find(t => t._id === id);
  if (t) {
    t.state = 'DELIVERED';
    t.state_code = 3;
    t.ipfs_cid = 'QmDEMO' + Math.random().toString(36).substring(2, 12);
    t.updated_at = new Date().toISOString();
  }
  return ok(t);
};

export const buildConfirmTxn = async (id) => {
  await delay(500);
  return ok({ unsigned_txn: 'MOCK_CONFIRM_TXN_BASE64', mock: true });
};

export const verifyContract = async (id, approved) => {
  await delay(600);
  const t = trades.find(t => t._id === id);
  if (t) {
    if (approved) {
      t.state = 'RELEASED';
      t.state_code = 4;
      t.verification_result = 'approved';
    } else {
      t.state = 'VIOLATED';
      t.state_code = 8;
      t.verification_result = 'violated';
    }
    t.verified_by = DEMO_ADDRESSES.verifier;
    t.verified_at = new Date().toISOString();
    t.updated_at = new Date().toISOString();
  }
  return ok({ ...t, unsigned_txn: 'MOCK_VERIFY_TXN_BASE64', mock: true });
};

export const withdrawFunds = async (id) => {
  await delay(600);
  const t = trades.find(t => t._id === id);
  if (t) { t.state = 'REFUNDED'; t.state_code = 9; t.updated_at = new Date().toISOString(); }
  return ok({ ...t, unsigned_txn: 'MOCK_WITHDRAW_TXN_BASE64', mock: true });
};

export const buildDisputeTxn = async (id) => {
  await delay(500);
  const t = trades.find(t => t._id === id);
  if (t) { t.state = 'DISPUTED'; t.state_code = 5; t.updated_at = new Date().toISOString(); }
  return ok({ unsigned_txn: 'MOCK_DISPUTE_TXN_BASE64', mock: true });
};

export const buildRefundTxn = async (id) => {
  await delay(500);
  const t = trades.find(t => t._id === id);
  if (t) { t.state = 'REFUNDED'; t.state_code = 9; t.updated_at = new Date().toISOString(); }
  return ok({ unsigned_txn: 'MOCK_REFUND_TXN_BASE64', mock: true });
};

export const submitSignedTxn = async (id, signed_txn) => {
  await delay(300);
  return ok({ tx_id: 'MOCK_TX_' + Date.now(), confirmed: true });
};

export const voteDispute = async (id, vote_for_farmer) => {
  await delay(400);
  const t = trades.find(t => t._id === id);
  if (t) {
    if (vote_for_farmer) {
      t.dispute_votes_farmer = (t.dispute_votes_farmer || 0) + 1;
    } else {
      t.dispute_votes_buyer = (t.dispute_votes_buyer || 0) + 1;
    }
    t.updated_at = new Date().toISOString();
  }
  return ok(t);
};

// ─── Verifiers ──────────────────────
export const getVerifiers = async () => {
  await delay(200);
  return ok(verifiers);
};

export const addVerifier = async (data) => {
  await delay(400);
  const entry = {
    ...data,
    added_at: new Date().toISOString(),
  };
  verifiers.push(entry);
  return ok(entry);
};

export const removeVerifier = async (address) => {
  await delay(300);
  verifiers = verifiers.filter(v => v.wallet_address !== address);
  return ok({ removed: true });
};

// Default export for compatibility
export default { interceptors: { request: { use: () => {} } } };