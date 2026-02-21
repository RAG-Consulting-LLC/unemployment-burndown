import { useState } from 'react'
import { DEFAULTS } from './constants/defaults'
import { useBurndown } from './hooks/useBurndown'
import { useTemplates } from './hooks/useTemplates'
import Header from './components/layout/Header'
import SectionCard from './components/layout/SectionCard'
import RunwayBanner from './components/dashboard/RunwayBanner'
import BurndownChart from './components/chart/BurndownChart'
import SavingsPanel from './components/finances/SavingsPanel'
import UnemploymentPanel from './components/finances/UnemploymentPanel'
import ExpensePanel from './components/finances/ExpensePanel'
import OneTimeExpensePanel from './components/finances/OneTimeExpensePanel'
import AssetsPanel from './components/finances/AssetsPanel'
import InvestmentsPanel from './components/finances/InvestmentsPanel'
import WhatIfPanel from './components/scenarios/WhatIfPanel'
import TemplateManager from './components/templates/TemplateManager'

export default function App() {
  const [savingsAccounts, setSavingsAccounts] = useState(DEFAULTS.savingsAccounts)
  const [unemployment, setUnemployment] = useState(DEFAULTS.unemployment)
  const [expenses, setExpenses] = useState(DEFAULTS.expenses)
  const [whatIf, setWhatIf] = useState(DEFAULTS.whatIf)
  const [oneTimeExpenses, setOneTimeExpenses] = useState(DEFAULTS.oneTimeExpenses)
  const [assets, setAssets] = useState(DEFAULTS.assets)
  const [investments, setInvestments] = useState(DEFAULTS.investments)

  const {
    templates,
    activeTemplateId,
    setActiveTemplateId,
    saveNew,
    overwrite,
    rename,
    remove,
    getSnapshot,
  } = useTemplates()

  // Build a snapshot of all current state
  function buildSnapshot() {
    return { savingsAccounts, unemployment, expenses, whatIf, oneTimeExpenses, assets, investments }
  }

  // Load a snapshot into all state slices
  function applySnapshot(snapshot) {
    if (!snapshot) return
    if (snapshot.savingsAccounts) setSavingsAccounts(snapshot.savingsAccounts)
    if (snapshot.unemployment) setUnemployment(snapshot.unemployment)
    if (snapshot.expenses) setExpenses(snapshot.expenses)
    if (snapshot.whatIf) setWhatIf(snapshot.whatIf)
    if (snapshot.oneTimeExpenses) setOneTimeExpenses(snapshot.oneTimeExpenses)
    if (snapshot.assets) setAssets(snapshot.assets)
    if (snapshot.investments) setInvestments(snapshot.investments)
  }

  // Template actions
  function handleSave(id) {
    overwrite(id, buildSnapshot())
  }

  function handleSaveNew(name) {
    saveNew(name, buildSnapshot())
  }

  function handleLoad(id) {
    const snapshot = getSnapshot(id)
    applySnapshot(snapshot)
    setActiveTemplateId(id)
  }

  // Derived: total cash from all accounts
  const totalSavings = savingsAccounts.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)

  // Derived: total proceeds from assets toggled "Sell" in what-if
  const assetProceeds = assets
    .filter(a => a.includedInWhatIf)
    .reduce((sum, a) => sum + (Number(a.estimatedValue) || 0), 0)

  // Base calculation (no what-if, no asset sales)
  const baseWhatIf = { expenseReductionPct: 0, sideIncomeMonthly: 0 }
  const base = useBurndown(totalSavings, unemployment, expenses, baseWhatIf, oneTimeExpenses, 0, investments)

  // With what-if applied (including sold asset proceeds)
  const current = useBurndown(totalSavings, unemployment, expenses, whatIf, oneTimeExpenses, assetProceeds, investments)

  const hasWhatIf = whatIf.expenseReductionPct > 0 || whatIf.sideIncomeMonthly > 0 || assetProceeds > 0

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header
        rightSlot={
          <TemplateManager
            templates={templates}
            activeTemplateId={activeTemplateId}
            onLoad={handleLoad}
            onSave={handleSave}
            onSaveNew={handleSaveNew}
            onRename={rename}
            onDelete={remove}
          />
        }
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Hero banner */}
        <RunwayBanner
          runoutDate={current.runoutDate}
          totalRunwayMonths={current.totalRunwayMonths}
          currentNetBurn={current.currentNetBurn}
          savings={totalSavings}
        />

        {/* Burndown chart */}
        <SectionCard title="Balance Over Time">
          <BurndownChart
            dataPoints={current.dataPoints}
            runoutDate={current.runoutDate}
          />
          {hasWhatIf && (
            <p className="text-xs text-blue-400 mt-2 text-center">
              Chart reflects your what-if scenario adjustments
            </p>
          )}
        </SectionCard>

        {/* Two-column inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left column */}
          <div className="space-y-5">
            <SectionCard title="Cash & Savings Accounts">
              <SavingsPanel accounts={savingsAccounts} onChange={setSavingsAccounts} />
            </SectionCard>

            <SectionCard title="Unemployment Benefits">
              <UnemploymentPanel value={unemployment} onChange={setUnemployment} />
            </SectionCard>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <SectionCard title="What-If Scenarios">
              <WhatIfPanel
                value={whatIf}
                onChange={setWhatIf}
                baseRunwayMonths={base.totalRunwayMonths}
                altRunwayMonths={current.totalRunwayMonths}
                assetProceeds={assetProceeds}
              />
            </SectionCard>

            {/* Mini stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Monthly Expenses</p>
                <p className="text-xl font-bold text-white">
                  ${Math.round(current.effectiveExpenses).toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">after any reductions</p>
              </div>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">UI Income / Mo</p>
                <p className="text-xl font-bold text-emerald-400">
                  ${Math.round(current.monthlyBenefits).toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  until {(() => {
                    const d = current.benefitEnd
                    return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'
                  })()}
                </p>
              </div>
              {current.monthlyInvestments > 0 && (
                <div className="bg-gray-800 rounded-xl border border-teal-800/40 p-4 col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Active Investments / Mo</p>
                  <p className="text-xl font-bold text-teal-400">
                    -${Math.round(current.monthlyInvestments).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">added to monthly burn</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monthly expense breakdown — full width */}
        <SectionCard title="Monthly Expenses">
          <ExpensePanel expenses={expenses} onChange={setExpenses} />
        </SectionCard>

        {/* Monthly investments — full width */}
        <SectionCard title="Monthly Investments">
          <InvestmentsPanel investments={investments} onChange={setInvestments} />
        </SectionCard>

        {/* One-time expenses — full width */}
        <SectionCard title="One-Time Expenses">
          <OneTimeExpensePanel expenses={oneTimeExpenses} onChange={setOneTimeExpenses} />
        </SectionCard>

        {/* Sellable assets — full width */}
        <SectionCard title="Sellable Assets">
          <AssetsPanel assets={assets} onChange={setAssets} />
        </SectionCard>

        <p className="text-center text-xs text-gray-700 pb-4">
          Templates are saved to your browser's local storage and persist between sessions.
        </p>
      </main>
    </div>
  )
}
