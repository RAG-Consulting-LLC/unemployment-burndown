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

export default function CreditCardsPanel({ cards, onChange, people = [] }) {
  const { dragHandleProps, getItemProps, draggingId, overedId } = useDragReorder(cards, onChange)

  function updateCard(id, field, val) {
    onChange(cards.map(c => c.id === id ? { ...c, [field]: val } : c))
  }

  function deleteCard(id) {
    onChange(cards.filter(c => c.id !== id))
  }

  function addCard() {
    onChange([...cards, {
      id: Date.now(),
      name: 'New Card',
      balance: 0,
      minimumPayment: 0,
      assignedTo: null,
    }])
  }

  const totalBalance = cards.reduce((sum, c) => sum + (Number(c.balance) || 0), 0)
  const totalMinimum = cards.reduce((sum, c) => sum + (Number(c.minimumPayment) || 0), 0)

  return (
    <div className="space-y-3">
      {/* Column headers */}
      <div
        className="grid items-center gap-2 text-xs text-gray-500 uppercase tracking-wider font-semibold px-1"
        style={{ gridTemplateColumns: '20px 1fr 130px 130px 32px 32px' }}
      >
        <span></span>
        <span>Card / Account</span>
        <span>Balance Owed</span>
        <span>Min. Payment</span>
        <span></span>
        <span></span>
      </div>

      {/* Card rows */}
      <div className="space-y-2">
        {cards.map(card => (
          <div
            key={card.id}
            className={`grid items-center gap-2 rounded-lg transition-all ${
              draggingId === card.id ? 'opacity-40' : ''
            } ${
              overedId === card.id && draggingId !== card.id
                ? 'ring-2 ring-blue-500/50 ring-inset'
                : ''
            }`}
            style={{ gridTemplateColumns: '20px 1fr 130px 130px 32px 32px' }}
            {...getItemProps(card.id)}
          >
            {/* Drag handle */}
            <div
              className="text-gray-600 hover:text-gray-400 transition-colors flex items-center justify-center select-none"
              {...dragHandleProps(card.id)}
            >
              <DragHandle />
            </div>

            {/* Card name */}
            <input
              type="text"
              value={card.name}
              onChange={e => updateCard(card.id, 'name', e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 w-full"
              placeholder="Card name"
            />

            {/* Outstanding balance */}
            <div className="flex items-center bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 focus-within:border-blue-500">
              <span className="text-gray-500 text-sm mr-1">$</span>
              <input
                type="number"
                value={card.balance}
                onChange={e => updateCard(card.id, 'balance', Number(e.target.value))}
                className="bg-transparent text-white text-sm w-full outline-none"
                min="0"
                step="50"
                placeholder="0"
              />
            </div>

            {/* Minimum monthly payment */}
            <div className="flex items-center bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 focus-within:border-blue-500">
              <span className="text-gray-500 text-sm mr-1">$</span>
              <input
                type="number"
                value={card.minimumPayment}
                onChange={e => updateCard(card.id, 'minimumPayment', Number(e.target.value))}
                className="bg-transparent text-white text-sm w-full outline-none"
                min="0"
                step="5"
                placeholder="0"
              />
            </div>

            <AssigneeSelect
              people={people}
              value={card.assignedTo ?? null}
              onChange={val => updateCard(card.id, 'assignedTo', val)}
            />

            <button
              onClick={() => deleteCard(card.id)}
              className="text-gray-600 hover:text-red-400 transition-colors flex items-center justify-center"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>

      {/* Add row */}
      <button
        onClick={addCard}
        className="w-full py-2 rounded-lg border border-dashed border-gray-600 text-gray-500 hover:border-blue-500 hover:text-blue-400 text-sm transition-colors"
      >
        + Add Card
      </button>

      {/* Totals */}
      {cards.length > 0 && (
        <div className="bg-gray-700/40 rounded-lg px-4 py-3 flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total balance owed: </span>
            <span className="text-red-300 font-semibold">{formatCurrency(totalBalance)}</span>
          </div>
          <div>
            <span className="text-gray-500">Total min. payments: </span>
            <span className="text-white font-semibold">{formatCurrency(totalMinimum)}/mo</span>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-600">
        Outstanding balances are tracked for awareness. Minimum payments are added to your monthly expenses. Drag <span className="text-gray-500">⠿</span> to reorder.
      </p>
    </div>
  )
}
