import { useState, useEffect, useCallback } from 'react';
import { getTrades, buildFundTxn, submitSignedTxn, withdrawFunds } from '../services/api';
import TradeCard from '../components/TradeCard';
import CreateTradeForm from '../components/CreateTradeForm';
import ContractHistory, { filterTrades } from '../components/ContractHistory';

export default function BuyerDashboard({ address }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const fetchTrades = useCallback(async () => {
    try {
      const res = await getTrades();
      setTrades(res.data.data.filter(t => t.buyer_address === address));
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  // Polls every 5s
  useEffect(() => {
    const interval = setInterval(fetchTrades, 5000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = async (action, tradeId) => {
    if (action === 'fund') {
      try {
        await buildFundTxn(tradeId);
        // Mock mode: skip wallet signing, state already mutated
        await submitSignedTxn(tradeId, 'MOCK_SIGNED');
        showToast('Escrow funded successfully! 🎉');
        fetchTrades();
      } catch (err) {
        showToast(err.response?.data?.detail || err.message || 'Fund failed', 'error');
      }
    } else if (action === 'withdraw') {
      try {
        await withdrawFunds(tradeId);
        // Mock mode: skip wallet signing
        showToast('Funds withdrawn to your wallet! 💸');
        fetchTrades();
      } catch (err) {
        showToast(err.response?.data?.detail || err.message || 'Withdraw failed', 'error');
      }
    }
  };

  const stats = {
    total: trades.length,
    active: trades.filter(t => ['CREATED', 'ACCEPTED', 'FUNDED', 'DELIVERED'].includes(t.state)).length,
    released: trades.filter(t => t.state === 'RELEASED').length,
    violated: trades.filter(t => ['VIOLATED', 'REFUNDED'].includes(t.state)).length,
  };

  const displayed = filterTrades(trades, activeTab);

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        🛒 Buyer Dashboard
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        Create contracts, fund escrow, and track your orders.
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Contracts', value: stats.total, color: '#6366f1' },
          { label: 'Active', value: stats.active, color: '#f59e0b' },
          { label: 'Completed', value: stats.released, color: '#10b981' },
          { label: 'Violated', value: stats.violated, color: '#fb7185' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Create Form */}
        <CreateTradeForm onCreated={fetchTrades} />

        {/* Trade List */}
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Your Contracts</h2>
          <ContractHistory
            trades={trades}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            role="buyer"
          />
          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
              Loading...
            </div>
          ) : displayed.length === 0 ? null : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {displayed.map(t => (
                <TradeCard key={t._id} trade={t} role="buyer" onAction={handleAction} />
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
