import { useState, useEffect } from 'react'

function fmt(n) {
  return '$' + Math.round(Math.abs(n)).toLocaleString()
}

function ChevronIcon({ open }) {
  return (
    <svg
      width="10" height="10" viewBox="0 0 10 10" fill="none"
      style={{
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.15s ease',
        flexShrink: 0,
      }}
    >
      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Section({ label, total, sign, color, items = [], defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const hasItems = items.length > 0

  return (
    <div>
      <button
        onClick={() => hasItems && setOpen(o => !o)}
        className="w-full flex items-center justify-between px-2 py-1 rounded-md transition-colors"
        style={{
          cursor: hasItems ? 'pointer' : 'default',
          background: open ? 'color-mix(in srgb, var(--bg-hover) 60%, transparent)' : 'transparent',
        }}
      >
        <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="flex items-center gap-1 ml-1 shrink-0">
          <span className="text-xs font-semibold tabular-nums" style={{ color }}>
            {sign}{fmt(total)}
          </span>
          {hasItems && (
            <span style={{ color: 'var(--text-muted)' }}>
              <ChevronIcon open={open} />
            </span>
          )}
        </span>
      </button>

      {open && hasItems && (
        <div className="ml-2 mb-0.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-2 py-0.5 rounded">
              <span className="text-xs truncate" style={{ color: 'var(--text-muted)', opacity: 0.75, maxWidth: '60%' }}>
                {item.label}
              </span>
              <span className="text-xs tabular-nums" style={{ color, opacity: 0.85 }}>
                {fmt(item.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MobileFinancialDrawer({
  runwayLabel, runwayColor, burnColor, currentNetBurn, fmt,
  totalSavings, assetProceeds, monthlyBenefits, monthlyInvestments,
  totalMonthlyIncome, upcomingOneTimeIncome, totalExpensesOnly, totalSubsCost,
  totalCCPayments, upcomingOneTimeExpenses, activeAccounts, activeSubscriptions,
  activeCCPayments, activeInvestments, expenses, monthlyIncome, unemployment,
  oneTimeExpenses, oneTimeIncome,
}) {
  const [open, setOpen] = useState(false)

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="xl:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom drawer */}
      <div
        className="xl:hidden flex flex-col fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderBottom: 'none',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
          transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
          transform: open ? 'translateY(0)' : 'translateY(calc(100% - 3.5rem))',
          maxHeight: '80vh',
        }}
      >
        {/* Handle / collapsed pill */}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 shrink-0"
          style={{ height: '3.5rem' }}
          aria-label={open ? 'Close financial summary' : 'Open financial summary'}
        >
          {/* Drag handle */}
          <div className="absolute left-1/2 -translate-x-1/2 top-2 w-8 h-1 rounded-full" style={{ background: 'var(--border-default)' }} />

          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Finances
          </span>

          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums" style={{ color: burnColor }}>
              {currentNetBurn > 0 ? '-' : '+'}{fmt(currentNetBurn)}/mo
            </span>
            <span className="text-sm font-bold tabular-nums" style={{ color: runwayColor }}>
              {runwayLabel}
            </span>
            <svg
              width="12" height="12" viewBox="0 0 10 10" fill="none"
              style={{
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                color: 'var(--text-muted)',
              }}
            >
              <path d="M2 6.5L5 3.5L8 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>

        {/* Scrollable content */}
        <div className="flex flex-col gap-0.5 overflow-y-auto px-3 pb-6" style={{ scrollbarWidth: 'none' }}>
          {/* Cash */}
          <Section label="Cash" total={totalSavings} sign="" color="var(--accent-blue)"
            items={activeAccounts.map(a => ({ label: a.name || 'Account', amount: Number(a.amount) || 0 }))} />

          {assetProceeds > 0 && (
            <Section label="Assets (if sold)" total={assetProceeds} sign="+" color="var(--accent-teal)" items={[]} />
          )}

          <div className="my-1 mx-2" style={{ borderTop: '1px solid var(--border-default)' }} />
          <p className="text-xs px-2 mb-0.5" style={{ color: 'var(--text-muted)', opacity: 0.5, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Income /mo</p>

          {monthlyBenefits > 0 && (
            <Section label="UI Benefits" total={monthlyBenefits} sign="+" color="var(--accent-emerald)"
              items={[{ label: unemployment.weeklyAmount ? `$${unemployment.weeklyAmount}/wk` : '', amount: monthlyBenefits }].filter(i => i.label)} />
          )}

          {totalMonthlyIncome > 0 && (
            <Section label="Monthly Income" total={totalMonthlyIncome} sign="+" color="var(--accent-emerald)"
              items={monthlyIncome.filter(x => x.monthlyAmount).map(x => ({ label: x.name || x.source || 'Income', amount: Number(x.monthlyAmount) || 0 }))} />
          )}

          {upcomingOneTimeIncome.length > 0 && (
            <Section label="One-Time Income" total={upcomingOneTimeIncome.reduce((s, x) => s + (Number(x.amount) || 0), 0)} sign="+" color="var(--accent-teal)"
              items={upcomingOneTimeIncome.map(x => ({ label: x.note || x.description || x.date || 'Income', amount: Number(x.amount) || 0 }))} />
          )}

          <div className="my-1 mx-2" style={{ borderTop: '1px solid var(--border-default)' }} />
          <p className="text-xs px-2 mb-0.5" style={{ color: 'var(--text-muted)', opacity: 0.5, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Expenses /mo</p>

          {totalExpensesOnly > 0 && (
            <Section label="Expenses" total={totalExpensesOnly} sign="-" color="var(--accent-red)"
              items={expenses.filter(e => e.monthlyAmount).map(e => ({ label: e.category || 'Expense', amount: Number(e.monthlyAmount) || 0 }))} />
          )}

          {totalSubsCost > 0 && (
            <Section label="Subscriptions" total={totalSubsCost} sign="-" color="var(--accent-red)"
              items={activeSubscriptions.map(s => ({ label: s.name || 'Sub', amount: Number(s.monthlyAmount) || 0 }))} />
          )}

          {totalCCPayments > 0 && (
            <Section label="CC Min. Payments" total={totalCCPayments} sign="-" color="var(--accent-amber)"
              items={activeCCPayments.map(c => ({ label: c.name || 'Card', amount: Number(c.minimumPayment) || 0 }))} />
          )}

          {monthlyInvestments > 0 && (
            <Section label="Investments" total={monthlyInvestments} sign="-" color="var(--accent-amber)"
              items={activeInvestments.map(inv => ({ label: inv.name || inv.type || 'Investment', amount: Number(inv.monthlyAmount) || 0 }))} />
          )}

          {upcomingOneTimeExpenses.length > 0 && (
            <Section label="One-Time Expenses" total={upcomingOneTimeExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)} sign="-" color="var(--accent-red)"
              items={upcomingOneTimeExpenses.map(e => ({ label: e.note || e.category || e.date || 'Expense', amount: Number(e.amount) || 0 }))} />
          )}

          <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border-default)' }}>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Net Burn</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: burnColor }}>
                {currentNetBurn > 0 ? '-' : '+'}{fmt(currentNetBurn)}/mo
              </span>
            </div>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Runway</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: runwayColor }}>
                {runwayLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function FinancialSidebar({
  totalSavings = 0,
  assetProceeds = 0,
  effectiveExpenses = 0,
  monthlyBenefits = 0,
  monthlyInvestments = 0,
  currentNetBurn = 0,
  totalRunwayMonths = null,
  // raw data for breakdowns
  savingsAccounts = [],
  expenses = [],
  subscriptions = [],
  creditCards = [],
  investments = [],
  oneTimeExpenses = [],
  oneTimeIncome = [],
  monthlyIncome = [],
  unemployment = {},
}) {
  const runwayLabel = totalRunwayMonths != null
    ? totalRunwayMonths >= 120
      ? '10+ yrs'
      : totalRunwayMonths >= 24
        ? `${(totalRunwayMonths / 12).toFixed(1)} yrs`
        : `${Math.round(totalRunwayMonths)} mo`
    : '—'

  const runwayColor = totalRunwayMonths == null
    ? 'var(--text-muted)'
    : totalRunwayMonths >= 18
      ? 'var(--accent-emerald)'
      : totalRunwayMonths >= 9
        ? 'var(--accent-amber)'
        : 'var(--accent-red)'

  const burnColor = currentNetBurn > 0 ? 'var(--accent-red)' : 'var(--accent-emerald)'

  const activeAccounts = savingsAccounts.filter(a => a.active !== false)
  const activeSubscriptions = subscriptions.filter(s => s.active !== false)
  const activeCCPayments = creditCards.filter(c => (Number(c.minimumPayment) || 0) > 0)
  const activeInvestments = investments.filter(inv => inv.active !== false && (Number(inv.monthlyAmount) || 0) > 0)
  const totalSubsCost = activeSubscriptions.reduce((s, x) => s + (Number(x.monthlyAmount) || 0), 0)
  const totalCCPayments = activeCCPayments.reduce((s, c) => s + (Number(c.minimumPayment) || 0), 0)
  const totalExpensesOnly = expenses.reduce((s, e) => s + (Number(e.monthlyAmount) || 0), 0)
  const totalMonthlyIncome = monthlyIncome.reduce((s, x) => s + (Number(x.monthlyAmount) || 0), 0)
  const upcomingOneTimeExpenses = oneTimeExpenses.filter(e => e.date && e.amount)
  const upcomingOneTimeIncome = oneTimeIncome.filter(e => e.date && e.amount)

  return (
    <>
    <MobileFinancialDrawer
      runwayLabel={runwayLabel}
      runwayColor={runwayColor}
      burnColor={burnColor}
      currentNetBurn={currentNetBurn}
      fmt={fmt}
      totalSavings={totalSavings}
      assetProceeds={assetProceeds}
      monthlyBenefits={monthlyBenefits}
      monthlyInvestments={monthlyInvestments}
      totalMonthlyIncome={totalMonthlyIncome}
      upcomingOneTimeIncome={upcomingOneTimeIncome}
      totalExpensesOnly={totalExpensesOnly}
      totalSubsCost={totalSubsCost}
      totalCCPayments={totalCCPayments}
      upcomingOneTimeExpenses={upcomingOneTimeExpenses}
      activeAccounts={activeAccounts}
      activeSubscriptions={activeSubscriptions}
      activeCCPayments={activeCCPayments}
      activeInvestments={activeInvestments}
      expenses={expenses}
      monthlyIncome={monthlyIncome}
      unemployment={unemployment}
      oneTimeExpenses={oneTimeExpenses}
      oneTimeIncome={oneTimeIncome}
    />
    <aside
      className="hidden xl:flex flex-col fixed z-40"
      style={{
        top: '5.5rem',
        right: '0.75rem',
        width: '11rem',
        maxHeight: 'calc(100vh - 7rem)',
      }}
      aria-label="Financial summary"
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-2 px-2 shrink-0" style={{ color: 'var(--text-muted)' }}>
        Finances
      </p>

      {/* Scrollable sections */}
      <div className="flex flex-col gap-0.5 overflow-y-auto min-h-0 pb-2" style={{ scrollbarWidth: 'none' }}>

        {/* Cash */}
        <Section
          label="Cash"
          total={totalSavings}
          sign=""
          color="var(--accent-blue)"
          defaultOpen={false}
          items={activeAccounts.map(a => ({ label: a.name || 'Account', amount: Number(a.amount) || 0 }))}
        />

        {/* Asset Proceeds */}
        {assetProceeds > 0 && (
          <Section
            label="Assets (if sold)"
            total={assetProceeds}
            sign="+"
            color="var(--accent-teal)"
            items={[]}
          />
        )}

        {/* Divider: Income */}
        <div className="my-1 mx-2" style={{ borderTop: '1px solid var(--border-default)' }} />
        <p className="text-xs px-2 mb-0.5" style={{ color: 'var(--text-muted)', opacity: 0.5, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Income /mo</p>

        {/* UI Benefits */}
        {monthlyBenefits > 0 && (
          <Section
            label="UI Benefits"
            total={monthlyBenefits}
            sign="+"
            color="var(--accent-emerald)"
            items={[
              { label: `${unemployment.weeklyAmount ? '$' + unemployment.weeklyAmount + '/wk' : ''}`, amount: monthlyBenefits },
            ].filter(i => i.label)}
          />
        )}

        {/* Monthly Income */}
        {totalMonthlyIncome > 0 && (
          <Section
            label="Monthly Income"
            total={totalMonthlyIncome}
            sign="+"
            color="var(--accent-emerald)"
            items={monthlyIncome.filter(x => x.monthlyAmount).map(x => ({ label: x.name || x.source || 'Income', amount: Number(x.monthlyAmount) || 0 }))}
          />
        )}

        {/* One-time Income */}
        {upcomingOneTimeIncome.length > 0 && (
          <Section
            label="One-Time Income"
            total={upcomingOneTimeIncome.reduce((s, x) => s + (Number(x.amount) || 0), 0)}
            sign="+"
            color="var(--accent-teal)"
            items={upcomingOneTimeIncome.map(x => ({ label: x.note || x.description || x.date || 'Income', amount: Number(x.amount) || 0 }))}
          />
        )}

        {/* Divider: Expenses */}
        <div className="my-1 mx-2" style={{ borderTop: '1px solid var(--border-default)' }} />
        <p className="text-xs px-2 mb-0.5" style={{ color: 'var(--text-muted)', opacity: 0.5, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Expenses /mo</p>

        {/* Core Expenses */}
        {totalExpensesOnly > 0 && (
          <Section
            label="Expenses"
            total={totalExpensesOnly}
            sign="-"
            color="var(--accent-red)"
            items={expenses.filter(e => e.monthlyAmount).map(e => ({ label: e.category || 'Expense', amount: Number(e.monthlyAmount) || 0 }))}
          />
        )}

        {/* Subscriptions */}
        {totalSubsCost > 0 && (
          <Section
            label="Subscriptions"
            total={totalSubsCost}
            sign="-"
            color="var(--accent-red)"
            items={activeSubscriptions.map(s => ({ label: s.name || 'Sub', amount: Number(s.monthlyAmount) || 0 }))}
          />
        )}

        {/* Credit Cards */}
        {totalCCPayments > 0 && (
          <Section
            label="CC Min. Payments"
            total={totalCCPayments}
            sign="-"
            color="var(--accent-amber)"
            items={activeCCPayments.map(c => ({ label: c.name || 'Card', amount: Number(c.minimumPayment) || 0 }))}
          />
        )}

        {/* Investments */}
        {monthlyInvestments > 0 && (
          <Section
            label="Investments"
            total={monthlyInvestments}
            sign="-"
            color="var(--accent-amber)"
            items={activeInvestments.map(inv => ({ label: inv.name || inv.type || 'Investment', amount: Number(inv.monthlyAmount) || 0 }))}
          />
        )}

        {/* One-time Expenses */}
        {upcomingOneTimeExpenses.length > 0 && (
          <Section
            label="One-Time Expenses"
            total={upcomingOneTimeExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)}
            sign="-"
            color="var(--accent-red)"
            items={upcomingOneTimeExpenses.map(e => ({ label: e.note || e.category || e.date || 'Expense', amount: Number(e.amount) || 0 }))}
          />
        )}
      </div>

      {/* Pinned footer: Net Burn + Runway */}
      <div className="shrink-0 mt-1 pt-1.5" style={{ borderTop: '1px solid var(--border-default)' }}>
        <div className="flex items-center justify-between px-2 py-0.5">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Net Burn</span>
          <span className="text-xs font-semibold tabular-nums" style={{ color: burnColor }}>
            {currentNetBurn > 0 ? '-' : '+'}{fmt(currentNetBurn)}/mo
          </span>
        </div>
        <div className="flex items-center justify-between px-2 py-0.5">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Runway</span>
          <span className="text-xs font-bold tabular-nums" style={{ color: runwayColor }}>
            {runwayLabel}
          </span>
        </div>
      </div>
    </aside>
    </>
  )
}
