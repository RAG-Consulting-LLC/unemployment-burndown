import { formatDate, formatMonths, formatCurrency } from '../../utils/formatters'

export default function RunwayBanner({ runoutDate, totalRunwayMonths, currentNetBurn, savings }) {
  const months = totalRunwayMonths

  let colorClass, bgClass, borderClass, label
  if (months === null) {
    colorClass = 'text-emerald-400'
    bgClass = 'bg-emerald-950/40'
    borderClass = 'border-emerald-700/40'
    label = 'No runout in projection window (10 yrs)'
  } else if (months > 6) {
    colorClass = 'text-emerald-400'
    bgClass = 'bg-emerald-950/40'
    borderClass = 'border-emerald-700/40'
    label = null
  } else if (months > 3) {
    colorClass = 'text-yellow-400'
    bgClass = 'bg-yellow-950/40'
    borderClass = 'border-yellow-700/40'
    label = null
  } else {
    colorClass = 'text-red-400'
    bgClass = 'bg-red-950/40'
    borderClass = 'border-red-700/40'
    label = null
  }

  return (
    <div className={`rounded-xl border ${bgClass} ${borderClass} p-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
            Estimated Runway
          </p>
          {label ? (
            <p className={`text-2xl font-bold ${colorClass}`}>{label}</p>
          ) : (
            <>
              <p className={`text-4xl font-bold ${colorClass} leading-none`}>
                {formatDate(runoutDate)}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {formatMonths(months)} of runway remaining
              </p>
            </>
          )}
        </div>

        <div className="flex gap-6 sm:gap-8 text-right">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
              Current Balance
            </p>
            <p className="text-2xl font-bold text-white">{formatCurrency(savings)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
              Net Burn / Mo
            </p>
            <p className={`text-2xl font-bold ${currentNetBurn > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {currentNetBurn > 0 ? '-' : '+'}{formatCurrency(Math.abs(currentNetBurn))}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
