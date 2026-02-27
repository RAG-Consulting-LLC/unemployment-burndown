import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatCurrency } from '../../utils/formatters'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2.5 shadow-2xl"
      style={{ background: '#111827', border: '1px solid #374151' }}
    >
      <p className="text-sm font-semibold text-white mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex justify-between gap-4 text-xs">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-semibold" style={{ color: entry.color }}>
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function MonthlySpendingBarChart({ transactions = [], creditCards = [] }) {
  const data = useMemo(() => {
    const byMonth = {}
    for (const txn of transactions) {
      if (txn.amount <= 0) continue
      const month = txn.date?.slice(0, 7) // "YYYY-MM"
      if (!month) continue
      if (!byMonth[month]) byMonth[month] = { total: 0, byCard: {} }
      byMonth[month].total += txn.amount
      const cardId = txn.cardId || 'unknown'
      byMonth[month].byCard[cardId] = (byMonth[month].byCard[cardId] || 0) + txn.amount
    }

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => {
        const [yr, mo] = month.split('-')
        const label = new Date(Number(yr), Number(mo) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        return { month: label, total: Math.round(data.total), ...data.byCard }
      })
  }, [transactions])

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm"
        style={{ height: 260, color: '#6b7280' }}
      >
        No monthly spending data yet.
      </div>
    )
  }

  return (
    <div style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={v => `$${(v / 1000).toFixed(v >= 1000 ? 1 : 0)}k`}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="total"
            name="Total Spend"
            fill="var(--accent-blue)"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
