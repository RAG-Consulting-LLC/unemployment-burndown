import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '../../utils/formatters'

const MAX_MONTHS = 60 // 5-year default view

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm shadow-xl space-y-1">
      <p className="text-gray-400 text-xs">{d?.dateLabel}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

/**
 * Merges N scenario dataPoint arrays (by month index) into a single array
 * for a multi-line chart. Includes a baseline (no-job) line.
 */
function mergeDataPoints(baselinePoints, scenarios, scenarioResults) {
  const map = {}
  for (const pt of (baselinePoints || [])) {
    if (pt.month > MAX_MONTHS) break
    map[pt.month] = { dateLabel: pt.dateLabel, month: pt.month, 'No Job (Baseline)': pt.balance }
  }
  for (const s of scenarios) {
    const result = scenarioResults[s.id]
    if (!result) continue
    for (const pt of result.dataPoints) {
      if (pt.month > MAX_MONTHS) break
      map[pt.month] = { ...map[pt.month], dateLabel: pt.dateLabel, month: pt.month, [s.name]: pt.balance }
    }
  }
  return Object.values(map).sort((a, b) => a.month - b.month)
}

export default function JobScenariosChart({ scenarios, scenarioResults }) {
  const baselineResult = scenarioResults['__baseline__']
  if (!baselineResult || scenarios.length === 0) return null

  const merged = mergeDataPoints(baselineResult.dataPoints, scenarios, scenarioResults)

  // Thin to ~60 points max for performance
  const step = Math.max(1, Math.ceil(merged.length / 60))
  const chartData = merged.filter((_, i) => i % step === 0 || i === merged.length - 1)

  // Compute max balance for Y axis
  const allKeys = ['No Job (Baseline)', ...scenarios.map(s => s.name)]
  const maxBalance = Math.max(
    ...chartData.map(d => Math.max(...allKeys.map(k => d[k] ?? 0)))
  )

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />

          <XAxis
            dataKey="dateLabel"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />

          <YAxis
            tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={52}
            domain={[0, maxBalance * 1.05]}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => <span style={{ color: '#d1d5db' }}>{value}</span>}
          />

          <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} />

          {/* Baseline (no job) — dashed gray */}
          <Line
            type="monotone"
            dataKey="No Job (Baseline)"
            stroke="#6b7280"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />

          {/* One solid line per scenario */}
          {scenarios.map(s => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.name}
              stroke={s.color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
