import { formatMonths } from '../../utils/formatters'
import dayjs from 'dayjs'

export default function ExpenseFreezeDatePanel({ value, onChange, baseRunwayMonths, altRunwayMonths }) {
  const freezeDate = value.freezeDate || ''
  const reductionPct = Number(value.expenseReductionPct) || 0

  function setFreezeDate(d) {
    onChange({ ...value, freezeDate: d })
  }

  const delta =
    altRunwayMonths != null && baseRunwayMonths != null
      ? altRunwayMonths - baseRunwayMonths
      : null

  const isActive = !!freezeDate && reductionPct > 0

  // How many months of full spending before cuts kick in
  const today = dayjs('2026-02-21')
  const monthsUntilFreeze = freezeDate
    ? Math.max(0, Math.round(dayjs(freezeDate).diff(today, 'day') / 30))
    : 0

  // Min date = tomorrow, formatted for input
  const minDate = today.add(1, 'day').format('YYYY-MM-DD')

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Keep current spending through a specific date, then apply your expense reduction % after that.
        Useful for modeling "I'll cut back in April" or delaying austerity while job searching.
      </p>

      {reductionPct === 0 && (
        <div className="text-xs text-amber-400 bg-amber-900/20 border border-amber-700/30 rounded-lg px-3 py-2">
          Set a "Cut discretionary expenses" % in the main What-If panel first — the freeze date controls
          <em> when</em> that cut begins.
        </div>
      )}

      <div>
        <label className="text-sm text-gray-300 font-medium block mb-2">
          Full spending through
        </label>
        <input
          type="date"
          min={minDate}
          value={freezeDate}
          onChange={e => setFreezeDate(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Quick-pick buttons */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 6].map(mo => {
          const d = today.add(mo, 'month').format('YYYY-MM-DD')
          return (
            <button
              key={mo}
              onClick={() => setFreezeDate(d)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                freezeDate === d
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-blue-500'
              }`}
            >
              +{mo} mo
            </button>
          )
        })}
        {freezeDate && (
          <button
            onClick={() => setFreezeDate('')}
            className="text-xs px-3 py-1 rounded-full border border-gray-600 text-gray-400 hover:border-red-500 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {isActive && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-3 space-y-1 text-xs">
          <div className="flex justify-between text-gray-400">
            <span>Full spending for</span>
            <span className="text-white font-medium">~{monthsUntilFreeze} month{monthsUntilFreeze !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Then cuts of</span>
            <span className="text-blue-400 font-medium">{reductionPct}% non-essential</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Starting</span>
            <span className="text-white font-medium">{dayjs(freezeDate).format('MMM D, YYYY')}</span>
          </div>
        </div>
      )}

      {isActive && delta !== null && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${
          delta > 0
            ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300'
            : delta < 0
            ? 'bg-red-950/40 border-red-700/40 text-red-300'
            : 'bg-gray-700/40 border-gray-600 text-gray-400'
        }`}>
          {delta > 0 ? (
            <>Delayed cuts still extend runway by <strong>{formatMonths(delta)}</strong> vs. no cuts.</>
          ) : delta < 0 ? (
            <>Delaying cuts shortens runway by <strong>{formatMonths(Math.abs(delta))}</strong> vs. cutting now.</>
          ) : (
            <>No change vs. cutting immediately.</>
          )}
        </div>
      )}

      {!isActive && reductionPct > 0 && !freezeDate && (
        <p className="text-xs text-gray-600">
          Pick a date above to delay when your {reductionPct}% expense cut kicks in.
        </p>
      )}
    </div>
  )
}
