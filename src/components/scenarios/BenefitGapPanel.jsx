import { formatCurrency, formatMonths } from '../../utils/formatters'
import dayjs from 'dayjs'

export default function BenefitGapPanel({ value, onChange, unemployment, baseRunwayMonths, altRunwayMonths }) {
  const delayWeeks = Number(value.benefitDelayWeeks) || 0
  const cutWeeks   = Number(value.benefitCutWeeks)   || 0

  function update(field, val) {
    onChange({ ...value, [field]: val })
  }

  const delta =
    altRunwayMonths != null && baseRunwayMonths != null
      ? altRunwayMonths - baseRunwayMonths
      : null

  const isActive = delayWeeks > 0 || cutWeeks > 0

  const origStart = dayjs(unemployment.startDate)
  const newStart  = origStart.add(delayWeeks, 'week')
  const newEnd    = newStart.add(Math.max(0, unemployment.durationWeeks - cutWeeks), 'week')
  const lostIncome = (delayWeeks * unemployment.weeklyAmount) + (cutWeeks * unemployment.weeklyAmount)

  return (
    <div className="space-y-3 pt-2">
      {/* Delay — inline slider */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400 shrink-0 w-14">Delay</label>
        <input
          type="range" min="0" max="26" step="1"
          value={delayWeeks}
          onChange={e => update('benefitDelayWeeks', Number(e.target.value))}
          className="flex-1 h-1.5 accent-rose-500 cursor-pointer"
        />
        <span className="text-xs font-bold text-rose-400 bg-rose-900/30 px-1.5 py-0.5 rounded min-w-[3.5rem] text-center">
          {delayWeeks === 0 ? 'none' : `${delayWeeks}wk`}
        </span>
      </div>

      {/* Cut — inline slider */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400 shrink-0 w-14">Cut short</label>
        <input
          type="range" min="0" max={unemployment.durationWeeks} step="1"
          value={cutWeeks}
          onChange={e => update('benefitCutWeeks', Number(e.target.value))}
          className="flex-1 h-1.5 accent-orange-500 cursor-pointer"
        />
        <span className="text-xs font-bold text-orange-400 bg-orange-900/30 px-1.5 py-0.5 rounded min-w-[3.5rem] text-center">
          {cutWeeks === 0 ? 'none' : `${cutWeeks}wk`}
        </span>
      </div>

      {/* Compact summary */}
      {isActive && (
        <div className={`rounded-lg px-3 py-2 text-xs border space-y-1 ${
          delta < 0 ? 'bg-red-950/20 border-red-700/30' : 'bg-gray-800/40 border-gray-700/40'
        }`}>
          <div className="flex items-center justify-between text-gray-400">
            <span>{newStart.format('MMM D')} &mdash; {newEnd.format('MMM D, YYYY')}</span>
            <span className="text-rose-400 font-bold">-{formatCurrency(lostIncome)}</span>
          </div>
          {delta !== null && delta !== 0 && (
            <div className="flex items-center justify-between text-gray-500">
              <span>Runway impact</span>
              <span className={`font-bold ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {delta > 0 ? '+' : ''}{formatMonths(Math.abs(delta))}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
