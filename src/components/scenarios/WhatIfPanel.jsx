import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency, formatMonths } from '../../utils/formatters'
import EmergencyFloorPanel from './EmergencyFloorPanel'
import BenefitGapPanel from './BenefitGapPanel'
import ExpenseFreezeDatePanel from './ExpenseFreezeDatePanel'
import FreelanceRampPanel from './FreelanceRampPanel'
import ComparePanel from './ComparePanel'

const TABS = [
  { id: 'basics',    label: 'Basics',      icon: '⚙️' },
  { id: 'floor',     label: 'Cash Floor',  icon: '🛡️' },
  { id: 'benefits',  label: 'Benefit Gap', icon: '⚠️' },
  { id: 'freeze',    label: 'Freeze Date', icon: '📅' },
  { id: 'scenarios', label: 'Job Scenarios', icon: '💼' },
  { id: 'freelance', label: 'Freelance',   icon: '📈' },
  { id: 'compare',   label: 'Compare',     icon: '⚖️' },
]

export default function WhatIfPanel({
  value,
  onChange,
  onReset,
  baseRunwayMonths,
  altRunwayMonths,
  assetProceeds,
  unemployment,
  expenses,
  subscriptions,
  creditCards,
  templates,
  currentResult,
  templateResults,
  jobScenarios,
  onJobScenariosChange,
  jobScenarioResults,
}) {
  const [activeTab, setActiveTab] = useState('basics')

  function update(field, val) {
    onChange({ ...value, [field]: val })
  }

  const delta = altRunwayMonths != null && baseRunwayMonths != null
    ? altRunwayMonths - baseRunwayMonths
    : null

  // Cost of living breakdown
  const essentialTotal = (expenses || [])
    .filter(e => e.essential)
    .reduce((sum, e) => sum + (Number(e.monthlyAmount) || 0), 0)
  const nonEssentialTotal = (expenses || [])
    .filter(e => !e.essential)
    .reduce((sum, e) => sum + (Number(e.monthlyAmount) || 0), 0)
  const subsTotal = (subscriptions || [])
    .filter(s => s.active !== false)
    .reduce((sum, s) => sum + (Number(s.monthlyAmount) || 0), 0)
  const ccMinTotal = (creditCards || [])
    .reduce((sum, c) => sum + (Number(c.minimumPayment) || 0), 0)
  const totalCostOfLiving = essentialTotal + nonEssentialTotal + subsTotal + ccMinTotal

  const hasChanges =
    value.expenseReductionPct > 0 ||
    (value.expenseRaisePct || 0) > 0 ||
    value.sideIncomeMonthly > 0 ||
    assetProceeds > 0 ||
    (Number(value.emergencyFloor) || 0) > 0 ||
    (Number(value.benefitDelayWeeks) || 0) > 0 ||
    (Number(value.benefitCutWeeks) || 0) > 0 ||
    !!value.freezeDate ||
    ((Number(value.jobOfferSalary) || 0) > 0 && !!value.jobOfferStartDate) ||
    (value.freelanceRamp || []).some(t => (Number(t.monthlyAmount) || 0) > 0) ||
    (Number(value.partnerIncomeMonthly) || 0) > 0

  function tabIsActive(id) {
    switch (id) {
      case 'basics':    return value.expenseReductionPct > 0 || (value.expenseRaisePct || 0) > 0 || value.sideIncomeMonthly > 0 || assetProceeds > 0
      case 'floor':     return (Number(value.emergencyFloor) || 0) > 0
      case 'benefits':  return (Number(value.benefitDelayWeeks) || 0) > 0 || (Number(value.benefitCutWeeks) || 0) > 0
      case 'freeze':    return !!value.freezeDate
      case 'scenarios': return (jobScenarios || []).length > 0
      case 'freelance': return (value.freelanceRamp || []).some(t => (Number(t.monthlyAmount) || 0) > 0)
      default:          return false
    }
  }

  const enrichedTemplates = (templates || []).map(t => ({
    ...t,
    _burndownResult: templateResults?.[t.id] || null,
  }))

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 items-center">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tabIsActive(tab.id) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />
            )}
          </button>
        ))}
        {hasChanges && (
          <button
            onClick={onReset}
            title="Reset to last saved config"
            className="ml-auto flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-600 bg-gray-800 text-gray-400 hover:border-orange-500 hover:text-orange-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L6.053 5h6.447a5.5 5.5 0 1 1 0 11H6a.75.75 0 0 1 0-1.5h6.5a4 4 0 1 0 0-8H6.053l1.715 1.708a.75.75 0 0 1-1.06 1.061L4.197 6.757a1 1 0 0 1 0-1.414l2.511-2.511a.75.75 0 0 1 1.085.4z" clipRule="evenodd" />
            </svg>
            Reset
          </button>
        )}
      </div>

      {/* ── Basics ── */}
      {activeTab === 'basics' && (
        <div className="space-y-5">
          {/* Cost of living summary */}
          <div className="rounded-lg border p-4 space-y-2" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Estimated Monthly Cost of Living</span>
              <span className="text-lg font-bold" style={{ color: 'var(--accent-blue)' }}>
                {formatCurrency(totalCostOfLiving)}<span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/mo</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex justify-between">
                <span>Essential</span>
                <span className="font-medium">{formatCurrency(essentialTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discretionary</span>
                <span className="font-medium">{formatCurrency(nonEssentialTotal)}</span>
              </div>
              {subsTotal > 0 && (
                <div className="flex justify-between">
                  <span>Subscriptions</span>
                  <span className="font-medium">{formatCurrency(subsTotal)}</span>
                </div>
              )}
              {ccMinTotal > 0 && (
                <div className="flex justify-between">
                  <span>CC Min. Payments</span>
                  <span className="font-medium">{formatCurrency(ccMinTotal)}</span>
                </div>
              )}
            </div>
            {((value.expenseRaisePct || 0) > 0 || value.expenseReductionPct > 0) && (
              <div className="pt-1 mt-1 flex justify-between items-center text-xs" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Adjusted total</span>
                <span className="font-bold text-sm" style={{ color: (value.expenseRaisePct || 0) > value.expenseReductionPct ? 'var(--accent-red, #ef4444)' : 'var(--accent-emerald)' }}>
                  {formatCurrency(
                    essentialTotal
                    + (nonEssentialTotal * (1 - (value.expenseReductionPct || 0) / 100))
                    + subsTotal + ccMinTotal
                    + totalCostOfLiving * ((value.expenseRaisePct || 0) / 100)
                  )}/mo
                </span>
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Cut discretionary expenses by</label>
              <span className="text-blue-400 font-bold text-sm bg-blue-900/30 px-2 py-0.5 rounded">
                {value.expenseReductionPct}%
              </span>
            </div>
            <input
              type="range" min="0" max="100" step="5"
              value={value.expenseReductionPct}
              onChange={e => update('expenseReductionPct', Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
              <span>0% (no change)</span><span>50%</span><span>100% (cut all)</span>
            </div>
          </div>

          {/* Expense raise */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Expense raise (inflation / lifestyle)
              </label>
              <span className="font-bold text-sm px-2 py-0.5 rounded" style={{ color: '#f97316', background: 'rgba(249,115,22,0.12)' }}>
                +{value.expenseRaisePct || 0}%
                {(value.expenseRaisePct || 0) > 0 && (
                  <span className="font-normal text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                    (+{formatCurrency(totalCostOfLiving * (value.expenseRaisePct || 0) / 100)}/mo)
                  </span>
                )}
              </span>
            </div>
            <input
              type="range" min="0" max="50" step="1"
              value={value.expenseRaisePct || 0}
              onChange={e => update('expenseRaisePct', Number(e.target.value))}
              className="w-full cursor-pointer"
              style={{ accentColor: '#f97316' }}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
              <span>0% (no raise)</span><span>25%</span><span>50%</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Part-time / freelance income</label>
              <span className="text-emerald-400 font-bold text-sm bg-emerald-900/30 px-2 py-0.5 rounded">
                {formatCurrency(value.sideIncomeMonthly)}/mo
              </span>
            </div>
            <input
              type="range" min="0" max="5000" step="100"
              value={value.sideIncomeMonthly}
              onChange={e => update('sideIncomeMonthly', Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
              <span>$0</span><span>$2,500</span><span>$5,000</span>
            </div>
          </div>

          {assetProceeds > 0 && (
            <div className="flex items-center justify-between bg-violet-950/30 border border-violet-700/40 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm text-violet-300 font-medium">Selling assets</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>Toggle assets in the Sellable Assets section below</p>
              </div>
              <span className="text-violet-300 font-bold text-lg">{formatCurrency(assetProceeds)}</span>
            </div>
          )}

          {hasChanges && delta !== null && (
            <div className={`rounded-lg px-4 py-3 text-sm border ${
              delta > 0 ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300'
              : delta < 0 ? 'bg-red-950/40 border-red-700/40 text-red-300'
              : 'bg-gray-700/40 border-gray-600 text-gray-400'
            }`}>
              {delta > 0 ? <span>All changes extend runway by <strong>{formatMonths(delta)}</strong>.</span>
              : delta < 0 ? <span>All changes shorten runway by <strong>{formatMonths(Math.abs(delta))}</strong>.</span>
              : <span>No net change to runway.</span>}
            </div>
          )}

          {!hasChanges && (
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              Adjust sliders, toggle assets to "Sell", or explore the other scenario tabs above.
            </p>
          )}
        </div>
      )}

      {/* ── Cash Floor ── */}
      {activeTab === 'floor' && (
        <EmergencyFloorPanel
          value={value}
          onChange={onChange}
          baseRunwayMonths={baseRunwayMonths}
          altRunwayMonths={altRunwayMonths}
        />
      )}

      {/* ── Benefit Gap ── */}
      {activeTab === 'benefits' && (
        <BenefitGapPanel
          value={value}
          onChange={onChange}
          unemployment={unemployment}
          baseRunwayMonths={baseRunwayMonths}
          altRunwayMonths={altRunwayMonths}
        />
      )}

      {/* ── Freeze Date ── */}
      {activeTab === 'freeze' && (
        <ExpenseFreezeDatePanel
          value={value}
          onChange={onChange}
          baseRunwayMonths={baseRunwayMonths}
          altRunwayMonths={altRunwayMonths}
        />
      )}

      {/* ── Job Scenarios ── */}
      {activeTab === 'scenarios' && (
        <div className="text-center py-8 space-y-3">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Job scenarios have moved to their own page with enhanced charts and analysis.
          </p>
          <Link
            to="/job-scenarios"
            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-colors hover:opacity-80"
            style={{
              borderColor: 'var(--accent-blue)',
              background: 'var(--accent-blue)' + '18',
              color: 'var(--accent-blue)',
            }}
          >
            Open Job Scenarios Dashboard &rarr;
          </Link>
          {(jobScenarios || []).length > 0 && (
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              {jobScenarios.length} scenario{jobScenarios.length !== 1 ? 's' : ''} configured
            </p>
          )}
        </div>
      )}

      {/* ── Freelance Ramp ── */}
      {activeTab === 'freelance' && (
        <FreelanceRampPanel
          value={value}
          onChange={onChange}
          baseRunwayMonths={baseRunwayMonths}
          altRunwayMonths={altRunwayMonths}
        />
      )}

      {/* ── Compare ── */}
      {activeTab === 'compare' && (
        <ComparePanel
          templates={enrichedTemplates}
          currentResult={currentResult}
          currentLabel="Current"
        />
      )}
    </div>
  )
}
