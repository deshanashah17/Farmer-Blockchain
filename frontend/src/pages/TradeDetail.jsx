import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  getTrade, acceptContract, buildFundTxn,
  buildDisputeTxn, buildRefundTxn, submitSignedTxn,
  verifyContract, withdrawFunds, voteDispute, markDelivered,
} from '../services/api';
import StatusTimeline from '../components/StatusTimeline';
import DisputePanel from '../components/DisputePanel';

const VERIFY_CHECKLIST = [
  { key: 'quality', label: '✅ Quality meets the agreed standard' },
  { key: 'quantity', label: '📦 Quantity matches the contract' },
  { key: 'ontime', label: '⏰ Delivery was on time' },
];

export default function TradeDetail({ address, role }) {
  const { id } = useParams();
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [checks, setChecks] = useState({});
  const [processing, setProcessing] = useState(false);

  const fetchTrade = async () => {
    try {
      const res = await getTrade(id);
      setTrade(res.data.data);
    } catch (err) {
      console.error('Failed to fetch trade:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrade(); }, [id]);
  useEffect(() => {
    const interval = setInterval(fetchTrade, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAccept = async () => {
    try {
      setProcessing(true);
      await acceptContract(id);
      showToast('Contract accepted! ✅');
      fetchTrade();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Accept failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleFund = async () => {
    try {
      setProcessing(true);
      await buildFundTxn(id);
      // Mock mode: skip wallet signing
      await submitSignedTxn(id, 'MOCK_SIGNED');
      showToast('Escrow funded! 🎉');
      fetchTrade();
    } catch (err) {
      showToast(err.response?.data?.detail || err.message || 'Fund failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeliver = async () => {
    try {
      setProcessing(true);
      await markDelivered(id);
      showToast('Delivery marked! 📦');
      fetchTrade();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Deliver failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyApprove = async () => {
    try {
      setProcessing(true);
      await verifyContract(id, true);
      // Mock mode: skip wallet signing
      showToast('Contract approved! Payment released 🎉');
      fetchTrade();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Approve failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyViolate = async () => {
    if (!window.confirm('Mark this contract as VIOLATED? The buyer will be able to withdraw funds.')) return;
    try {
      setProcessing(true);
      await verifyContract(id, false);
      showToast('Contract marked as violated ❌');
      fetchTrade();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setProcessing(true);
      await withdrawFunds(id);
      // Mock mode: skip wallet signing
      showToast('Funds withdrawn! 💸');
      fetchTrade();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Withdraw failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDispute = async () => {
    try {
      await buildDisputeTxn(id);
      // Mock mode: skip wallet signing
      showToast('Dispute raised');
      fetchTrade();
    } catch (err) {
      showToast(err.message || 'Dispute failed', 'error');
    }
  };

  const handleRefund = async () => {
    try {
      await buildRefundTxn(id);
      // Mock mode: skip wallet signing
      showToast('Refund claimed');
      fetchTrade();
    } catch (err) {
      showToast(err.message || 'Refund failed', 'error');
    }
  };

  const handleVote = async (tradeId, forFarmer) => {
    try {
      await voteDispute(tradeId, forFarmer);
      showToast(`Voted for ${forFarmer ? 'farmer' : 'buyer'}`);
      fetchTrade();
    } catch (err) {
      showToast(err.message || 'Vote failed', 'error');
    }
  };

  const toggleCheck = (key) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allChecked = VERIFY_CHECKLIST.every(item => checks[item.key]);

  if (loading) {
    return <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Loading trade details...</div>;
  }

  if (!trade) {
    return <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-danger)' }}>Trade not found</div>;
  }

  const amount = (trade.amount_micro_algo / 1_000_000).toFixed(2);
  const isBuyer = trade.buyer_address === address;
  const isFarmer = trade.farmer_address === address;
  const isVerifier = trade.verifier_address === address;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        {trade.crop_type} Contract
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontFamily: 'monospace' }}>
        ID: {trade._id}
      </p>

      {/* Timeline */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <StatusTimeline state={trade.state} />
      </div>

      {/* Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Escrow Amount</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>{amount} ALGO</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Crop Details</div>
          <div style={{ fontWeight: 600 }}>{trade.crop_type} · {trade.quantity_kg} kg</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{trade.price_per_kg} ALGO/kg</div>
        </div>
      </div>

      {/* Addresses */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Parties</h3>
        <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.8rem' }}>
          {[
            { label: '🛒 Buyer', addr: trade.buyer_address, you: isBuyer },
            { label: '🌾 Farmer', addr: trade.farmer_address, you: isFarmer },
            { label: '✅ Verifier', addr: trade.verifier_address, you: isVerifier },
          ].map(p => (
            <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>{p.label}</span>
              <span style={{ fontFamily: 'monospace' }}>
                {p.addr?.slice(0, 10)}...{p.addr?.slice(-6)}
                {p.you && <span className="badge" style={{ marginLeft: 6, background: 'var(--color-primary)', color: '#fff', fontSize: '0.6rem' }}>YOU</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* IPFS Proof */}
      {trade.ipfs_cid && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>📸 Delivery Proof</h3>
          <a href={`https://gateway.pinata.cloud/ipfs/${trade.ipfs_cid}`} target="_blank" rel="noreferrer"
            style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>
            ipfs://{trade.ipfs_cid}
          </a>
        </div>
      )}

      {/* Verification Result */}
      {trade.verification_result && (
        <div className={`card ${trade.verification_result === 'violated' ? 'card-violated' : ''}`} style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {trade.verification_result === 'approved' ? '✅ Verification: Approved' : '❌ Verification: Violated'}
          </h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Verified by: <span style={{ fontFamily: 'monospace' }}>{trade.verified_by?.slice(0, 10)}...{trade.verified_by?.slice(-6)}</span>
          </div>
          {trade.verified_at && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              {new Date(trade.verified_at).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Verifier Checkbox Governance Panel */}
      {isVerifier && trade.state === 'DELIVERED' && (
        <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'var(--color-primary)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📝 Delivery Verification Checklist
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {VERIFY_CHECKLIST.map(item => (
              <div
                key={item.key}
                className={`checkbox-row ${checks[item.key] ? 'checked' : ''}`}
                onClick={() => toggleCheck(item.key)}
                id={`detail-check-${item.key}`}
              >
                <div className="checkbox-toggle">
                  {checks[item.key] ? '✓' : ''}
                </div>
                <span className="checkbox-label">{item.label}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-success"
              onClick={handleVerifyApprove}
              disabled={!allChecked || processing}
              id="detail-approve-btn"
              style={{
                flex: 1, justifyContent: 'center',
                opacity: allChecked ? 1 : 0.4,
                cursor: allChecked ? 'pointer' : 'not-allowed',
              }}
            >
              {processing ? '⏳ Processing...' : '✅ Approve & Release Payment'}
            </button>
            <button
              className="btn btn-danger"
              onClick={handleVerifyViolate}
              disabled={processing}
              id="detail-violate-btn"
              style={{ justifyContent: 'center' }}
            >
              ❌ Mark Violated
            </button>
          </div>

          {!allChecked && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              ⚠ Check all items above to enable the Approve button
            </div>
          )}
        </div>
      )}

      {/* Dispute Panel */}
      <DisputePanel trade={trade} role={role} onVote={handleVote} />

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
        {/* Farmer: Accept contract */}
        {isFarmer && trade.state === 'CREATED' && (
          <button className="btn btn-primary" onClick={handleAccept} disabled={processing} id="detail-accept-btn">
            ✅ Accept Contract
          </button>
        )}
        {/* Buyer: Fund after acceptance */}
        {isBuyer && trade.state === 'ACCEPTED' && (
          <button className="btn btn-primary" onClick={handleFund} disabled={processing} id="detail-fund-btn">
            💰 Fund Escrow
          </button>
        )}
        {/* Farmer: Mark delivered */}
        {isFarmer && trade.state === 'FUNDED' && (
          <button className="btn btn-success" onClick={handleDeliver} disabled={processing} id="detail-deliver-btn">
            📦 Mark Delivered
          </button>
        )}
        {/* Buyer: Withdraw from violated */}
        {isBuyer && trade.state === 'VIOLATED' && (
          <button className="btn btn-danger" onClick={handleWithdraw} disabled={processing} id="detail-withdraw-btn">
            💸 Withdraw Funds
          </button>
        )}
        {/* Buyer: Raise dispute */}
        {isBuyer && ['FUNDED', 'DELIVERED'].includes(trade.state) && (
          <button className="btn btn-danger" onClick={handleDispute} id="detail-dispute-btn">
            ⚠️ Raise Dispute
          </button>
        )}
        {/* Buyer: Claim refund (expired) */}
        {isBuyer && trade.state === 'FUNDED' && (
          <button className="btn btn-secondary" onClick={handleRefund} id="detail-refund-btn">
            🔄 Claim Refund (if expired)
          </button>
        )}
      </div>

      {/* Deadline */}
      {trade.delivery_deadline && (
        <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          ⏰ Deadline: {new Date(trade.delivery_deadline).toLocaleString()}
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
