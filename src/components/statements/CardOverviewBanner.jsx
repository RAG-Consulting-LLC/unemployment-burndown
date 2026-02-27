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

export default function CardOverviewBanner({ creditCards, statementIndex, selectedCardId, onSelectCard, people = [] }) {
  const cards = creditCards.map(card => {
    const stmts = (statementIndex?.statements || []).filter(s => s.cardId === card.id)
    const latestStmt = stmts.sort((a, b) => b.closingDate?.localeCompare(a.closingDate))[0]
    const person = card.assignedTo ? (people.find(p => p.id === card.assignedTo) ?? null) : null
    return { ...card, statementCount: stmts.length, latestStmt, person }
  })

  return (
    <div className="space-y-3">
      {/* Card pills */}
      <div className="flex flex-wrap gap-2">
        {/* "All Cards" pill */}
        <button
          onClick={() => onSelectCard(null)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all"
          style={{
            borderColor: selectedCardId === null ? 'var(--accent-blue)' : 'var(--border-input)',
            background: selectedCardId === null ? 'color-mix(in srgb, var(--accent-blue) 12%, var(--bg-card))' : 'var(--bg-input)',
            color: selectedCardId === null ? 'var(--accent-blue)' : 'var(--text-secondary)',
          }}
        >
          <span className="text-base">💳</span>
          <span>All Cards</span>
        </button>

        {cards.map(card => {
          const isSelected = selectedCardId === card.id
          const utilPct = card.creditLimit > 0
            ? Math.round((card.balance / card.creditLimit) * 100)
            : null
          const personBg = card.person ? (COLOR_MAP[card.person.color] ?? '#6b7280') : null

          return (
            <button
              key={card.id}
              onClick={() => onSelectCard(card.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all"
              style={{
                borderColor: isSelected ? 'var(--accent-blue)' : 'var(--border-input)',
                background: isSelected ? 'color-mix(in srgb, var(--accent-blue) 12%, var(--bg-card))' : 'var(--bg-input)',
                color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)',
              }}
            >
              {card.person ? (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ background: personBg }}
                  title={card.person.name}
                >
                  {getInitials(card.person.name)}
                </div>
              ) : (
                <span className="text-base">💳</span>
              )}
              <div className="text-left">
                <div>{card.name}</div>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{formatCurrency(card.balance)}</span>
                  {utilPct !== null && (
                    <span style={{
                      color: utilPct >= 90 ? '#f87171' : utilPct >= 60 ? '#fb923c' : utilPct >= 30 ? '#facc15' : '#34d399'
                    }}>
                      {utilPct}%
                    </span>
                  )}
                  {card.statementCount > 0 && (
                    <span>{card.statementCount} stmt{card.statementCount !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Summary stats row */}
      {creditCards.length > 0 && (
        <div
          className="rounded-lg px-4 py-3 flex flex-wrap gap-x-5 gap-y-2 text-sm"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Total balance: </span>
            <span className="font-semibold" style={{ color: '#f87171' }}>
              {formatCurrency(creditCards.reduce((s, c) => s + (Number(c.balance) || 0), 0))}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Cards: </span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {creditCards.length}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Statements: </span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {(statementIndex?.statements || []).length}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
