import { STATUS_FILTERS, STATE_COLORS } from '../services/constants';

const TAB_CONFIGS = {
  buyer: [
    { key: 'all', label: '📋 All', icon: '' },
    { key: 'active', label: '⚡ Active', icon: '' },
    { key: 'completed', label: '✅ Completed', icon: '' },
    { key: 'rejected', label: '❌ Rejected', icon: '' },
  ],
  farmer: [
    { key: 'all', label: '📋 All', icon: '' },
    { key: 'active', label: '⚡ Active', icon: '' },
    { key: 'completed', label: '✅ Completed', icon: '' },
    { key: 'rejected', label: '❌ Rejected', icon: '' },
  ],
  verifier: [
    { key: 'all', label: '📋 All', icon: '' },
    { key: 'active', label: '🔍 Pending', icon: '' },
    { key: 'completed', label: '✅ Approved', icon: '' },
    { key: 'rejected', label: '❌ Violated', icon: '' },
  ],
};

export default function ContractHistory({ trades, activeTab, onTabChange, role = 'buyer' }) {
  const tabs = TAB_CONFIGS[role] || TAB_CONFIGS.buyer;

  const filteredTrades = trades.filter((t) => {
    const allowed = STATUS_FILTERS[activeTab];
    return allowed ? allowed.includes(t.state) : true;
  });

  const counts = {
    all: trades.length,
    active: trades.filter(t => STATUS_FILTERS.active.includes(t.state)).length,
    completed: trades.filter(t => STATUS_FILTERS.completed.includes(t.state)).length,
    rejected: trades.filter(t => STATUS_FILTERS.rejected.includes(t.state)).length,
  };

  return (
    <div>
      {/* Tab Bar */}
      <div className="tab-bar" id="contract-history-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'tab-btn-active' : ''}`}
            onClick={() => onTabChange(tab.key)}
            id={`tab-${tab.key}`}
          >
            {tab.label}
            <span className="tab-count">{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filteredTrades.length === 0 && (
        <div className="card" style={{
          textAlign: 'center', padding: '3rem',
          color: 'var(--color-text-muted)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
          No contracts in this category
        </div>
      )}

      {/* Return filtered trades for parent to render */}
      {filteredTrades.length > 0 && (
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Showing {filteredTrades.length} contract{filteredTrades.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

// Helper to filter trades — export for use in dashboards
export function filterTrades(trades, tab) {
  const allowed = STATUS_FILTERS[tab];
  return allowed ? trades.filter(t => allowed.includes(t.state)) : trades;
}
