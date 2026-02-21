import { useState } from 'react'
import { formatCurrency } from '../../utils/formatters'

export default function SavingsInput({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')

  function startEdit() {
    setRaw(String(value))
    setEditing(true)
  }

  function commitEdit() {
    const parsed = parseFloat(raw.replace(/[^0-9.]/g, ''))
    if (!isNaN(parsed) && parsed >= 0) onChange(parsed)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <label className="block text-xs text-gray-500 mb-1 font-medium">Current Savings / Cash on Hand</label>
        {editing ? (
          <div className="flex items-center bg-gray-700 border border-blue-500 rounded-lg px-3 py-2">
            <span className="text-gray-400 mr-1 text-lg">$</span>
            <input
              className="bg-transparent text-white text-2xl font-bold w-full outline-none"
              type="number"
              value={raw}
              onChange={e => setRaw(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => e.key === 'Enter' && commitEdit()}
              autoFocus
              min="0"
            />
          </div>
        ) : (
          <button
            onClick={startEdit}
            className="text-left w-full bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-blue-500 rounded-lg px-3 py-2 transition-colors group"
          >
            <span className="text-3xl font-bold text-white">{formatCurrency(value)}</span>
            <span className="ml-2 text-xs text-gray-500 group-hover:text-blue-400 transition-colors">click to edit</span>
          </button>
        )}
      </div>
    </div>
  )
}
