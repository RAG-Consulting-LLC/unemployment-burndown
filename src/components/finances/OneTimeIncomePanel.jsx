import { formatCurrency } from '../../utils/formatters'
import { useDragReorder } from '../../hooks/useDragReorder'
import DragHandle from '../layout/DragHandle'
import AssigneeSelect from '../people/AssigneeSelect'

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
  )
}

export default function OneTimeIncomePanel({ items, onChange, people = [] }) {
  const { dragHandleProps, getItemProps, draggingId, overedId } = useDragReorder(items, onChange)

  function updateItem(id, field, val) {
    onChange(items.map(item => item.id === id ? { ...item, [field]: val } : item))
  }

  function deleteItem(id) {
    onChange(items.filter(item => item.id !== id))
  }

  function addItem() {
    onChange([
      ...items,
      { id: Date.now(), description: 'Tax Refund', date: '2026-04-01', amount: 0, assignedTo: null },
    ])
  }

  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-gray-600 text-center py-4">
          No one-time income yet. Add things like tax refunds, bonuses, gifts, or asset sales.
        </p>
      ) : (
        <>
          {/* Column headers */}
          <div
            className="grid items-center gap-2 text-xs text-gray-500 uppercase tracking-wider font-semibold px-1"
            style={{ gridTemplateColumns: '20px 1fr 130px 110px 32px 32px' }}
          >
            <span></span>
            <span>Description</span>
            <span>Date</span>
            <span>Amount</span>
            <span></span>
            <span></span>
          </div>

          {/* Income rows */}
          <div className="space-y-2">
            {items.map(item => (
              <div
                key={item.id}
                className={`grid items-center gap-2 rounded-lg transition-all ${
                  draggingId === item.id ? 'opacity-40' : ''
                } ${
                  overedId === item.id && draggingId !== item.id
                    ? 'ring-2 ring-emerald-500/50 ring-inset'
                    : ''
                }`}
                style={{ gridTemplateColumns: '20px 1fr 130px 110px 32px 32px' }}
                {...getItemProps(item.id)}
              >
                <div
                  className="text-gray-600 hover:text-gray-400 transition-colors flex items-center justify-center select-none"
                  {...dragHandleProps(item.id)}
                >
                  <DragHandle />
                </div>
                <input
                  type="text"
                  value={item.description}
                  onChange={e => updateItem(item.id, 'description', e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 w-full"
                  placeholder="Description"
                />
                <input
                  type="date"
                  value={item.date}
                  onChange={e => updateItem(item.id, 'date', e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 w-full"
                />
                <div className="flex items-center bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 focus-within:border-emerald-500">
                  <span className="text-emerald-500 text-sm mr-1">+$</span>
                  <input
                    type="number"
                    value={item.amount}
                    onChange={e => updateItem(item.id, 'amount', Number(e.target.value))}
                    className="bg-transparent text-white text-sm w-full outline-none"
                    min="0"
                    step="10"
                  />
                </div>
                <AssigneeSelect
                  people={people}
                  value={item.assignedTo ?? null}
                  onChange={val => updateItem(item.id, 'assignedTo', val)}
                />
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors flex items-center justify-center"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        onClick={addItem}
        className="w-full py-2 rounded-lg border border-dashed border-gray-600 text-gray-500 hover:border-emerald-500 hover:text-emerald-400 text-sm transition-colors"
      >
        + Add One-Time Income
      </button>

      {items.length > 0 && (
        <div className="bg-emerald-900/20 rounded-lg px-4 py-3 flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total injections: </span>
            <span className="text-emerald-400 font-semibold">+{formatCurrency(total)}</span>
          </div>
          <div>
            <span className="text-gray-500">Count: </span>
            <span className="text-white font-semibold">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-600">
        One-time income is added to your balance on the specified date. Drag <span className="text-gray-500">⠿</span> to reorder.
      </p>
    </div>
  )
}
