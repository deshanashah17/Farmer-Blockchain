import { Link, useLocation } from 'react-router-dom';
import WalletConnect from './WalletConnect';
import { ROLE_LABELS } from '../services/constants';

const NAV_LINKS = {
  buyer:    [{ to: '/buyer',    label: 'Dashboard' }],
  farmer:   [{ to: '/farmer',   label: 'Dashboard' }],
  verifier: [{ to: '/verifier', label: 'Dashboard' }],
  admin:    [{ to: '/admin',    label: 'Admin' }],
};

export default function AppShell({ children, address, role, onConnect, onDisconnect }) {
  const location = useLocation();
  const links = NAV_LINKS[role] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* ─── Navbar ─── */}
      <nav className="glass" style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 2rem',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem',
          }}>
            🌾
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>
            FarmerPay
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {address && links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              style={{
                color: location.pathname === l.to ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontWeight: location.pathname === l.to ? 600 : 400,
                fontSize: '0.9rem',
                transition: 'color 0.2s',
              }}
            >
              {l.label}
            </Link>
          ))}
          <WalletConnect
            address={address}
            role={role}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
          />
        </div>
      </nav>

      {/* ─── Main ─── */}
      <main style={{ flex: 1, padding: '2rem', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {children}
      </main>

      {/* ─── Footer ─── */}
      <footer style={{
        textAlign: 'center', padding: '1.5rem',
        color: 'var(--color-text-muted)', fontSize: '0.8rem',
        borderTop: '1px solid var(--color-border)',
      }}>
        <span>FarmerPay</span> · Blockchain-Powered Crop Payment Assurance
        <br />
        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Built on Algorand TestNet</span>
      </footer>
    </div>
  );
}
