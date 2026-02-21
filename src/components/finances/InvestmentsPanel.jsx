import { formatCurrency } from '../../utils/formatters'
import { useDragReorder } from '../../hooks/useDragReorder'
import DragHandle from '../layout/DragHandle'

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
  )
}

export default function InvestmentsPanel({ investments, onChange }) {
  const { dragHandleProps, getItemProps, draggingId, overedId } = useDragReorder(investments, onChange)

  function update(id, field, val) {
    onChange(investments.map(inv => inv.id === id ? { ...inv, [field]: val } : inv))
  }

  function remove(id) {
    onChange(investments.filter(inv => inv.id !== id))
  }

  function add() {
    onChange([
      ...investments,
      { id: Date.now(), name: 'New Investment', description: '', monthlyAmount: 0, active: true },
    ])
  }

  const activeTotal = investments
    .filter(inv => inv.active)
    .reduce((sum, inv) => sum + (Number(inv.monthlyAmount) || 0), 0)

  const pausedTotal = investments
    .filter(inv => !inv.active)
    .reduce((sum, inv) => sum + (Number(inv.monthlyAmount) || 0), 0)

  return (
    <div className="space-y-3">
      {investments.length === 0 ? (
        <p className="text-sm text-gray-600 text-center py-4">
          No investments yet. Add things like 401k contributions, brokerage deposits, crypto DCA, or Roth IRA.
        </p>
      ) : (
        <div className="space-y-3">
          {investments.map(inv => (
            <div
              key={inv.id}
              className={`rounded-lg border p-3 transition-all ${
                inv.active ? 'bg-teal-950/20 border-teal-700/40' : 'bg-gray-800/40 border-gray-700/50 opacity-60'
              } ${draggingId === inv.id ? 'opacity-40' : ''} ${
                overedId === inv.id && draggingId !== inv.id ? 'ring-2 ring-teal-500/50 ring-inset' : ''
              }`}
              {...getItemProps(inv.id)}
            >
              {/* Row 1: drag handle + name + amount + toggle + delete */}
              <div className="grid items-center gap-2" style={{ gridTemplateColumns: '20px 1fr 120px 72px 32px' }}>
                <div
                  className="text-gray-600 hover:text-gray-400 transition-colors flex items-center justify-center select-none"
                  {...dragHandleProps(inv.id)}
                >
                  <DragHandle />
                </div>
                <input
                  type="text"
                  value={inv.name}
                  onChange={e => update(inv.id, 'name', e.target.value)}
                  className={`bg-gray-700 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none w-full transition-colors ${
                    inv.active ? 'border-teal-700/50 focus:border-teal-400' : 'border-gray-600 focus:border-gray-500'
                  }`}
                  placeholder="e.g. Roth IRA, 401k, BTC DCA"
                />
                <div className={`flex items-center bg-gray-700 border rounded-lg px-2 py-2 transition-colors ${
                  inv.active ? 'border-teal-700/50 focus-within:border-teal-400' : 'border-gray-600 focus-within:border-gray-500'
                }`}>
                  <span className="text-gray-500 text-sm mr-1">$</span>
                  <input
                    type="number"
                    value={inv.monthlyAmount}
                    onChange={e => update(inv.id, 'monthlyAmount', Number(e.target.value))}
                    className="bg-transparent text-white text-sm w-full outline-none"
                    min="0"
                    step="10"
                  />
                  <span className="text-gray-600 text-xs ml-1 shrink-0">/mo</span>
                </div>
                <button
                  onClick={() => update(inv.id, 'active', !inv.active)}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    inv.active
                      ? 'bg-teal-600/40 text-teal-300 border border-teal-500/60'
                      : 'bg-gray-700 text-gray-500 border border-gray-600 hover:border-gray-400'
                  }`}
                  title={inv.active ? 'Pause this investment' : 'Resume this investment'}
                >
                  {inv.active ? '● On' : '○ Off'}
                </button>
                <button
                  onClick={() => remove(inv.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors flex items-center justify-center"
                  title="Remove investment"
                >
                  <TrashIcon />
                </button>
              </div>
              {/* Row 2: description */}
              <input
                type="text"
                value={inv.description}
                onChange={e => update(inv.id, 'description', e.target.value)}
                className="mt-2 w-full bg-transparent border-0 border-b border-gray-700 px-1 py-1 text-gray-500 text-xs focus:outline-none focus:border-gray-500 placeholder-gray-700 transition-colors"
                placeholder="Description (optional) — e.g. Fidelity target date 2055, 6% of salary match"
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={add}
        className="w-full py-2 rounded-lg border border-dashed border-gray-600 text-gray-500 hover:border-teal-500 hover:text-teal-400 text-sm transition-colors"
      >
        + Add Investment
      </button>

      {investments.length > 0 && (
        <div className="bg-gray-700/40 rounded-lg px-4 py-3 flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-gray-500">Active monthly: </span>
            <span className="text-teal-300 font-semibold">{formatCurrency(activeTotal)}/mo</span>
          </div>
          {pausedTotal > 0 && (
            <div>
              <span className="text-gray-500">Paused: </span>
              <span className="text-gray-400 font-semibold">{formatCurrency(pausedTotal)}/mo</span>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-600">
        Active investments add to your monthly burn — toggle <span className="text-teal-400 font-medium">Off</span> to pause. Drag <span className="text-gray-500">⠿</span> to reorder.
      </p>
    </div>
  )
}
