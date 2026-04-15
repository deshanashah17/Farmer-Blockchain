import { Link } from 'react-router-dom';
import StatusTimeline from './StatusTimeline';

export default function TradeCard({ trade, role, onAction }) {
  const amount = (trade.amount_micro_algo / 1_000_000).toFixed(2);
  const isViolated = trade.state === 'VIOLATED';

  return (
    <div
      className={`card animate-slide-up ${isViolated ? 'card-violated' : ''}`}
      id={`trade-card-${trade._id}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>
            {trade.crop_type}
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
            {trade.quantity_kg} kg · {amount} ALGO
          </p>
        </div>
        <StatusTimeline state={trade.state} compact />
      </div>

      {/* Addresses */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
        fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '1rem',
      }}>
        <div>
          <span style={{ opacity: 0.6 }}>Buyer:</span>{' '}
          <span style={{ fontFamily: 'monospace' }}>{trade.buyer_address?.slice(0, 8)}...</span>
        </div>
        <div>
          <span style={{ opacity: 0.6 }}>Farmer:</span>{' '}
          <span style={{ fontFamily: 'monospace' }}>{trade.farmer_address?.slice(0, 8)}...</span>
        </div>
      </div>

      {/* Deadline */}
      {trade.delivery_deadline && (
        <div style={{
          fontSize: '0.7rem', color: 'var(--color-text-muted)',
          marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem',
        }}>
          ⏰ {new Date(trade.delivery_deadline).toLocaleDateString()}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link to={`/trade/${trade._id}`} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
          View Details
        </Link>

        {/* Farmer: Accept a new contract */}
        {role === 'farmer' && trade.state === 'CREATED' && (
          <button
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
            onClick={() => onAction?.('accept', trade._id)}
            id={`accept-btn-${trade._id}`}
          >
            ✅ Accept Contract
          </button>
        )}

        {/* Buyer: Fund after farmer accepts */}
        {role === 'buyer' && trade.state === 'ACCEPTED' && (
          <button
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
            onClick={() => onAction?.('fund', trade._id)}
            id={`fund-btn-${trade._id}`}
          >
            💰 Fund Escrow
          </button>
        )}

        {/* Farmer: Mark delivered */}
        {role === 'farmer' && trade.state === 'FUNDED' && (
          <button
            className="btn btn-success"
            style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
            onClick={() => onAction?.('deliver', trade._id)}
            id={`deliver-btn-${trade._id}`}
          >
            📦 Mark Delivered
          </button>
        )}

        {/* Verifier: Confirm delivery */}
        {role === 'verifier' && trade.state === 'DELIVERED' && (
          <button
            className="btn btn-success"
            style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
            onClick={() => onAction?.('confirm', trade._id)}
            id={`confirm-btn-${trade._id}`}
          >
            ✅ Review & Verify
          </button>
        )}

        {/* Buyer: Withdraw from violated contract */}
        {role === 'buyer' && trade.state === 'VIOLATED' && (
          <button
            className="btn btn-danger"
            style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
            onClick={() => onAction?.('withdraw', trade._id)}
            id={`withdraw-btn-${trade._id}`}
          >
            💸 Withdraw Funds
          </button>
        )}
      </div>
    </div>
  );
}
