import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLES, ROLE_LABELS, ROLE_COLORS } from '../services/constants';
import { DEMO_ADDRESSES } from '../services/mockData';
import { connectWallet } from '../services/wallet';
import { verifyWallet } from '../services/api';

export default function LandingPage({ address, onConnect }) {
  const navigate = useNavigate();
  const [pendingRole, setPendingRole] = useState(null);
  const pendingRoleRef = useRef(null);

  // Listen for Enter key — if Pera QR is showing, bypass and go to dashboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && pendingRoleRef.current) {
        e.preventDefault();
        const role = pendingRoleRef.current;
        pendingRoleRef.current = null;
        setPendingRole(null);
        proceedWithRole(role, DEMO_ADDRESSES[role]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const proceedWithRole = async (role, addr) => {
    try {
      const res = await verifyWallet(addr, role);
      const { access_token } = res.data.data;
      localStorage.setItem('fp_token', access_token);
      localStorage.setItem('fp_role', role);
      onConnect(DEMO_ADDRESSES[role], role);
      navigate(`/${role}`);
    } catch (err) {
      console.error('Auth error:', err);
    }
  };

  const handleRole = async (role) => {
    let addr = address;
    if (!addr) {
      // Track the pending role so Enter key can bypass the wallet modal
      setPendingRole(role);
      pendingRoleRef.current = role;
      addr = await connectWallet();
      pendingRoleRef.current = null;
      setPendingRole(null);
      // If user cancels, still proceed with demo address
      if (!addr) addr = DEMO_ADDRESSES[role];
    }
    await proceedWithRole(role, addr);
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {/* Hero */}
      <div className="animate-slide-up" style={{ textAlign: 'center', maxWidth: 700, marginBottom: '3rem' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: 'var(--gradient-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.5rem', margin: '0 auto 1.5rem',
          boxShadow: '0 8px 40px rgba(16, 185, 129, 0.2)',
        }}>
          🌾
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1rem' }}>
          <span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Farmer Payment
          </span>
          <br />Assurance System
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', lineHeight: 1.6, maxWidth: 500, margin: '0 auto' }}>
          Blockchain-powered escrow guarantees {' '}
          <strong style={{ color: 'var(--color-primary)' }}>instant, trustless crop payments</strong>{' '}
          the moment delivery is verified on-chain.
        </p>
      </div>

      {/* Role Selection */}
      <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          {address ? 'Select your role to continue' : 'Connect your wallet and choose a role'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', maxWidth: 420 }}>
          {ROLES.map((role) => (
            <button
              key={role}
              className="card"
              onClick={() => handleRole(role)}
              id={`role-btn-${role}`}
              style={{
                cursor: 'pointer', textAlign: 'center', padding: '1.5rem',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = ROLE_COLORS[role]}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                {ROLE_LABELS[role]?.split(' ')[0]}
              </div>
              <div style={{ fontWeight: 600, textTransform: 'capitalize', color: ROLE_COLORS[role] }}>
                {role}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="animate-slide-up" style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem',
        marginTop: '4rem', maxWidth: 700, width: '100%',
        animationDelay: '0.2s',
      }}>
        {[
          { icon: '🔒', title: 'Escrow Locked', desc: 'ALGO held in smart contract until delivery confirmed' },
          { icon: '⚡', title: 'Instant Release', desc: 'Payment auto-releases the moment verifier signs' },
          { icon: '🛡️', title: 'Dispute Protected', desc: '3-validator voting resolves any disagreements' },
        ].map((f) => (
          <div key={f.title} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{f.icon}</div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>{f.title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
