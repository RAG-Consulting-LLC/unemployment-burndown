import { formatCurrency, formatMonths } from '../../utils/formatters'

export default function WhatIfPanel({ value, onChange, baseRunwayMonths, altRunwayMonths, assetProceeds }) {
  function update(field, val) {
    onChange({ ...value, [field]: val })
  }

  const delta = altRunwayMonths != null && baseRunwayMonths != null
    ? altRunwayMonths - baseRunwayMonths
    : null

  const hasChanges = value.expenseReductionPct > 0 || value.sideIncomeMonthly > 0 || assetProceeds > 0

  return (
    <div className="space-y-5">
      {/* Expense reduction slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-gray-300 font-medium">
            Cut discretionary expenses by
          </label>
          <span className="text-blue-400 font-bold text-sm bg-blue-900/30 px-2 py-0.5 rounded">
            {value.expenseReductionPct}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={value.expenseReductionPct}
          onChange={e => update('expenseReductionPct', Number(e.target.value))}
          className="w-full accent-blue-500 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>0% (no change)</span>
          <span>50%</span>
          <span>100% (cut all)</span>
        </div>
      </div>

      {/* Side income slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-gray-300 font-medium">
            Part-time / freelance income
          </label>
          <span className="text-emerald-400 font-bold text-sm bg-emerald-900/30 px-2 py-0.5 rounded">
            {formatCurrency(value.sideIncomeMonthly)}/mo
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="5000"
          step="100"
          value={value.sideIncomeMonthly}
          onChange={e => update('sideIncomeMonthly', Number(e.target.value))}
          className="w-full accent-emerald-500 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>$0</span>
          <span>$2,500</span>
          <span>$5,000</span>
        </div>
      </div>

      {/* Sellable assets summary (read-only, driven by Assets panel toggles) */}
      {assetProceeds > 0 && (
        <div className="flex items-center justify-between bg-violet-950/30 border border-violet-700/40 rounded-lg px-4 py-3">
          <div>
            <p className="text-sm text-violet-300 font-medium">Selling assets</p>
            <p className="text-xs text-gray-500 mt-0.5">Toggle assets in the Sellable Assets section below</p>
          </div>
          <span className="text-violet-300 font-bold text-lg">{formatCurrency(assetProceeds)}</span>
        </div>
      )}

      {/* Impact summary */}
      {hasChanges && delta !== null && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${
          delta > 0
            ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300'
            : delta < 0
            ? 'bg-red-950/40 border-red-700/40 text-red-300'
            : 'bg-gray-700/40 border-gray-600 text-gray-400'
        }`}>
          {delta > 0 ? (
            <span>These changes extend your runway by <strong>{formatMonths(delta)}</strong>.</span>
          ) : delta < 0 ? (
            <span>These changes shorten your runway by <strong>{formatMonths(Math.abs(delta))}</strong>.</span>
          ) : (
            <span>No change to runway.</span>
          )}
        </div>
      )}

      {!hasChanges && (
        <p className="text-xs text-gray-600">
          Adjust the sliders above, or toggle assets to "Sell" in the Sellable Assets section to model scenarios.
        </p>
      )}
    </div>
  )
}
