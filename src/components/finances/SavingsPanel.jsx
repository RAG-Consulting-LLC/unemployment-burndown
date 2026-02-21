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

export default function SavingsPanel({ accounts, onChange }) {
  const { dragHandleProps, getItemProps, draggingId, overedId } = useDragReorder(accounts, onChange)

  function updateAccount(id, field, val) {
    onChange(accounts.map(a => a.id === id ? { ...a, [field]: val } : a))
  }

  function deleteAccount(id) {
    onChange(accounts.filter(a => a.id !== id))
  }

  function addAccount() {
    onChange([...accounts, { id: Date.now(), name: 'New Account', amount: 0 }])
  }

  const total = accounts.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)

  return (
    <div className="space-y-3">
      {/* Column headers */}
      <div
        className="grid items-center gap-2 text-xs text-gray-500 uppercase tracking-wider font-semibold px-1"
        style={{ gridTemplateColumns: '20px 1fr 130px 32px' }}
      >
        <span></span>
        <span>Account / Source</span>
        <span>Balance</span>
        <span></span>
      </div>

      {/* Account rows */}
      <div className="space-y-2">
        {accounts.map(account => (
          <div
            key={account.id}
            className={`grid items-center gap-2 rounded-lg transition-all ${
              draggingId === account.id ? 'opacity-40' : ''
            } ${
              overedId === account.id && draggingId !== account.id
                ? 'ring-2 ring-blue-500/50 ring-inset'
                : ''
            }`}
            style={{ gridTemplateColumns: '20px 1fr 130px 32px' }}
            {...getItemProps(account.id)}
          >
            <div
              className="text-gray-600 hover:text-gray-400 transition-colors flex items-center justify-center select-none"
              {...dragHandleProps(account.id)}
            >
              <DragHandle />
            </div>
            <input
              type="text"
              value={account.name}
              onChange={e => updateAccount(account.id, 'name', e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 w-full"
              placeholder="e.g. Chase Checking"
            />
            <div className="flex items-center bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 focus-within:border-blue-500">
              <span className="text-gray-500 text-sm mr-1">$</span>
              <input
                type="number"
                value={account.amount}
                onChange={e => updateAccount(account.id, 'amount', Number(e.target.value))}
                className="bg-transparent text-white text-sm w-full outline-none"
                min="0"
                step="100"
              />
            </div>
            <button
              onClick={() => deleteAccount(account.id)}
              className="text-gray-600 hover:text-red-400 transition-colors flex items-center justify-center"
              title="Remove account"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addAccount}
        className="w-full py-2 rounded-lg border border-dashed border-gray-600 text-gray-500 hover:border-blue-500 hover:text-blue-400 text-sm transition-colors"
      >
        + Add Account
      </button>

      <div className="bg-gray-700/40 rounded-lg px-4 py-3 flex items-center justify-between">
        <span className="text-gray-400 text-sm font-medium">Total Cash Available</span>
        <span className="text-white text-2xl font-bold">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}
