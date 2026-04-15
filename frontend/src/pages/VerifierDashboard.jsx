import { useState, useEffect, useCallback } from 'react';
import { getTrades, verifyContract, submitSignedTxn } from '../services/api';
import TradeCard from '../components/TradeCard';
import ContractHistory, { filterTrades } from '../components/ContractHistory';

const CHECKLIST_ITEMS = [
  { key: 'quality', label: '✅ Quality meets the agreed standard' },
  { key: 'quantity', label: '📦 Quantity matches the contract' },
  { key: 'ontime', label: '⏰ Delivery was on time' },
];

export default function VerifierDashboard({ address }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [checklist, setChecklist] = useState({});
  const [verifyingId, setVerifyingId] = useState(null);

  const fetchTrades = useCallback(async () => {
    try {
      const res = await getTrades();
      setTrades(res.data.data.filter(t => t.verifier_address === address));
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);
  useEffect(() => {
    const interval = setInterval(fetchTrades, 5000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleCheck = (tradeId, key) => {
    setChecklist(prev => ({
      ...prev,
      [tradeId]: {
        ...prev[tradeId],
        [key]: !prev[tradeId]?.[key],
      }
    }));
  };

  const allChecked = (tradeId) => {
    return CHECKLIST_ITEMS.every(item => checklist[tradeId]?.[item.key]);
  };

  const handleApprove = async (tradeId) => {
    try {
      setVerifyingId(tradeId);
      await verifyContract(tradeId, true);
      // Mock mode: skip wallet signing
      showToast('Contract approved! Payment released to farmer 🎉');
      setChecklist(prev => ({ ...prev, [tradeId]: {} }));
      fetchTrades();
    } catch (err) {
      showToast(err.response?.data?.detail || err.message || 'Approve failed', 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleViolate = async (tradeId) => {
    if (!window.confirm('Are you sure you want to mark this contract as VIOLATED? The buyer will be able to withdraw funds.')) return;
    try {
      setVerifyingId(tradeId);
      await verifyContract(tradeId, false);
      showToast('Contract marked as violated ❌');
      fetchTrades();
    } catch (err) {
      showToast(err.response?.data?.detail || err.message || 'Failed to mark violated', 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleAction = async (action, tradeId) => {
    if (action === 'confirm') {
      const el = document.getElementById(`verify-panel-${tradeId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const stats = {
    pending: trades.filter(t => t.state === 'DELIVERED').length,
    approved: trades.filter(t => t.state === 'RELEASED').length,
    violated: trades.filter(t => ['VIOLATED', 'REFUNDED'].includes(t.state)).length,
    total: trades.length,
  };

  const displayed = filterTrades(trades, activeTab);

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        ✅ Verifier Dashboard
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        Review contracts, verify deliveries, and govern escrow releases.
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Assigned', value: stats.total, color: '#6366f1' },
          { label: 'Pending Review', value: stats.pending, color: '#f59e0b' },
          { label: 'Approved', value: stats.approved, color: '#10b981' },
          { label: 'Violated', value: stats.violated, color: '#fb7185' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alert Banner */}
      {stats.pending > 0 && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: 12, padding: '1rem', marginBottom: '2rem',
          display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
          <span style={{ fontSize: '1.5rem' }}>📋</span>
          <div>
            <div style={{ fontWeight: 600 }}>{stats.pending} Contract{stats.pending !== 1 ? 's' : ''} Awaiting Verification</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Review each delivery using the checkbox checklist, then approve or mark as violated
            </div>
          </div>
        </div>
      )}

      {/* Contract History Tabs */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Your Contracts</h2>
      <ContractHistory
        trades={trades}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        role="verifier"
      />

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
          Loading...
        </div>
      ) : displayed.length === 0 ? null : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {displayed.map(t => (
            <div key={t._id}>
              <TradeCard trade={t} role="verifier" onAction={handleAction} />

              {/* Inline Verification Panel — only for DELIVERED contracts */}
              {t.state === 'DELIVERED' && (
                <div
                  id={`verify-panel-${t._id}`}
                  className="card animate-fade-in"
                  style={{
                    marginTop: '-0.5rem', borderTopLeftRadius: 0, borderTopRightRadius: 0,
                    borderTop: '2px solid var(--color-primary)',
                    paddingTop: '1.25rem',
                  }}
                >
                  <h4 style={{
                    fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}>
                    📝 Delivery Verification Checklist
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    {CHECKLIST_ITEMS.map(item => (
                      <div
                        key={item.key}
                        className={`checkbox-row ${checklist[t._id]?.[item.key] ? 'checked' : ''}`}
                        onClick={() => toggleCheck(t._id, item.key)}
                        id={`check-${item.key}-${t._id}`}
                      >
                        <div className="checkbox-toggle">
                          {checklist[t._id]?.[item.key] ? '✓' : ''}
                        </div>
                        <span className="checkbox-label">{item.label}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      className="btn btn-success"
                      onClick={() => handleApprove(t._id)}
                      disabled={!allChecked(t._id) || verifyingId === t._id}
                      id={`approve-btn-${t._id}`}
                      style={{
                        flex: 1, justifyContent: 'center',
                        opacity: allChecked(t._id) ? 1 : 0.4,
                        cursor: allChecked(t._id) ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {verifyingId === t._id ? '⏳ Processing...' : '✅ Approve & Release Payment'}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleViolate(t._id)}
                      disabled={verifyingId === t._id}
                      id={`violate-btn-${t._id}`}
                      style={{ justifyContent: 'center' }}
                    >
                      ❌ Mark Violated
                    </button>
                  </div>

                  {!allChecked(t._id) && (
                    <div style={{
                      marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)',
                      fontStyle: 'italic',
                    }}>
                      ⚠ Check all items above to enable the Approve button
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
