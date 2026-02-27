import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatCurrency } from '../../utils/formatters'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      className="rounded-xl px-3 py-2.5 shadow-2xl"
      style={{ background: '#111827', border: '1px solid #374151' }}
    >
      <p className="text-sm font-semibold text-white mb-0.5">{d.merchant}</p>
      <p className="text-sm font-bold" style={{ color: 'var(--accent-blue)' }}>
        {formatCurrency(d.total)}
      </p>
      <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
        {d.count} transaction{d.count !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

export default function TopMerchantsChart({ transactions = [] }) {
  const data = useMemo(() => {
    const byMerchant = {}
    for (const txn of transactions) {
      if (txn.amount <= 0) continue
      const merchant = txn.merchantName || txn.description || 'Unknown'
      if (!byMerchant[merchant]) byMerchant[merchant] = { total: 0, count: 0 }
      byMerchant[merchant].total += txn.amount
      byMerchant[merchant].count++
    }

    return Object.entries(byMerchant)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 15)
      .map(([merchant, data]) => ({
        merchant: merchant.length > 22 ? merchant.slice(0, 20) + '...' : merchant,
        total: Math.round(data.total),
        count: data.count,
      }))
  }, [transactions])

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm"
        style={{ height: 260, color: '#6b7280' }}
      >
        No merchant data yet.
      </div>
    )
  }

  return (
    <div style={{ height: Math.max(260, data.length * 32 + 40) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={v => `$${(v / 1000).toFixed(v >= 1000 ? 1 : 0)}k`}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="merchant"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={140}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="total"
            fill="var(--accent-blue)"
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
