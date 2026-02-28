const COLOR_HEX = {
  blue:    '#3b82f6',
  purple:  '#a855f7',
  emerald: '#10b981',
  amber:   '#fbbf24',
  rose:    '#f43f5e',
  cyan:    '#06b6d4',
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function PersonFilter({ people, value, onChange }) {
  if (!people || people.length === 0) return null

  const active = value // null = "All"

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] font-semibold uppercase tracking-widest mr-1" style={{ color: 'var(--text-muted)' }}>
        Filter
      </span>

      {/* "All" pill */}
      <button
        onClick={() => onChange(null)}
        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors"
        style={{
          borderColor: active === null ? 'var(--accent-blue)' : 'var(--border-subtle)',
          background: active === null ? 'color-mix(in srgb, var(--accent-blue) 15%, transparent)' : 'var(--bg-input)',
          color: active === null ? 'var(--accent-blue)' : 'var(--text-muted)',
          fontWeight: active === null ? 600 : 400,
        }}
      >
        All
      </button>

      {/* Person pills */}
      {people.map(person => {
        const isActive = active === person.id
        const hex = COLOR_HEX[person.color] ?? '#6b7280'

        return (
          <button
            key={person.id}
            onClick={() => onChange(isActive ? null : person.id)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors"
            title={`Filter by ${person.name}`}
            style={{
              borderColor: isActive ? hex : 'var(--border-subtle)',
              background: isActive ? `color-mix(in srgb, ${hex} 15%, transparent)` : 'var(--bg-input)',
              color: isActive ? hex : 'var(--text-secondary)',
              fontWeight: isActive ? 600 : 400,
            }}
          >
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-white flex-shrink-0"
              style={{ background: hex, fontSize: '8px', fontWeight: 700, lineHeight: 1 }}
            >
              {getInitials(person.name)}
            </span>
            <span className="hidden sm:inline">{person.name}</span>
          </button>
        )
      })}

      {/* Unassigned pill */}
      <button
        onClick={() => onChange('unassigned')}
        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors"
        title="Show unassigned items"
        style={{
          borderColor: active === 'unassigned' ? 'var(--text-muted)' : 'var(--border-subtle)',
          background: active === 'unassigned' ? 'color-mix(in srgb, var(--text-muted) 15%, transparent)' : 'var(--bg-input)',
          color: active === 'unassigned' ? 'var(--text-primary)' : 'var(--text-muted)',
          fontWeight: active === 'unassigned' ? 600 : 400,
        }}
      >
        <span
          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border border-dashed"
          style={{ borderColor: 'var(--text-muted)', fontSize: '10px', color: 'var(--text-muted)' }}
        >
          ?
        </span>
        <span className="hidden sm:inline">Unassigned</span>
      </button>
    </div>
  )
}
