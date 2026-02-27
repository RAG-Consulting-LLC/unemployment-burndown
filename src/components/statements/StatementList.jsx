import { formatCurrency } from '../../utils/formatters'

const COLOR_MAP = {
  blue:    '#3b82f6',
  purple:  '#a855f7',
  emerald: '#10b981',
  amber:   '#fbbf24',
  rose:    '#f43f5e',
  cyan:    '#06b6d4',
}

function getInitials(name) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function PersonAvatar({ person }) {
  if (!person) return <span className="text-lg">📄</span>
  const bg = COLOR_MAP[person.color] ?? '#6b7280'
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
      style={{ background: bg }}
      title={person.name}
    >
      {getInitials(person.name)}
    </div>
  )
}

export default function StatementList({ statementIndex, creditCards, people = [], selectedCardId, onLoadStatement }) {
  const stmts = (statementIndex?.statements || [])
    .filter(s => selectedCardId === null || s.cardId === selectedCardId)
    .sort((a, b) => (b.closingDate || '').localeCompare(a.closingDate || ''))

  const getCard = (cardId) => creditCards.find(c => c.id === cardId)
  const getCardName = (cardId) => getCard(cardId)?.name || 'Unknown Card'
  const getPerson = (cardId) => {
    const card = getCard(cardId)
    if (!card?.assignedTo) return null
    return people.find(p => p.id === card.assignedTo) ?? null
  }

  if (stmts.length === 0) {
    return (
      <div className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
        No statements found. Forward your credit card statement emails to start importing.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {stmts.map(stmt => (
        <button
          key={stmt.id}
          onClick={() => onLoadStatement(stmt.id)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all"
          style={{
            background: 'var(--bg-input)',
            borderColor: 'var(--border-input)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--accent-blue)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border-input)'
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <PersonAvatar person={getPerson(stmt.cardId)} />
            <div className="text-left min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {getCardName(stmt.cardId)}
                {stmt.issuer && (
                  <span className="ml-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    ({stmt.issuer})
                  </span>
                )}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {stmt.closingDate
                  ? new Date(stmt.closingDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'No date'}
                {stmt.transactionCount != null && (
                  <span> &middot; {stmt.transactionCount} transactions</span>
                )}
              </p>
            </div>
          </div>

          <div className="text-right flex-shrink-0 ml-3">
            <p className="text-sm font-semibold tabular-nums" style={{ color: '#f87171' }}>
              {formatCurrency(stmt.statementBalance || 0)}
            </p>
            {stmt.parsedAt && (
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                Imported {new Date(stmt.parsedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
