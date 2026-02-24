import { formatCurrency, formatMonths } from '../../utils/formatters'
import dayjs from 'dayjs'

export default function JobOfferPanel({ value, onChange, baseRunwayMonths, altRunwayMonths }) {
  const salary   = Number(value.jobOfferSalary)    || 0
  const startDate = value.jobOfferStartDate || ''

  function update(field, val) {
    onChange({ ...value, [field]: val })
  }

  const delta =
    altRunwayMonths != null && baseRunwayMonths != null
      ? altRunwayMonths - baseRunwayMonths
      : null

  const isActive = salary > 0 && !!startDate

  const today = dayjs('2026-02-21')
  const minDate = today.add(1, 'day').format('YYYY-MM-DD')

  const monthsUntilStart = startDate
    ? Math.max(0, parseFloat(dayjs(startDate).diff(today, 'day') / 30).toFixed(1))
    : null

  // Annualized gross estimate (take-home * 12, rough)
  const annualEstimate = salary * 12

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-500">
        Model a job offer: enter your estimated monthly take-home pay and expected start date.
        Runway resets entirely once you're employed — see exactly which scenario gets you there safely.
      </p>

      {/* Monthly take-home */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-gray-300 font-medium">Monthly take-home pay</label>
          <span className="text-emerald-400 font-bold text-sm bg-emerald-900/30 px-2 py-0.5 rounded">
            {salary > 0 ? `${formatCurrency(salary)}/mo` : 'Not set'}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="15000"
          step="250"
          value={salary}
          onChange={e => update('jobOfferSalary', Number(e.target.value))}
          className="w-full accent-emerald-500 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>$0</span>
          <span>$7,500</span>
          <span>$15,000</span>
        </div>
        {salary > 0 && (
          <p className="text-xs text-gray-500 mt-1 text-right">
            ≈ {formatCurrency(annualEstimate)}/yr take-home
          </p>
        )}
      </div>

      {/* Custom salary input */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Exact amount:</span>
        <input
          type="number"
          min="0"
          step="100"
          value={salary || ''}
          placeholder="e.g. 5800"
          onChange={e => update('jobOfferSalary', Math.max(0, Number(e.target.value)))}
          className="w-36 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Start date */}
      <div>
        <label className="text-sm text-gray-300 font-medium block mb-2">Job start date</label>
        <input
          type="date"
          min={minDate}
          value={startDate}
          onChange={e => update('jobOfferStartDate', e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Quick picks */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 6].map(mo => {
          const d = today.add(mo, 'month').format('YYYY-MM-DD')
          return (
            <button
              key={mo}
              onClick={() => update('jobOfferStartDate', d)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                startDate === d
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-emerald-500'
              }`}
            >
              +{mo} mo
            </button>
          )
        })}
        {(salary > 0 || startDate) && (
          <button
            onClick={() => onChange({ ...value, jobOfferSalary: 0, jobOfferStartDate: '' })}
            className="text-xs px-3 py-1 rounded-full border border-gray-600 text-gray-400 hover:border-red-500 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Summary card */}
      {isActive && (
        <div className="bg-gray-800/60 border border-emerald-800/40 rounded-lg px-4 py-3 space-y-1 text-xs">
          <div className="flex justify-between text-gray-400">
            <span>Job starts in</span>
            <span className="text-white font-medium">~{monthsUntilStart} month{monthsUntilStart != 1 ? 's' : ''}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Monthly income after start</span>
            <span className="text-emerald-400 font-bold">{formatCurrency(salary)}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Side income before start</span>
            <span className="text-gray-300">{formatCurrency(value.sideIncomeMonthly)}/mo</span>
          </div>
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
            <>This job extends your runway by <strong>{formatMonths(delta)}</strong> — or eliminates the countdown entirely.</>
          ) : delta < 0 ? (
            <>Even with this job, runway shortens by <strong>{formatMonths(Math.abs(delta))}</strong>. Check expenses.</>
          ) : (
            <>No runway change — income roughly matches burn rate.</>
          )}
        </div>
      )}

      {!isActive && (
        <p className="text-xs text-gray-600">
          Enter take-home pay and a start date to see how a job offer reshapes your runway.
        </p>
      )}
    </div>
  )
}
