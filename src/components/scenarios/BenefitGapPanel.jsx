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

  // Show what the new benefit dates would look like
  const origStart = dayjs(unemployment.startDate)
  const newStart  = origStart.add(delayWeeks, 'week')
  const newEnd    = newStart.add(Math.max(0, unemployment.durationWeeks - cutWeeks), 'week')
  const lostIncome = formatCurrency(
    (delayWeeks * unemployment.weeklyAmount) +
    (cutWeeks   * unemployment.weeklyAmount)
  )

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-500">
        Model what happens if your unemployment claim is denied, delayed, or ends early due to
        re-employment, benefit exhaustion, or eligibility issues.
      </p>

      {/* Delay slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-gray-300 font-medium">Benefits delayed by</label>
          <span className="text-rose-400 font-bold text-sm bg-rose-900/30 px-2 py-0.5 rounded">
            {delayWeeks === 0 ? 'No delay' : `${delayWeeks} wk${delayWeeks !== 1 ? 's' : ''}`}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="26"
          step="1"
          value={delayWeeks}
          onChange={e => update('benefitDelayWeeks', Number(e.target.value))}
          className="w-full accent-rose-500 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>0 weeks</span>
          <span>13 wks</span>
          <span>26 wks</span>
        </div>
      </div>

      {/* Cut slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-gray-300 font-medium">Benefits cut short by</label>
          <span className="text-orange-400 font-bold text-sm bg-orange-900/30 px-2 py-0.5 rounded">
            {cutWeeks === 0 ? 'None' : `${cutWeeks} wk${cutWeeks !== 1 ? 's' : ''}`}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max={unemployment.durationWeeks}
          step="1"
          value={cutWeeks}
          onChange={e => update('benefitCutWeeks', Number(e.target.value))}
          className="w-full accent-orange-500 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>0 weeks</span>
          <span>{Math.round(unemployment.durationWeeks / 2)} wks</span>
          <span>{unemployment.durationWeeks} wks (all)</span>
        </div>
      </div>

      {/* Projected dates */}
      {isActive && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 space-y-1 text-xs">
          <div className="flex justify-between text-gray-400">
            <span>Benefits would start</span>
            <span className="text-white font-medium">{newStart.format('MMM D, YYYY')}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Benefits would end</span>
            <span className="text-white font-medium">{newEnd.format('MMM D, YYYY')}</span>
          </div>
          <div className="flex justify-between text-gray-400 border-t border-gray-700 pt-1 mt-1">
            <span>Lost benefit income</span>
            <span className="text-rose-400 font-bold">{lostIncome}</span>
          </div>
        </div>
      )}

      {/* Impact */}
      {isActive && delta !== null && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${
          delta >= 0
            ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300'
            : 'bg-red-950/40 border-red-700/40 text-red-300'
        }`}>
          {delta < 0
            ? <>This scenario shortens your runway by <strong>{formatMonths(Math.abs(delta))}</strong>.</>
            : <>No net change to runway under this scenario.</>
          }
        </div>
      )}

      {!isActive && (
        <p className="text-xs text-gray-600">
          Drag the sliders to model a delayed claim, early cutoff, or partial denial.
        </p>
      )}
    </div>
  )
}
