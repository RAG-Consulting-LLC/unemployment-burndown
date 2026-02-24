import { useState } from 'react'
import { formatCurrency, formatMonths, formatDate } from '../../utils/formatters'
import ComparisonChart from '../chart/ComparisonChart'

export default function ComparePanel({ templates, currentResult, currentLabel }) {
  const [selectedId, setSelectedId] = useState(null)

  const selected = templates.find(t => t.id === selectedId) || null

  // The "compare" result comes from the parent (pre-computed for the selected template)
  // We receive it as a prop so no hook call needed here.
  const compareResult = selected?._burndownResult || null

  const scenarioA = currentResult
    ? { label: currentLabel || 'Current', dataPoints: currentResult.dataPoints }
    : null

  const scenarioB = compareResult
    ? { label: selected?.name || 'Saved', dataPoints: compareResult.dataPoints }
    : null

  if (templates.length === 0) {
    return (
      <div className="text-xs text-gray-500 text-center py-6">
        Save at least one template using the Template Manager in the header to enable side-by-side comparison.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Pick a saved template to compare its burndown curve against the current scenario.
        Both curves appear on the same chart so you can see the trade-offs at a glance.
      </p>

      {/* Template selector */}
      <div>
        <label className="text-sm text-gray-300 font-medium block mb-2">Compare with saved template</label>
        <select
          value={selectedId ?? ''}
          onChange={e => setSelectedId(e.target.value ? Number(e.target.value) : null)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
        >
          <option value="">— Select a template —</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Stats comparison */}
      {scenarioA && scenarioB && (
        <>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Scenario A */}
            <div className="bg-blue-950/30 border border-blue-700/40 rounded-lg px-3 py-3 space-y-1">
              <p className="text-blue-400 font-semibold truncate">{scenarioA.label}</p>
              <p className="text-gray-400">Runway ends</p>
              <p className="text-white font-bold text-sm">
                {currentResult.runoutDate ? formatDate(currentResult.runoutDate) : 'Beyond 10 yrs'}
              </p>
              <p className="text-gray-400 mt-1">
                {currentResult.totalRunwayMonths != null
                  ? formatMonths(currentResult.totalRunwayMonths)
                  : '10+ years'}
              </p>
            </div>

            {/* Scenario B */}
            <div className="bg-purple-950/30 border border-purple-700/40 rounded-lg px-3 py-3 space-y-1">
              <p className="text-purple-400 font-semibold truncate">{scenarioB.label}</p>
              <p className="text-gray-400">Runway ends</p>
              <p className="text-white font-bold text-sm">
                {compareResult.runoutDate ? formatDate(compareResult.runoutDate) : 'Beyond 10 yrs'}
              </p>
              <p className="text-gray-400 mt-1">
                {compareResult.totalRunwayMonths != null
                  ? formatMonths(compareResult.totalRunwayMonths)
                  : '10+ years'}
              </p>
            </div>
          </div>

          {/* Delta banner */}
          {currentResult.totalRunwayMonths != null && compareResult.totalRunwayMonths != null && (() => {
            const delta = currentResult.totalRunwayMonths - compareResult.totalRunwayMonths
            return (
              <div className={`rounded-lg px-4 py-2 text-sm border text-center ${
                delta > 0
                  ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300'
                  : delta < 0
                  ? 'bg-red-950/40 border-red-700/40 text-red-300'
                  : 'bg-gray-700/40 border-gray-600 text-gray-400'
              }`}>
                {delta > 0
                  ? <>Current scenario is <strong>{formatMonths(delta)}</strong> longer</>
                  : delta < 0
                  ? <><strong>{selected?.name}</strong> is <strong>{formatMonths(Math.abs(delta))}</strong> longer</>
                  : <>Both scenarios have the same runway</>
                }
              </div>
            )
          })()}
        </>
      )}

      {!selectedId && (
        <p className="text-xs text-gray-600 text-center py-2">
          Select a saved template above to see the comparison chart.
        </p>
      )}
    </div>
  )
}
