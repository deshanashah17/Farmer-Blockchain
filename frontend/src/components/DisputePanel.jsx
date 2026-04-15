import { useState } from 'react';

export default function DisputePanel({ trade, role, onVote }) {
  const [loading, setLoading] = useState(false);

  if (trade.state !== 'DISPUTED') return null;

  const handleVote = async (forFarmer) => {
    setLoading(true);
    try {
      await onVote?.(trade._id, forFarmer);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card animate-fade-in" style={{ borderColor: 'var(--color-warning)' }}>
      <h3 style={{ color: 'var(--color-warning)', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        ⚠️ Dispute Active
      </h3>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
        marginBottom: '1rem',
      }}>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            {trade.dispute_votes_farmer || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Votes for Farmer</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-secondary)' }}>
            {trade.dispute_votes_buyer || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Votes for Buyer</div>
        </div>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
        Three validators vote. Majority (2/3) decides who receives the escrowed ALGO.
      </p>

      {role === 'verifier' && (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-success"
            onClick={() => handleVote(true)}
            disabled={loading}
            id="vote-farmer-btn"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            🌾 Vote for Farmer
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleVote(false)}
            disabled={loading}
            id="vote-buyer-btn"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            🛒 Vote for Buyer
          </button>
        </div>
      )}
    </div>
  );
}
