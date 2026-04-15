import { useState, useEffect } from 'react';
import { getVerifiers, addVerifier, removeVerifier } from '../services/api';

export default function AdminDashboard() {
  const [verifiers, setVerifiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ wallet_address: '', name: '', location: '' });
  const [toast, setToast] = useState(null);

  const fetchVerifiers = async () => {
    try {
      const res = await getVerifiers();
      setVerifiers(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch verifiers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVerifiers(); }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await addVerifier(form);
      setForm({ wallet_address: '', name: '', location: '' });
      showToast('Verifier added!');
      fetchVerifiers();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to add verifier', 'error');
    }
  };

  const handleRemove = async (address) => {
    try {
      await removeVerifier(address);
      showToast('Verifier removed');
      fetchVerifiers();
    } catch (err) {
      showToast('Failed to remove', 'error');
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        🔧 Admin Dashboard
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        Manage the verifier whitelist.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Add Form */}
        <form onSubmit={handleAdd} className="card" id="add-verifier-form">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Add Verifier</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div>
              <label className="input-label">Wallet Address</label>
              <input className="input" value={form.wallet_address}
                onChange={e => setForm({ ...form, wallet_address: e.target.value })}
                placeholder="ALGO..." required style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
            </div>
            <div>
              <label className="input-label">Name</label>
              <input className="input" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Inspector name" />
            </div>
            <div>
              <label className="input-label">Location</label>
              <input className="input" value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="Warehouse location" />
            </div>
            <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
              ➕ Add Verifier
            </button>
          </div>
        </form>

        {/* Verifier List */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Whitelisted Verifiers ({verifiers.length})
          </h3>
          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
              Loading...
            </div>
          ) : verifiers.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
              No verifiers added yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {verifiers.map((v) => (
                <div key={v.wallet_address} className="card" style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '1rem',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{v.name || 'Unnamed'}</div>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>
                      {v.wallet_address?.slice(0, 12)}...{v.wallet_address?.slice(-6)}
                    </div>
                    {v.location && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>📍 {v.location}</div>
                    )}
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleRemove(v.wallet_address)}
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
                  >
                    ✕ Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
