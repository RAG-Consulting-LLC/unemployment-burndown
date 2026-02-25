import { useState, useMemo, useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import { DEFAULTS } from './constants/defaults'
import { useBurndown } from './hooks/useBurndown'
import { useTemplates } from './hooks/useTemplates'
import { useActivityLog } from './hooks/useActivityLog'
import Header from './components/layout/Header'
import SectionCard from './components/layout/SectionCard'
import RunwayBanner from './components/dashboard/RunwayBanner'
import BurndownChart from './components/chart/BurndownChart'
import SavingsPanel from './components/finances/SavingsPanel'
import UnemploymentPanel from './components/finances/UnemploymentPanel'
import ExpensePanel from './components/finances/ExpensePanel'
import OneTimeExpensePanel from './components/finances/OneTimeExpensePanel'
import OneTimeIncomePanel from './components/finances/OneTimeIncomePanel'
import MonthlyIncomePanel from './components/finances/MonthlyIncomePanel'
import AssetsPanel from './components/finances/AssetsPanel'
import InvestmentsPanel from './components/finances/InvestmentsPanel'
import SubscriptionsPanel from './components/finances/SubscriptionsPanel'
import CreditCardsPanel from './components/finances/CreditCardsPanel'
import WhatIfPanel from './components/scenarios/WhatIfPanel'
import TemplateManager from './components/templates/TemplateManager'
import PeopleManager from './components/people/PeopleManager'
import PresentationMode from './components/presentation/PresentationMode'
import ThemeToggle from './components/layout/ThemeToggle'
import TableOfContents from './components/layout/TableOfContents'
import ViewMenu from './components/layout/ViewMenu'
import CloudSaveStatus from './components/layout/CloudSaveStatus'
import ActivityLogPanel from './components/layout/ActivityLogPanel'
import FinancialSidebar from './components/layout/FinancialSidebar'
import { useS3Storage } from './hooks/useS3Storage'

// ---------------------------------------------------------------------------
// Pure burndown computation (mirrors useBurndown logic without React hooks).
// Used inside useMemo to compute template results for the Compare tab.
// ---------------------------------------------------------------------------
function computeBurndown(savings, unemployment, expenses, whatIf, oneTimeExpenses, extraCash, investments, oneTimeIncome = [], monthlyIncome = [], startDate = null) {
  const today = dayjs(startDate || new Date())

  const rawBenefitStart = dayjs(unemployment.startDate)
  const delayWeeks = Number(whatIf.benefitDelayWeeks) || 0
  const cutWeeks   = Number(whatIf.benefitCutWeeks)   || 0
  const benefitStart = rawBenefitStart.add(delayWeeks, 'week')
  const baseDuration = Math.max(0, unemployment.durationWeeks - cutWeeks)
  const benefitEnd   = benefitStart.add(baseDuration, 'week')
  const monthlyBenefits = unemployment.weeklyAmount * (52 / 12)

  const essentialTotal    = expenses.filter(e => e.essential).reduce((s, e)  => s + (Number(e.monthlyAmount) || 0), 0)
  const nonEssentialTotal = expenses.filter(e => !e.essential).reduce((s, e) => s + (Number(e.monthlyAmount) || 0), 0)
  const reductionFactor   = 1 - (whatIf.expenseReductionPct || 0) / 100
  const effectiveExpenses = essentialTotal + nonEssentialTotal * reductionFactor

  const sideIncome         = Number(whatIf.sideIncomeMonthly) || 0
  const monthlyInvestments = investments.filter(inv => inv.active).reduce((s, inv) => s + (Number(inv.monthlyAmount) || 0), 0)
  const emergencyFloor     = Number(whatIf.emergencyFloor) || 0
  const freezeDate         = whatIf.freezeDate ? dayjs(whatIf.freezeDate) : null
  const jobSalary          = Number(whatIf.jobOfferSalary) || 0
  const jobStartDate       = whatIf.jobOfferStartDate ? dayjs(whatIf.jobOfferStartDate) : null
  const partnerIncome      = Number(whatIf.partnerIncomeMonthly) || 0
  const partnerStartDate   = whatIf.partnerStartDate ? dayjs(whatIf.partnerStartDate) : null
  const freelanceRamp      = Array.isArray(whatIf.freelanceRamp) ? whatIf.freelanceRamp : []

  const oneTimeByMonth = {}
  for (const ote of (oneTimeExpenses || [])) {
    if (!ote.date || !ote.amount) continue
    const oteDate = dayjs(ote.date)
    if (oteDate.isBefore(today)) continue
    const slot = Math.max(1, oteDate.diff(today, 'month') + 1)
    oneTimeByMonth[slot] = (oneTimeByMonth[slot] || 0) + (Number(ote.amount) || 0)
  }

  const oneTimeIncomeByMonth = {}
  for (const oti of (oneTimeIncome || [])) {
    if (!oti.date || !oti.amount) continue
    const otiDate = dayjs(oti.date)
    if (otiDate.isBefore(today)) continue
    const slot = Math.max(1, otiDate.diff(today, 'month') + 1)
    oneTimeIncomeByMonth[slot] = (oneTimeIncomeByMonth[slot] || 0) + (Number(oti.amount) || 0)
  }

  const MAX_MONTHS = 120
  let balance = (Number(savings) || 0) + (Number(extraCash) || 0)
  const dataPoints = [{
    date: today.toDate(), dateLabel: today.format('MMM YYYY'),
    balance: Math.round(Math.max(0, balance - emergencyFloor)),
    rawBalance: Math.round(balance), month: 0,
  }]

  let runoutDate = null, runoutMonth = null

  for (let i = 1; i <= MAX_MONTHS; i++) {
    const currentDate = today.add(i, 'month')
    const inBenefitWindow = currentDate.isAfter(benefitStart) && currentDate.isBefore(benefitEnd)
    let income = inBenefitWindow ? monthlyBenefits : 0
    const jobActive = jobStartDate && !currentDate.isBefore(jobStartDate)
    if (!jobActive) income += sideIncome
    if (jobActive) income += jobSalary
    const partnerActive = partnerStartDate && !currentDate.isBefore(partnerStartDate)
    if (partnerActive) income += partnerIncome
    for (const src of monthlyIncome) {
      if (!src.monthlyAmount) continue
      if (src.startDate && dayjs(src.startDate).isAfter(currentDate)) continue
      if (src.endDate && dayjs(src.endDate).isBefore(currentDate)) continue
      income += Number(src.monthlyAmount) || 0
    }
    if (freelanceRamp.length > 0) {
      const activeTier = [...freelanceRamp].filter(t => t.monthOffset <= i).sort((a, b) => b.monthOffset - a.monthOffset)[0]
      if (activeTier) income += Number(activeTier.monthlyAmount) || 0
    }
    const afterFreeze = freezeDate ? !currentDate.isBefore(freezeDate) : true
    const expReductionFactor = afterFreeze ? reductionFactor : 1
    const monthExpenses = essentialTotal + nonEssentialTotal * expReductionFactor
    const oneTimeCost = oneTimeByMonth[i] || 0
    const oneTimeIncomeThisMonth = oneTimeIncomeByMonth[i] || 0
    const netBurn = monthExpenses + monthlyInvestments - income + oneTimeCost - oneTimeIncomeThisMonth
    const prevBalance = balance
    balance = balance - netBurn
    const effectiveBalance = balance - emergencyFloor
    const prevEffective = prevBalance - emergencyFloor
    if (effectiveBalance <= 0 && runoutDate === null) {
      const safeDenom = netBurn === 0 ? 1 : netBurn
      const fraction = Math.min(1, Math.max(0, prevEffective / safeDenom))
      const crossoverDate = today.add(i - 1 + fraction, 'month')
      runoutDate = crossoverDate.toDate()
      runoutMonth = i - 1 + fraction
    }
    dataPoints.push({
      date: currentDate.toDate(), dateLabel: currentDate.format('MMM YYYY'),
      balance: Math.max(0, Math.round(effectiveBalance)),
      rawBalance: Math.round(balance), month: i,
      oneTimeCost: oneTimeCost > 0 ? Math.round(oneTimeCost) : undefined,
    })
    if (effectiveBalance <= 0 && i >= (runoutMonth || 0) + 3) break
  }

  const currentInBenefit = today.isAfter(benefitStart) && today.isBefore(benefitEnd)
  const currentNetBurn = effectiveExpenses + monthlyInvestments - ((currentInBenefit ? monthlyBenefits : 0) + sideIncome)

  return {
    dataPoints, runoutDate, totalRunwayMonths: runoutMonth,
    currentNetBurn, effectiveExpenses, monthlyBenefits, monthlyInvestments,
    benefitEnd: benefitEnd.toDate(),
  }
}

// ---------------------------------------------------------------------------

const DEFAULT_VIEW = {
  chartLines: { allExpenses: true, essentialsOnly: true, baseline: true },
  sections: {
    household:     true,
    whatif:        true,
    subscriptions: true,
    creditCards:   true,
    investments:   true,
    onetimes:      true,
    onetimeIncome:   true,
    monthlyIncome:   true,
    assets:          true,
  },
}

export default function App() {
  const [presentationMode, setPresentationMode] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [viewSettings, setViewSettings] = useState(DEFAULT_VIEW)
  const [furloughDate, setFurloughDate] = useState(DEFAULTS.furloughDate)
  const [people, setPeople] = useState(DEFAULTS.people)
  const [savingsAccounts, setSavingsAccounts] = useState(DEFAULTS.savingsAccounts)
  const [unemployment, setUnemployment] = useState(DEFAULTS.unemployment)
  const [expenses, setExpenses] = useState(DEFAULTS.expenses)
  const [whatIf, setWhatIf] = useState(DEFAULTS.whatIf)
  const [oneTimeExpenses, setOneTimeExpenses] = useState(DEFAULTS.oneTimeExpenses)
  const [assets, setAssets] = useState(DEFAULTS.assets)
  const [investments, setInvestments] = useState(DEFAULTS.investments)
  const [subscriptions, setSubscriptions] = useState(DEFAULTS.subscriptions)
  const [creditCards, setCreditCards] = useState(DEFAULTS.creditCards)
  const [oneTimeIncome, setOneTimeIncome] = useState(DEFAULTS.oneTimeIncome)
  const [monthlyIncome, setMonthlyIncome] = useState(DEFAULTS.monthlyIncome)

  const {
    templates,
    activeTemplateId,
    setActiveTemplateId,
    saveNew,
    overwrite,
    rename,
    remove,
    getSnapshot,
    duplicate,
    bulkLoad,
  } = useTemplates()

  const { entries: logEntries, addEntry, clearLog, userName, setUserName } = useActivityLog()
  const dirtySections = useRef(new Set())

  const s3Storage = useS3Storage()

  function buildSnapshot() {
    return { furloughDate, people, savingsAccounts, unemployment, expenses, whatIf, oneTimeExpenses, oneTimeIncome, monthlyIncome, assets, investments, subscriptions, creditCards }
  }

  function applySnapshot(snapshot) {
    if (!snapshot) return
    if (snapshot.furloughDate) setFurloughDate(snapshot.furloughDate)
    if (snapshot.people) setPeople(snapshot.people)
    if (snapshot.savingsAccounts) setSavingsAccounts(snapshot.savingsAccounts)
    if (snapshot.unemployment) setUnemployment(snapshot.unemployment)
    if (snapshot.expenses) setExpenses(snapshot.expenses)
    // Merge snapshot whatIf with DEFAULTS so new fields always exist
    if (snapshot.whatIf) setWhatIf({ ...DEFAULTS.whatIf, ...snapshot.whatIf })
    if (snapshot.oneTimeExpenses) setOneTimeExpenses(snapshot.oneTimeExpenses)
    if (snapshot.oneTimeIncome) setOneTimeIncome(snapshot.oneTimeIncome)
    if (snapshot.monthlyIncome) setMonthlyIncome(snapshot.monthlyIncome)
    if (snapshot.assets) setAssets(snapshot.assets)
    if (snapshot.investments) setInvestments(snapshot.investments)
    if (snapshot.subscriptions) setSubscriptions(snapshot.subscriptions)
    if (snapshot.creditCards) setCreditCards(snapshot.creditCards)
  }

  // Full state = live snapshot + saved templates (written to / read from file)
  function buildFullState() {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      state: buildSnapshot(),
      templates,
      activeTemplateId,
    }
  }

  function applyFullState(data) {
    if (!data) return
    if (data.state) applySnapshot(data.state)
    if (Array.isArray(data.templates)) bulkLoad(data.templates)
    if (data.activeTemplateId != null) setActiveTemplateId(data.activeTemplateId)
  }

  // When S3 storage loads data on mount, apply it
  useEffect(() => {
    if (s3Storage.restoreData) {
      applyFullState(s3Storage.restoreData)
      s3Storage.clearRestoreData()
      addEntry('load', 'Data loaded from cloud')
    }
  }, [s3Storage.restoreData]) // eslint-disable-line

  // Auto-save to S3 on every state change (debounced 1.5 s)
  const autoSaveTimer = useRef(null)
  useEffect(() => {
    if (s3Storage.status === 'loading') return
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      s3Storage.save(buildFullState())
      if (dirtySections.current.size > 0) {
        addEntry('save', `Auto-saved: ${[...dirtySections.current].join(', ')}`)
        dirtySections.current.clear()
      }
    }, 1500)
    return () => clearTimeout(autoSaveTimer.current)
  }, [furloughDate, people, savingsAccounts, unemployment, expenses, whatIf, oneTimeExpenses, oneTimeIncome, monthlyIncome, assets, investments, subscriptions, creditCards, templates]) // eslint-disable-line

  function handleSave(id)      { overwrite(id, buildSnapshot()); addEntry('save', `Template "${templates.find(t => t.id === id)?.name || id}" overwritten`) }
  function handleSaveNew(name) { saveNew(name, buildSnapshot()); addEntry('save', `New template "${name}" saved`) }
  function handleLoad(id) {
    const snapshot = getSnapshot(id)
    applySnapshot(snapshot)
    setActiveTemplateId(id)
    addEntry('load', `Template "${templates.find(t => t.id === id)?.name || id}" loaded`)
  }

  // Tracked change handlers — mark sections dirty so auto-save can log what changed
  function track(setter, label) {
    return (v) => { setter(v); dirtySections.current.add(label) }
  }
  const onSavingsChange      = track(setSavingsAccounts, 'Cash & savings')
  const onExpensesChange     = track(setExpenses,        'Monthly expenses')
  const onUnemploymentChange = track(setUnemployment,    'Unemployment')
  const onFurloughChange     = track(setFurloughDate,    'Furlough date')
  const onPeopleChange       = track(setPeople,          'People')
  const onWhatIfChange       = track(setWhatIf,          'What-if scenarios')
  const onOneTimeExpChange   = track(setOneTimeExpenses, 'One-time expenses')
  const onOneTimeIncChange   = track(setOneTimeIncome,   'One-time income')
  const onMonthlyIncChange   = track(setMonthlyIncome,   'Monthly income')
  const onAssetsChange       = track(setAssets,          'Assets')
  const onInvestmentsChange  = track(setInvestments,     'Investments')
  const onSubsChange         = track(setSubscriptions,   'Subscriptions')
  const onCreditCardsChange  = track(setCreditCards,     'Credit cards')

  // Derived: total cash from all active accounts
  const totalSavings = savingsAccounts
    .filter(a => a.active !== false)
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0)

  // Derived: total proceeds from assets toggled "Sell" in what-if
  const assetProceeds = assets
    .filter(a => a.includedInWhatIf)
    .reduce((sum, a) => sum + (Number(a.estimatedValue) || 0), 0)

  // Merge active subscriptions + credit card minimum payments into expenses
  const expensesWithSubs = [
    ...expenses,
    ...subscriptions
      .filter(s => s.active !== false)
      .map(s => ({ id: `sub_${s.id}`, category: s.name, monthlyAmount: s.monthlyAmount, essential: false })),
    ...creditCards
      .filter(c => (Number(c.minimumPayment) || 0) > 0)
      .map(c => ({ id: `cc_${c.id}`, category: `${c.name} (min. payment)`, monthlyAmount: c.minimumPayment, essential: true })),
  ]

  // Base calculation (no what-if, no asset sales) — used for delta display
  const baseWhatIf = { ...DEFAULTS.whatIf }
  const base = useBurndown(totalSavings, unemployment, expensesWithSubs, baseWhatIf, oneTimeExpenses, 0, investments, oneTimeIncome, monthlyIncome, furloughDate)

  // With all what-if scenarios applied
  const current = useBurndown(totalSavings, unemployment, expensesWithSubs, whatIf, oneTimeExpenses, assetProceeds, investments, oneTimeIncome, monthlyIncome, furloughDate)

  // Pre-compute burndown results for every saved template (for Compare tab)
  const templateResults = useMemo(() => {
    const results = {}
    for (const t of templates) {
      const s = t.snapshot
      if (!s) continue
      const tSavings = (s.savingsAccounts || [])
        .filter(a => a.active !== false)
        .reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
      const tAssetProceeds = (s.assets || [])
        .filter(a => a.includedInWhatIf)
        .reduce((sum, a) => sum + (Number(a.estimatedValue) || 0), 0)
      const tExpenses = [
        ...(s.expenses || []),
        ...(s.subscriptions || [])
          .filter(sub => sub.active !== false)
          .map(sub => ({ id: `sub_${sub.id}`, category: sub.name, monthlyAmount: sub.monthlyAmount, essential: false })),
        ...(s.creditCards || [])
          .filter(c => (Number(c.minimumPayment) || 0) > 0)
          .map(c => ({ id: `cc_${c.id}`, category: `${c.name} (min. payment)`, monthlyAmount: c.minimumPayment, essential: true })),
      ]
      const tWhatIf      = { ...DEFAULTS.whatIf, ...(s.whatIf || {}) }
      const tUnemployment = s.unemployment || DEFAULTS.unemployment
      const tInvestments  = s.investments  || []
      const tOneTime      = s.oneTimeExpenses || []
      const tOneTimeIncome = s.oneTimeIncome || []
      const tMonthlyIncome = s.monthlyIncome || []
      const tFurloughDate = s.furloughDate || DEFAULTS.furloughDate
      results[t.id] = computeBurndown(tSavings, tUnemployment, tExpenses, tWhatIf, tOneTime, tAssetProceeds, tInvestments, tOneTimeIncome, tMonthlyIncome, tFurloughDate)
    }
    return results
  }, [templates])

  const hasWhatIf =
    whatIf.expenseReductionPct > 0 ||
    whatIf.sideIncomeMonthly > 0 ||
    assetProceeds > 0 ||
    (Number(whatIf.emergencyFloor) || 0) > 0 ||
    (Number(whatIf.benefitDelayWeeks) || 0) > 0 ||
    (Number(whatIf.benefitCutWeeks) || 0) > 0 ||
    !!whatIf.freezeDate ||
    ((Number(whatIf.jobOfferSalary) || 0) > 0 && !!whatIf.jobOfferStartDate) ||
    (whatIf.freelanceRamp || []).some(t => (Number(t.monthlyAmount) || 0) > 0) ||
    ((Number(whatIf.partnerIncomeMonthly) || 0) > 0 && !!whatIf.partnerStartDate)

  return (
    <div className="min-h-screen theme-page" style={{ color: 'var(--text-primary)' }}>
      {/* Presentation overlay — rendered outside main layout so it fills the viewport */}
      {presentationMode && (
        <PresentationMode
          onClose={() => setPresentationMode(false)}
          current={current}
          base={base}
          totalSavings={totalSavings}
          assetProceeds={assetProceeds}
          hasWhatIf={hasWhatIf}
          expenses={expenses}
          subscriptions={subscriptions}
          investments={investments}
          oneTimeExpenses={oneTimeExpenses}
          assets={assets}
          unemployment={unemployment}
          whatIf={whatIf}
        />
      )}

      {/* Activity log panel */}
      {logOpen && (
        <ActivityLogPanel
          entries={logEntries}
          onClose={() => setLogOpen(false)}
          onClear={clearLog}
          userName={userName}
          onSetUserName={setUserName}
        />
      )}

      <Header
        lastSaved={s3Storage.lastSaved}
        savedBy={userName}
        rightSlot={
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <CloudSaveStatus storage={s3Storage} />
            {/* Activity log button */}
            <button
              onClick={() => setLogOpen(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
              title="View activity log"
              style={{
                borderColor: 'var(--border-subtle)',
                background: 'var(--bg-input)',
                color: 'var(--text-muted)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" strokeLinecap="round" />
              </svg>
              <span className="hidden sm:inline">Log</span>
              {logEntries.length > 0 && (
                <span
                  className="text-xs font-semibold px-1 rounded-full tabular-nums"
                  style={{ background: 'var(--accent-blue)', color: '#fff', fontSize: '10px', lineHeight: '16px', minWidth: 16, textAlign: 'center' }}
                >
                  {logEntries.length > 99 ? '99+' : logEntries.length}
                </span>
              )}
            </button>
            <ViewMenu value={viewSettings} onChange={setViewSettings} />
            <button
              onClick={() => setPresentationMode(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-blue-700/60 bg-blue-900/20 text-blue-300 hover:bg-blue-800/40 hover:border-blue-600 transition-colors"
              title="Open presentation mode"
            >
              <span>📊</span>
              <span>Present</span>
            </button>
            <TemplateManager
              templates={templates}
              activeTemplateId={activeTemplateId}
              onLoad={handleLoad}
              onSave={handleSave}
              onSaveNew={handleSaveNew}
              onRename={rename}
              onDelete={remove}
              onDuplicate={duplicate}
            />
          </div>
        }
      />

      <TableOfContents visibleSections={viewSettings.sections} />

      <FinancialSidebar
        totalSavings={totalSavings}
        assetProceeds={assetProceeds}
        effectiveExpenses={current.effectiveExpenses}
        monthlyBenefits={current.monthlyBenefits}
        monthlyInvestments={current.monthlyInvestments}
        currentNetBurn={current.currentNetBurn}
        totalRunwayMonths={current.totalRunwayMonths}
        benefitEnd={current.benefitEnd}
        savingsAccounts={savingsAccounts}
        expenses={expenses}
        subscriptions={subscriptions}
        creditCards={creditCards}
        investments={investments}
        oneTimeExpenses={oneTimeExpenses}
        oneTimeIncome={oneTimeIncome}
        monthlyIncome={monthlyIncome}
        unemployment={unemployment}
      />

      <main className="max-w-5xl mx-auto px-4 py-6 pb-20 xl:pb-6 space-y-5">

        {/* Hero banner */}
        <div id="sec-runway" className="scroll-mt-20">
          <RunwayBanner
            runoutDate={current.runoutDate}
            totalRunwayMonths={current.totalRunwayMonths}
            currentNetBurn={current.currentNetBurn}
            savings={totalSavings}
          />
        </div>

        {/* Burndown chart */}
        <SectionCard id="sec-chart" title="Balance Over Time" className="scroll-mt-20">
          <BurndownChart
            dataPoints={current.dataPoints}
            runoutDate={current.runoutDate}
            baseDataPoints={hasWhatIf ? base.dataPoints : null}
            benefitStart={current.benefitStart}
            benefitEnd={current.benefitEnd}
            emergencyFloor={current.emergencyFloor}
            showEssentials={viewSettings.chartLines.essentialsOnly}
            showBaseline={viewSettings.chartLines.baseline}
          />
        </SectionCard>

        {/* People / Household */}
        {viewSettings.sections.household && (
          <SectionCard id="sec-household" title="Household / People" className="scroll-mt-20">
            <PeopleManager people={people} onChange={onPeopleChange} />
          </SectionCard>
        )}

        {/* Two-column inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left column */}
          <div className="space-y-5">
            <SectionCard id="sec-savings" title="Cash & Savings Accounts" className="scroll-mt-20">
              <SavingsPanel accounts={savingsAccounts} onChange={onSavingsChange} people={people} />
            </SectionCard>

            <SectionCard id="sec-unemployment" title="Unemployment Benefits" className="scroll-mt-20">
              <UnemploymentPanel value={unemployment} onChange={onUnemploymentChange} furloughDate={furloughDate} onFurloughDateChange={onFurloughChange} people={people} />
            </SectionCard>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {viewSettings.sections.whatif && (
              <SectionCard id="sec-whatif" title="What-If Scenarios" className="scroll-mt-20">
                <WhatIfPanel
                  value={whatIf}
                  onChange={onWhatIfChange}
                  onReset={() => {
                    const snap = activeTemplateId ? getSnapshot(activeTemplateId) : null
                    setWhatIf(snap?.whatIf ? { ...DEFAULTS.whatIf, ...snap.whatIf } : DEFAULTS.whatIf)
                  }}
                  baseRunwayMonths={base.totalRunwayMonths}
                  altRunwayMonths={current.totalRunwayMonths}
                  assetProceeds={assetProceeds}
                  unemployment={unemployment}
                  templates={templates}
                  currentResult={current}
                  templateResults={templateResults}
                />
              </SectionCard>
            )}

            {/* Mini stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="theme-card rounded-xl border p-4">
                <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">Monthly Expenses</p>
                <p className="text-xl font-bold text-primary">
                  ${Math.round(current.effectiveExpenses).toLocaleString()}
                </p>
                <p className="text-xs text-faint mt-0.5">after any reductions</p>
              </div>
              <div className="theme-card rounded-xl border p-4">
                <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">UI Income / Mo</p>
                <p className="text-xl font-bold" style={{ color: 'var(--accent-emerald)' }}>
                  ${Math.round(current.monthlyBenefits).toLocaleString()}
                </p>
                <p className="text-xs text-faint mt-0.5">
                  until {(() => {
                    const d = current.benefitEnd
                    return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'
                  })()}
                </p>
              </div>
              {current.monthlyInvestments > 0 && (
                <div className="theme-card rounded-xl border p-4 col-span-2">
                  <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">Active Investments / Mo</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--accent-teal)' }}>
                    -${Math.round(current.monthlyInvestments).toLocaleString()}
                  </p>
                  <p className="text-xs text-faint mt-0.5">added to monthly burn</p>
                </div>
              )}
              {current.totalMonthlyIncome > 0 && (
                <div className="theme-card rounded-xl border p-4 col-span-2">
                  <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">Monthly Income / Mo</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--accent-emerald)' }}>
                    +${Math.round(current.totalMonthlyIncome).toLocaleString()}
                  </p>
                  <p className="text-xs text-faint mt-0.5">reduces monthly burn</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subscriptions — full width */}
        {viewSettings.sections.subscriptions && (
          <SectionCard id="sec-subscriptions" title="Subscriptions" className="scroll-mt-20">
            <SubscriptionsPanel subscriptions={subscriptions} onChange={onSubsChange} people={people} />
          </SectionCard>
        )}

        {/* Credit cards / outstanding debt — full width */}
        {viewSettings.sections.creditCards && (
          <SectionCard id="sec-creditcards" title="Credit Cards / Outstanding Debt" className="scroll-mt-20">
            <CreditCardsPanel cards={creditCards} onChange={onCreditCardsChange} people={people} />
          </SectionCard>
        )}

        {/* Monthly expense breakdown — full width */}
        <SectionCard id="sec-expenses" title="Monthly Expenses" className="scroll-mt-20">
          <ExpensePanel expenses={expenses} onChange={onExpensesChange} people={people} />
        </SectionCard>

        {/* Monthly investments — full width */}
        {viewSettings.sections.investments && (
          <SectionCard id="sec-investments" title="Monthly Investments" className="scroll-mt-20">
            <InvestmentsPanel investments={investments} onChange={onInvestmentsChange} people={people} />
          </SectionCard>
        )}

        {/* One-time expenses — full width */}
        {viewSettings.sections.onetimes && (
          <SectionCard id="sec-onetimes" title="One-Time Expenses" className="scroll-mt-20">
            <OneTimeExpensePanel expenses={oneTimeExpenses} onChange={onOneTimeExpChange} people={people} />
          </SectionCard>
        )}

        {/* One-time income injections — full width */}
        {viewSettings.sections.onetimeIncome && (
          <SectionCard id="sec-onetimeincome" title="One-Time Income Injections" className="scroll-mt-20">
            <OneTimeIncomePanel items={oneTimeIncome} onChange={onOneTimeIncChange} people={people} />
          </SectionCard>
        )}

        {/* Monthly income — full width */}
        {viewSettings.sections.monthlyIncome && (
          <SectionCard id="sec-monthlyincome" title="Monthly Income" className="scroll-mt-20">
            <MonthlyIncomePanel items={monthlyIncome} onChange={onMonthlyIncChange} people={people} />
          </SectionCard>
        )}

        {/* Sellable assets — full width */}
        {viewSettings.sections.assets && (
          <SectionCard id="sec-assets" title="Sellable Assets" className="scroll-mt-20">
            <AssetsPanel assets={assets} onChange={onAssetsChange} people={people} />
          </SectionCard>
        )}

        <p className="text-center text-xs text-faint pb-4">
          Templates are saved to your browser's local storage and persist between sessions.
        </p>
      </main>
    </div>
  )
}
