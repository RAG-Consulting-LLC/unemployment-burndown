import { useState } from 'react'
import BurndownChart from './BurndownChart'
import BurnRateChart from './BurnRateChart'
import IncomeVsExpensesChart from './IncomeVsExpensesChart'
import ExpenseDonutChart from './ExpenseDonutChart'
import TopExpensesChart from './TopExpensesChart'
import IncomeCompositionChart from './IncomeCompositionChart'

// ─── Chart registry ───────────────────────────────────────────────────────────
const CHART_DEFS = [
  {
    id:   'burndown',
    icon: '📉',
    label: 'Balance',
    desc:  'Savings balance over time — the core runway burndown view',
  },
  {
    id:   'burnrate',
    icon: '🔥',
    label: 'Burn Rate',
    desc:  'Monthly net cash change — red when drawing down, green when income exceeds expenses',
  },
  {
    id:   'cashflow',
    icon: '💸',
    label: 'Cash Flow',
    desc:  'Side-by-side income vs. outflow bars — see which months are covered',
  },
  {
    id:   'expensemix',
    icon: '🥧',
    label: 'Expense Mix',
    desc:  'Donut breakdown of spending: essential, discretionary, subscriptions & more',
  },
  {
    id:   'topspend',
    icon: '📊',
    label: 'Top Costs',
    desc:  'All expense line-items ranked by monthly cost — spot your biggest drains',
  },
  {
    id:   'incomemix',
    icon: '📈',
    label: 'Income Mix',
    desc:  'Stacked income sources over time with outflow overlay',
  },
]

const STORAGE_KEY = 'runwayPinnedChartId'

// ─── Pin icon ─────────────────────────────────────────────────────────────────
function PinIcon({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      {/* Simple thumbtack shape */}
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  )
}

function PinIconFilled({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <line x1="12" y1="17" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ChartTabsSection({
  // BurndownChart props
  dataPoints,
  runoutDate,
  baseDataPoints,
  benefitStart,
  benefitEnd,
  emergencyFloor,
  showEssentials,
  showBaseline,
  // Expense data
  expenses,
  subscriptions,
  creditCards,
  investments,
  // Derived income
  monthlyBenefits,
}) {
  // Pinned chart (default shown first, persisted in localStorage)
  const [pinnedId, setPinnedId] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'burndown' } catch { return 'burndown' }
  })

  const [activeId, setActiveId] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'burndown' } catch { return 'burndown' }
  })

  const [hoveredId, setHoveredId] = useState(null)

  // Pinned tab always first, rest in original order
  const orderedDefs = [
    CHART_DEFS.find(c => c.id === pinnedId),
    ...CHART_DEFS.filter(c => c.id !== pinnedId),
  ].filter(Boolean)

  function handlePin(id, e) {
    e.stopPropagation()
    setPinnedId(id)
    try { localStorage.setItem(STORAGE_KEY, id) } catch {}
  }

  const activeChart = CHART_DEFS.find(c => c.id === activeId)

  return (
    <div
      id="sec-chart"
      className="theme-card rounded-xl border scroll-mt-20 overflow-hidden"
      style={{ borderColor: 'var(--border-default)' }}
    >
      {/* ── Tab bar ── */}
      <div
        className="flex items-stretch overflow-x-auto"
        style={{
          borderBottom: '1px solid var(--border-default)',
          background: 'var(--bg-subtle, var(--bg-card))',
          scrollbarWidth: 'none',
        }}
      >
        {orderedDefs.map((chart, idx) => {
          const isActive  = chart.id === activeId
          const isPinned  = chart.id === pinnedId
          const isHovered = chart.id === hoveredId
          const showPinBtn = (isHovered || isActive) && !isPinned

          return (
            <div key={chart.id} className="relative flex items-stretch flex-shrink-0">
              {/* Subtle separator between tabs */}
              {idx > 0 && (
                <div
                  className="w-px self-stretch"
                  style={{ background: 'var(--border-subtle)', opacity: 0.6 }}
                />
              )}

              <button
                onClick={() => setActiveId(chart.id)}
                onMouseEnter={() => setHoveredId(chart.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="relative flex items-center gap-1.5 px-3.5 py-3 text-sm font-medium transition-all duration-150"
                style={{
                  color: isActive
                    ? 'var(--text-primary)'
                    : isHovered
                      ? 'var(--text-secondary, var(--text-primary))'
                      : 'var(--text-muted)',
                  background: isActive
                    ? 'var(--bg-card)'
                    : isHovered
                      ? 'var(--bg-hover, rgba(255,255,255,0.04))'
                      : 'transparent',
                }}
                title={chart.desc}
              >
                {/* Pinned indicator (first tab only) */}
                {isPinned && idx === 0 && (
                  <span
                    style={{ color: 'var(--accent-amber, #f59e0b)', opacity: 0.85 }}
                    title="Default chart — will open here each time"
                  >
                    <PinIconFilled size={10} />
                  </span>
                )}

                <span className="text-base leading-none">{chart.icon}</span>
                <span className="hidden sm:inline whitespace-nowrap">{chart.label}</span>

                {/* Active underline */}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0"
                    style={{ height: 2, background: 'var(--accent-blue, #3b82f6)', borderRadius: '1px 1px 0 0' }}
                  />
                )}
              </button>

              {/* Pin-as-default button — floats on the right side of an active/hovered non-pinned tab */}
              {showPinBtn && (
                <button
                  onMouseEnter={() => setHoveredId(chart.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={(e) => handlePin(chart.id, e)}
                  className="flex items-center px-1.5 transition-opacity"
                  style={{
                    color: 'var(--text-muted)',
                    opacity: isHovered || isActive ? 0.55 : 0,
                    background: isActive ? 'var(--bg-card)' : 'transparent',
                  }}
                  title="Set as default chart"
                >
                  <PinIcon size={10} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Description strip ── */}
      <div
        className="flex items-center justify-between px-4 py-1.5"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-subtle, var(--bg-card))',
        }}
      >
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {activeChart?.desc}
        </p>
        {pinnedId !== activeId && (
          <button
            onClick={(e) => handlePin(activeId, e)}
            className="text-xs flex items-center gap-1 ml-3 flex-shrink-0 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="Pin this chart as your default"
          >
            <PinIcon size={10} />
            <span className="hidden sm:inline">Set default</span>
          </button>
        )}
        {pinnedId === activeId && activeId !== 'burndown' && (
          <button
            onClick={(e) => handlePin('burndown', e)}
            className="text-xs flex items-center gap-1 ml-3 flex-shrink-0 transition-colors"
            style={{ color: 'var(--text-muted)', opacity: 0.55 }}
            title="Reset default to Balance chart"
          >
            Reset default
          </button>
        )}
      </div>

      {/* ── Chart content ── */}
      <div className="p-4 sm:p-5">
        {activeId === 'burndown' && (
          <BurndownChart
            dataPoints={dataPoints}
            runoutDate={runoutDate}
            baseDataPoints={baseDataPoints}
            benefitStart={benefitStart}
            benefitEnd={benefitEnd}
            emergencyFloor={emergencyFloor}
            showEssentials={showEssentials}
            showBaseline={showBaseline}
          />
        )}
        {activeId === 'burnrate' && (
          <BurnRateChart dataPoints={dataPoints} />
        )}
        {activeId === 'cashflow' && (
          <IncomeVsExpensesChart dataPoints={dataPoints} />
        )}
        {activeId === 'expensemix' && (
          <ExpenseDonutChart
            expenses={expenses}
            subscriptions={subscriptions}
            creditCards={creditCards}
            investments={investments}
          />
        )}
        {activeId === 'topspend' && (
          <TopExpensesChart
            expenses={expenses}
            subscriptions={subscriptions}
            creditCards={creditCards}
            investments={investments}
          />
        )}
        {activeId === 'incomemix' && (
          <IncomeCompositionChart
            dataPoints={dataPoints}
            monthlyBenefits={monthlyBenefits}
          />
        )}
      </div>
    </div>
  )
}
