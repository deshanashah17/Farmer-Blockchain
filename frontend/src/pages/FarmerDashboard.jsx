import { useState, useEffect, useCallback } from 'react';
import { getTrades, acceptContract, markDelivered } from '../services/api';
import TradeCard from '../components/TradeCard';
import ContractHistory, { filterTrades } from '../components/ContractHistory';

export default function FarmerDashboard({ address }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const fetchTrades = useCallback(async () => {
    try {
      const res = await getTrades();
      setTrades(res.data.data.filter(t => t.farmer_address === address));
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

  const handleAction = async (action, tradeId) => {
    if (action === 'accept') {
      try {
        await acceptContract(tradeId);
        showToast('Contract accepted! Waiting for buyer to fund escrow ✅');
        fetchTrades();
      } catch (err) {
        showToast(err.response?.data?.detail || 'Accept failed', 'error');
      }
    } else if (action === 'deliver') {
      try {
        await markDelivered(tradeId);
        showToast('Delivery marked! Waiting for verifier approval 📦');
        fetchTrades();
      } catch (err) {
        showToast(err.response?.data?.detail || 'Deliver failed', 'error');
      }
    }
  };

  const totalEarned = trades
    .filter(t => t.state === 'RELEASED')
    .reduce((sum, t) => sum + (t.amount_micro_algo || 0) / 1_000_000, 0);

  const stats = {
    pending: trades.filter(t => t.state === 'CREATED').length,
    active: trades.filter(t => ['ACCEPTED', 'FUNDED', 'DELIVERED'].includes(t.state)).length,
    completed: trades.filter(t => t.state === 'RELEASED').length,
    violated: trades.filter(t => ['VIOLATED', 'REFUNDED'].includes(t.state)).length,
  };

  const displayed = filterTrades(trades, activeTab);

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        🌾 Farmer Dashboard
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        Accept contracts, mark deliveries, and track your earnings.
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>
            {totalEarned.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>ALGO Earned</div>
        </div>
        {[
          { label: 'Pending', value: stats.pending, color: '#94a3b8' },
          { label: 'Active', value: stats.active, color: '#60a5fa' },
          { label: 'Completed', value: stats.completed, color: '#10b981' },
          { label: 'Violated', value: stats.violated, color: '#fb7185' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Contract History Tabs */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Your Contracts</h2>
      <ContractHistory
        trades={trades}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        role="farmer"
      />

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
          Loading...
        </div>
      ) : displayed.length === 0 ? null : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {displayed.map(t => (
            <TradeCard key={t._id} trade={t} role="farmer" onAction={handleAction} />
          ))}
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
