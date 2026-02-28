export default function StatementImportStatus({ statementIndex, loading, error, onRefresh }) {
  const stmtCount = statementIndex?.statements?.length || 0
  const lastUpdated = statementIndex?.lastUpdated

  return (
    <div
      className="rounded-xl border px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2"
      style={{ background: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{
            background: error ? '#f87171' : loading ? '#facc15' : '#34d399',
          }}
        />
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {error ? 'Connection error' : loading ? 'Loading...' : 'Connected'}
        </span>
      </div>

      {/* Stats */}
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {stmtCount} statement{stmtCount !== 1 ? 's' : ''} imported
      </span>

      {lastUpdated && (
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
          Last update: {new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </span>
      )}

      {/* Refresh button */}
      <button
        onClick={onRefresh}
        className="ml-auto text-xs px-2.5 py-1 rounded-lg border transition-colors"
        style={{
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-muted)',
          background: 'var(--bg-page)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--accent-blue)'
          e.currentTarget.style.color = 'var(--accent-blue)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border-subtle)'
          e.currentTarget.style.color = 'var(--text-muted)'
        }}
      >
        Refresh
      </button>

      {/* Setup hint */}
      {stmtCount === 0 && !loading && (
        <div className="w-full mt-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Forward your credit card statement emails to the configured SES address.
            Statements are automatically parsed and will appear here within 60 seconds.
          </p>
        </div>
      )}
    </div>
  )
}
