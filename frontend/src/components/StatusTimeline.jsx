import { STEPS, ERROR_STATES, STATE_COLORS } from '../services/constants';

export default function StatusTimeline({ state, compact = false }) {
  const idx = STEPS.indexOf(state);
  const isError = ERROR_STATES.includes(state);

  if (compact) {
    const color = STATE_COLORS[state] || STATE_COLORS.CREATED;
    return (
      <span className="badge" style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
        {state}
      </span>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Error banner */}
      {isError && (
        <div style={{
          background: STATE_COLORS[state]?.bg || '#451a03',
          border: `1px solid ${STATE_COLORS[state]?.border || '#f59e0b'}`,
          borderRadius: 12, padding: '0.75rem 1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          marginBottom: '1rem',
          color: STATE_COLORS[state]?.text || '#fb923c',
          fontWeight: 600, fontSize: '0.85rem',
        }}>
          {state === 'VIOLATED' && '❌'}
          {state === 'REFUNDED' && '💸'}
          {state === 'DISPUTED' && '⚠'}
          {state === 'EXPIRED' && '⏰'}
          {state === 'CANCELLED' && '🚫'}
          {' '}Trade is {state}
        </div>
      )}

      {/* Timeline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {STEPS.map((step, i) => {
          const done = (idx >= 0 && i < idx) || state === 'RELEASED';
          const current = i === idx && !isError;

          return (
            <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              {/* Circle */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 700,
                background: done
                  ? 'var(--color-primary)'
                  : current
                    ? 'transparent'
                    : 'var(--color-bg)',
                border: current
                  ? '2px solid var(--color-primary)'
                  : done
                    ? '2px solid var(--color-primary)'
                    : '2px solid var(--color-border)',
                color: done ? '#fff' : current ? 'var(--color-primary)' : 'var(--color-text-muted)',
                transition: 'all 0.3s ease',
                ...(current ? { boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)' } : {}),
              }}>
                {done ? '✓' : i + 1}
              </div>

              {/* Label */}
              <span style={{
                marginLeft: 6, fontSize: '0.65rem', fontWeight: current ? 600 : 400,
                color: done || current ? 'var(--color-text)' : 'var(--color-text-muted)',
                whiteSpace: 'nowrap',
              }}>
                {step}
              </span>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: 2, marginLeft: 6, marginRight: 6,
                  background: done ? 'var(--color-primary)' : 'var(--color-border)',
                  transition: 'background 0.3s ease',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
