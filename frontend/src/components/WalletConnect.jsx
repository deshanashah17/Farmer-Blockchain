import { useState } from 'react';
import { connectWallet, disconnectWallet } from '../services/wallet';
import { ROLE_LABELS, ROLE_COLORS } from '../services/constants';

export default function WalletConnect({ address, role, onConnect, onDisconnect }) {
  const [open, setOpen] = useState(false);

  const shortAddr = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  const handleConnect = async () => {
    const addr = await connectWallet();
    if (addr) onConnect(addr);
  };

  if (!address) {
    return (
      <button className="btn btn-primary" onClick={handleConnect} id="connect-wallet-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 3v4M8 3v4M2 11h20" />
        </svg>
        Connect Wallet
      </button>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn btn-secondary"
        onClick={() => setOpen(!open)}
        id="wallet-dropdown-btn"
        style={{ gap: '0.75rem' }}
      >
        <span
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: ROLE_COLORS[role] || '#10b981',
            display: 'inline-block',
          }}
        />
        <span>{shortAddr}</span>
        <span className="badge" style={{
          background: ROLE_COLORS[role] || '#10b981',
          color: '#fff',
          fontSize: '0.65rem',
        }}>
          {role?.toUpperCase()}
        </span>
      </button>

      {open && (
        <div
          className="glass animate-fade-in"
          style={{
            position: 'absolute', right: 0, top: '110%',
            minWidth: 220, borderRadius: 12, padding: '0.75rem',
            zIndex: 100,
          }}
        >
          <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            {address}
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0.5rem 0' }} />
          <button
            className="btn btn-danger"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => { disconnectWallet(); onDisconnect(); setOpen(false); }}
            id="disconnect-wallet-btn"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
