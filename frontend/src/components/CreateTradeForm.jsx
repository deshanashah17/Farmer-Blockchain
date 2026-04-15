import { useState } from 'react';
import { createTrade } from '../services/api';
import { DEMO_ADDRESSES } from '../services/mockData';

export default function CreateTradeForm({ onCreated }) {
  // Pre-fill farmer & verifier with demo addresses so trades show up across all dashboards
  const [form, setForm] = useState({
    farmer_address: DEMO_ADDRESSES.farmer,
    verifier_address: DEMO_ADDRESSES.verifier,
    crop_type: '',
    quantity_kg: '',
    price_per_kg: '',
    delivery_deadline: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalAlgo = form.quantity_kg && form.price_per_kg
    ? (parseFloat(form.quantity_kg) * parseFloat(form.price_per_kg)).toFixed(2)
    : '0.00';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        quantity_kg: parseFloat(form.quantity_kg),
        price_per_kg: parseFloat(form.price_per_kg),
        delivery_deadline: new Date(form.delivery_deadline).toISOString(),
      };
      await createTrade(payload);
      setForm({
        farmer_address: DEMO_ADDRESSES.farmer,
        verifier_address: DEMO_ADDRESSES.verifier,
        crop_type: '',
        quantity_kg: '', price_per_kg: '', delivery_deadline: '',
      });
      onCreated?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create trade');
    } finally {
      setLoading(false);
    }
  };

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <form onSubmit={handleSubmit} className="card animate-slide-up" id="create-trade-form" style={{ maxWidth: 560 }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>
        📝 Create New Trade
      </h3>

      {error && (
        <div style={{
          background: 'var(--color-danger)', color: '#fff',
          borderRadius: 8, padding: '0.5rem 1rem', marginBottom: '1rem',
          fontSize: '0.85rem',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label className="input-label">Crop Type</label>
          <input className="input" value={form.crop_type} onChange={update('crop_type')}
            placeholder="e.g. Rice, Wheat, Corn" required id="input-crop-type" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="input-label">Quantity (kg)</label>
            <input className="input" type="number" step="0.1" value={form.quantity_kg}
              onChange={update('quantity_kg')} placeholder="500" required id="input-quantity" />
          </div>
          <div>
            <label className="input-label">Price per kg (ALGO)</label>
            <input className="input" type="number" step="0.01" value={form.price_per_kg}
              onChange={update('price_per_kg')} placeholder="2.00" required id="input-price" />
          </div>
        </div>

        <div style={{
          background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 10, padding: '0.75rem 1rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Total Escrow</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            {totalAlgo} ALGO
          </span>
        </div>

        <div>
          <label className="input-label">Farmer Wallet Address</label>
          <input className="input" value={form.farmer_address} onChange={update('farmer_address')}
            placeholder="ALGO..." required id="input-farmer-addr" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
        </div>

        <div>
          <label className="input-label">Verifier Wallet Address</label>
          <input className="input" value={form.verifier_address} onChange={update('verifier_address')}
            placeholder="ALGO..." required id="input-verifier-addr" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
        </div>

        <div>
          <label className="input-label">Delivery Deadline</label>
          <input className="input" type="datetime-local" value={form.delivery_deadline}
            onChange={update('delivery_deadline')} required id="input-deadline" />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}
          style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '0.95rem' }}
          id="submit-trade-btn"
        >
          {loading ? '⏳ Creating...' : '🚀 Create Trade'}
        </button>
      </div>
    </form>
  );
}
