import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '../../utils/formatters'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-gray-400 text-xs mb-1">{d.dateLabel}</p>
      <p className="text-white font-semibold">{formatCurrency(d.balance)}</p>
    </div>
  )
}

export default function BurndownChart({ dataPoints, runoutDate }) {
  // Thin out data points for large datasets (keep every nth point)
  const MAX_POINTS = 60
  const step = Math.max(1, Math.ceil(dataPoints.length / MAX_POINTS))
  const chartData = dataPoints.filter((_, i) => i % step === 0 || i === dataPoints.length - 1)

  const maxBalance = Math.max(...chartData.map(d => d.balance))

  const todayLabel = 'Feb 2026' // furlough start

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>

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

          {/* Zero floor reference line */}
          <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} />

          {/* Today marker */}
          <ReferenceLine
            x={todayLabel}
            stroke="#f59e0b"
            strokeDasharray="4 2"
            strokeWidth={1.5}
            label={{ value: 'Today', fill: '#f59e0b', fontSize: 11, position: 'top' }}
          />

          <Area
            type="monotone"
            dataKey="balance"
            stroke="#3b82f6"
            strokeWidth={2.5}
            fill="url(#balanceGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
