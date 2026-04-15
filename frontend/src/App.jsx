import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import LandingPage from './pages/LandingPage';
import BuyerDashboard from './pages/BuyerDashboard';
import FarmerDashboard from './pages/FarmerDashboard';
import VerifierDashboard from './pages/VerifierDashboard';
import AdminDashboard from './pages/AdminDashboard';
import TradeDetail from './pages/TradeDetail';
import './index.css';

export default function App() {
  const [address, setAddress] = useState(localStorage.getItem('fp_address') || '');
  const [role, setRole] = useState(localStorage.getItem('fp_role') || '');

  // No wallet reconnect needed — fully mock mode

  const handleConnect = (addr, selectedRole) => {
    setAddress(addr);
    localStorage.setItem('fp_address', addr);
    if (selectedRole) {
      setRole(selectedRole);
      localStorage.setItem('fp_role', selectedRole);
    }
  };

  const handleDisconnect = () => {
    setAddress('');
    setRole('');
    localStorage.removeItem('fp_address');
    localStorage.removeItem('fp_role');
    localStorage.removeItem('fp_token');
  };

  return (
    <BrowserRouter>
      <AppShell
        address={address}
        role={role}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      >
        <Routes>
          <Route path="/" element={<LandingPage address={address} onConnect={handleConnect} />} />
          <Route path="/buyer" element={address ? <BuyerDashboard address={address} /> : <Navigate to="/" />} />
          <Route path="/farmer" element={address ? <FarmerDashboard address={address} /> : <Navigate to="/" />} />
          <Route path="/verifier" element={address ? <VerifierDashboard address={address} /> : <Navigate to="/" />} />
          <Route path="/admin" element={address ? <AdminDashboard /> : <Navigate to="/" />} />
          <Route path="/trade/:id" element={<TradeDetail address={address} role={role} />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
