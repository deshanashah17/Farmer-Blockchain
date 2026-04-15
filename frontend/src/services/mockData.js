/**
 * services/mockData.js — Hardcoded mock data for hackathon demo
 * Bypasses MongoDB entirely. All data lives here.
 */

// ─── Demo Addresses ──────────────────
export const DEMO_ADDRESSES = {
  buyer: 'AIUGIMVPZYJM6E3Y7M46AYGIGQ472O376XA6GC4D7IIU74YS3DMSFF46AU',
  farmer: 'KLRT6CCROBNRBJO3EO3VABFA2CUFTZKLIX4O4HSA5ERVJH4OV2LKSFDCNE',
  verifier: 'RLA372YH7PJXJEHJJWWPZCVKLVLGIGE77MK4THDMTH5N7KGAVW7IUY6V4E',
  admin: 'ADMIN2GHTLP7QRSZXCWNBV4KDMJ9FUEY6OIA8T5LRXZSP3AWKDHM',
};

// ─── Mock Trades ─────────────────────
export const MOCK_TRADES = [];

// ─── Mock Verifiers ──────────────────
export const MOCK_VERIFIERS = [
  {
    wallet_address: DEMO_ADDRESSES.verifier,
    name: 'Rajesh Sharma',
    location: 'Pune Agri Warehouse',
    added_at: '2026-02-15T10:00:00Z',
  },
  {
    wallet_address: 'VERIFY2LQRTPZ8BXWNCM4DSGK7HFUEJ6AOYIV5RLTZXS3PWANKHQJ',
    name: 'Priya Patel',
    location: 'Mumbai Distribution Center',
    added_at: '2026-02-20T14:30:00Z',
  },
  {
    wallet_address: 'VERIFY3MKNSQW9CXBR4DTGP7LHFUEJ6AOYIV5RLTZXS8PWANKDHQJ',
    name: 'Amit Deshmukh',
    location: 'Nagpur Cold Storage',
    added_at: '2026-03-01T09:15:00Z',
  },
];
