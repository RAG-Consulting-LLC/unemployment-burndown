import { useState, useMemo } from 'react'
import { formatCurrency } from '../../utils/formatters'

const DATE_RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
  { label: 'All', days: Infinity },
]

export default function TransactionsPanel({ transactions = [], onChange, expenses = [], plaidAccounts = [] }) {
  const [dateRange, setDateRange] = useState(30)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Build account name lookup
  const accountNames = useMemo(() => {
    const map = {}
    for (const inst of plaidAccounts) {
      for (const acc of inst.accounts) {
        map[acc.plaidAccountId] = `${acc.name} (${inst.institutionName})`
      }
    }
    return map
  }, [plaidAccounts])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set()
    for (const t of transactions) {
      if (t.category?.[0]) cats.add(t.category[0])
    }
    return [...cats].sort()
  }, [transactions])

  // Filter transactions
  const filtered = useMemo(() => {
    const cutoff = dateRange === Infinity
      ? null
      : new Date(Date.now() - dateRange * 86400000).toISOString().slice(0, 10)

    return transactions.filter(t => {
      if (cutoff && t.date < cutoff) return false
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter && t.category?.[0] !== categoryFilter) return false
      return true
    })
  }, [transactions, dateRange, search, categoryFilter])

  // Summary
  const summary = useMemo(() => {
    let outflows = 0
    let inflows = 0
    for (const t of filtered) {
      if (t.excluded) continue
      if (t.amount > 0) outflows += t.amount // Plaid: positive = debit
      else inflows += Math.abs(t.amount)
    }
    return { outflows, inflows, net: outflows - inflows }
  }, [filtered])

  function toggleExclude(txnId) {
    onChange(transactions.map(t =>
      t.id === txnId ? { ...t, excluded: !t.excluded } : t
    ))
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-6">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No transactions imported yet</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Link a bank account and click the import button to pull transactions
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Date range pills */}
        <div className="flex items-center rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
          {DATE_RANGES.map(r => (
            <button
              key={r.days}
              onClick={() => setDateRange(r.days)}
              className="text-xs px-2.5 py-1 transition-colors"
              style={{
                background: dateRange === r.days ? 'var(--accent-blue)' : 'var(--bg-input)',
                color: dateRange === r.days ? '#fff' : 'var(--text-muted)',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search merchant..."
          className="text-xs rounded-lg border px-2.5 py-1.5"
          style={{
            background: 'var(--bg-input)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
            width: 160,
          }}
        />

        {/* Category filter */}
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="text-xs rounded-lg border px-2 py-1.5"
            style={{
              background: 'var(--bg-input)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <option value="">All categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border p-2.5" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)' }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Outflows</p>
          <p className="text-sm font-bold" style={{ color: 'var(--accent-red, #ef4444)' }}>
            -{formatCurrency(summary.outflows)}
          </p>
        </div>
        <div className="rounded-lg border p-2.5" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)' }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Inflows</p>
          <p className="text-sm font-bold" style={{ color: 'var(--accent-emerald)' }}>
            +{formatCurrency(summary.inflows)}
          </p>
        </div>
        <div className="rounded-lg border p-2.5" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)' }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>Net</p>
          <p className="text-sm font-bold" style={{ color: summary.net > 0 ? 'var(--accent-red, #ef4444)' : 'var(--accent-emerald)' }}>
            {summary.net > 0 ? '-' : '+'}{formatCurrency(Math.abs(summary.net))}
          </p>
        </div>
      </div>

      {/* Transaction list */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
        {/* Header */}
        <div
          className="grid gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            gridTemplateColumns: '80px 1fr 100px 90px 40px',
            background: 'var(--bg-input)',
            color: 'var(--text-muted)',
          }}
        >
          <span>Date</span>
          <span>Merchant</span>
          <span>Category</span>
          <span className="text-right">Amount</span>
          <span />
        </div>

        {/* Rows */}
        <div className="max-h-96 overflow-y-auto">
          {filtered.map(txn => {
            const isDebit = txn.amount > 0
            return (
              <div
                key={txn.id}
                className="grid gap-2 px-3 py-1.5 border-t items-center"
                style={{
                  gridTemplateColumns: '80px 1fr 100px 90px 40px',
                  borderColor: 'var(--border-subtle)',
                  opacity: txn.excluded ? 0.4 : 1,
                }}
              >
                <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {txn.date}
                </span>
                <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }} title={txn.name}>
                  {txn.name}
                  {txn.pending && (
                    <span className="ml-1 text-[10px] italic" style={{ color: 'var(--text-muted)' }}>pending</span>
                  )}
                </span>
                <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }} title={txn.category?.join(' > ')}>
                  {txn.category?.[0] || '—'}
                </span>
                <span
                  className="text-xs font-semibold tabular-nums text-right"
                  style={{ color: isDebit ? 'var(--text-primary)' : 'var(--accent-emerald)' }}
                >
                  {isDebit ? '-' : '+'}{formatCurrency(Math.abs(txn.amount))}
                </span>
                <button
                  onClick={() => toggleExclude(txn.id)}
                  className="text-xs px-1 py-0.5 rounded transition-colors"
                  style={{ color: txn.excluded ? 'var(--accent-emerald)' : 'var(--text-muted)' }}
                  title={txn.excluded ? 'Include in totals' : 'Exclude from totals'}
                >
                  {txn.excluded ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              No transactions match your filters
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
