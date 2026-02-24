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
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Set a cash reserve you won't spend below — e.g. a security deposit buffer, medical emergency fund,
        or relocation fund. Runway counts down to that floor, not to zero.
      </p>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-gray-300 font-medium">Emergency cash floor</label>
          <span className="text-amber-400 font-bold text-sm bg-amber-900/30 px-2 py-0.5 rounded">
            {formatCurrency(floor)}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="20000"
          step="250"
          value={floor}
          onChange={e => setFloor(Number(e.target.value))}
          className="w-full accent-amber-500 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>$0 (none)</span>
          <span>$10,000</span>
          <span>$20,000</span>
        </div>
      </div>

      {/* Custom input */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Or type exact amount:</span>
        <input
          type="number"
          min="0"
          step="100"
          value={floor || ''}
          placeholder="0"
          onChange={e => setFloor(Math.max(0, Number(e.target.value)))}
          className="w-32 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-amber-500"
        />
      </div>

      {isActive && delta !== null && (
        <div className="rounded-lg px-4 py-3 text-sm border bg-amber-950/40 border-amber-700/40 text-amber-300">
          Protecting <strong>{formatCurrency(floor)}</strong> as untouchable reserve shortens accessible
          runway by <strong>{formatMonths(Math.abs(delta))}</strong>.
        </div>
      )}

      {!isActive && (
        <p className="text-xs text-gray-600">
          Slide above to set a floor. Your runway chart will show how long until you hit that threshold.
        </p>
      )}
    </div>
  )
}
