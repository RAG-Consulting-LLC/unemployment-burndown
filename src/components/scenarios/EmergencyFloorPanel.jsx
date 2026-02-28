import { formatCurrency, formatMonths } from '../../utils/formatters'

export default function EmergencyFloorPanel({ value, onChange, baseRunwayMonths, altRunwayMonths }) {
  const floor = Number(value.emergencyFloor) || 0

  function setFloor(n) {
    onChange({ ...value, emergencyFloor: n })
  }

  const delta =
    altRunwayMonths != null && baseRunwayMonths != null
      ? altRunwayMonths - baseRunwayMonths
      : null

  const isActive = floor > 0

  return (
    <div className="space-y-3 pt-2">
      {/* Slider + editable value inline */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400 shrink-0">Reserve</label>
        <input
          type="range" min="0" max="20000" step="250"
          value={floor}
          onChange={e => setFloor(Number(e.target.value))}
          className="flex-1 h-1.5 accent-amber-500 cursor-pointer"
        />
        <input
          type="number" min="0" step="100"
          value={floor || ''}
          placeholder="$0"
          onChange={e => setFloor(Math.max(0, Number(e.target.value)))}
          className="w-20 bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-amber-400 font-bold text-right focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Compact impact */}
      {isActive && delta !== null && (
        <div className="flex items-center justify-between rounded-lg px-3 py-2 text-xs border bg-amber-950/20 border-amber-700/30">
          <span className="text-gray-400">
            Protecting {formatCurrency(floor)} as untouchable reserve
          </span>
          <span className="text-amber-400 font-bold whitespace-nowrap">
            {formatMonths(Math.abs(delta))} shorter
          </span>
        </div>
      )}
    </div>
  )
}
