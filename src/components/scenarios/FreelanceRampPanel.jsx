import { formatCurrency, formatMonths } from '../../utils/formatters'
import dayjs from 'dayjs'

const today = dayjs('2026-02-21')

// Default ramp tiers: month offsets 0, 3, 6
const DEFAULT_TIERS = [
  { monthOffset: 0, monthlyAmount: 0 },
  { monthOffset: 3, monthlyAmount: 0 },
  { monthOffset: 6, monthlyAmount: 0 },
]

export default function FreelanceRampPanel({ value, onChange, baseRunwayMonths, altRunwayMonths }) {
  const ramp = value.freelanceRamp && value.freelanceRamp.length > 0
    ? value.freelanceRamp
    : DEFAULT_TIERS

  function updateTier(idx, field, val) {
    const next = ramp.map((t, i) => i === idx ? { ...t, [field]: val } : t)
    onChange({ ...value, freelanceRamp: next })
  }

  function addTier() {
    const lastOffset = ramp[ramp.length - 1]?.monthOffset ?? 0
    onChange({
      ...value,
      freelanceRamp: [...ramp, { monthOffset: lastOffset + 3, monthlyAmount: 0 }],
    })
  }

  function removeTier(idx) {
    if (ramp.length <= 1) return
    onChange({ ...value, freelanceRamp: ramp.filter((_, i) => i !== idx) })
  }

  const delta =
    altRunwayMonths != null && baseRunwayMonths != null
      ? altRunwayMonths - baseRunwayMonths
      : null

  const isActive = ramp.some(t => (Number(t.monthlyAmount) || 0) > 0)

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Model freelance or gig income that grows over time. Set a monthly amount for each
        phase — the tracker ramps up income automatically as each milestone is reached.
      </p>

      {/* Tier rows */}
      <div className="space-y-3">
        {ramp.map((tier, idx) => {
          const startDate = today.add(tier.monthOffset, 'month')
          return (
            <div key={idx} className="flex items-center gap-3">
              <div className="flex flex-col items-center min-w-[56px]">
                <span className="text-xs text-gray-500">Mo +{tier.monthOffset}</span>
                <span className="text-xs text-gray-600">{startDate.format('MMM YYYY')}</span>
              </div>

              {/* Month offset */}
              <input
                type="number"
                min="0"
                max="60"
                step="1"
                value={tier.monthOffset}
                onChange={e => updateTier(idx, 'monthOffset', Math.max(0, Number(e.target.value)))}
                className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-teal-500"
                title="Month offset from today"
              />

              <span className="text-gray-600 text-xs">→</span>

              {/* Amount */}
              <div className="flex items-center gap-1 flex-1">
                <span className="text-gray-500 text-xs">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={tier.monthlyAmount || ''}
                  placeholder="0"
                  onChange={e => updateTier(idx, 'monthlyAmount', Math.max(0, Number(e.target.value)))}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-teal-300 focus:outline-none focus:border-teal-500"
                />
                <span className="text-gray-500 text-xs">/mo</span>
              </div>

              {ramp.length > 1 && (
                <button
                  onClick={() => removeTier(idx)}
                  className="text-gray-600 hover:text-red-400 transition-colors text-sm leading-none"
                  title="Remove tier"
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={addTier}
        className="text-xs text-teal-400 hover:text-teal-300 border border-teal-700/40 hover:border-teal-500 px-3 py-1.5 rounded-lg transition-colors w-full"
      >
        + Add phase
      </button>

      {/* Ramp preview */}
      {isActive && (
        <div className="bg-gray-800/60 border border-teal-800/30 rounded-lg px-4 py-3 space-y-1 text-xs">
          {ramp.map((tier, idx) => (
            <div key={idx} className="flex justify-between text-gray-400">
              <span>{today.add(tier.monthOffset, 'month').format('MMM YYYY')} onward</span>
              <span className="text-teal-400 font-medium">{formatCurrency(tier.monthlyAmount)}/mo</span>
            </div>
          ))}
        </div>
      )}

      {/* Impact */}
      {isActive && delta !== null && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${
          delta > 0
            ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300'
            : delta < 0
            ? 'bg-red-950/40 border-red-700/40 text-red-300'
            : 'bg-gray-700/40 border-gray-600 text-gray-400'
        }`}>
          {delta > 0 ? (
            <>Freelance ramp extends runway by <strong>{formatMonths(delta)}</strong>.</>
          ) : delta < 0 ? (
            <>Runway is shorter — check your ramp amounts.</>
          ) : (
            <>No net runway change.</>
          )}
        </div>
      )}

      {!isActive && (
        <p className="text-xs text-gray-600">
          Enter income amounts for each phase above. Leave at $0 for phases that haven't started yet.
        </p>
      )}
    </div>
  )
}
