import { useState } from 'react'
import { formatCurrency, formatMonths } from '../../utils/formatters'
import EmergencyFloorPanel from './EmergencyFloorPanel'
import BenefitGapPanel from './BenefitGapPanel'
import ExpenseFreezeDatePanel from './ExpenseFreezeDatePanel'
import JobOfferPanel from './JobOfferPanel'
import FreelanceRampPanel from './FreelanceRampPanel'
import ComparePanel from './ComparePanel'

const TABS = [
  { id: 'basics',    label: 'Basics',      icon: '⚙️' },
  { id: 'floor',     label: 'Cash Floor',  icon: '🛡️' },
  { id: 'benefits',  label: 'Benefit Gap', icon: '⚠️' },
  { id: 'freeze',    label: 'Freeze Date', icon: '📅' },
  { id: 'job',       label: 'Job Offer',   icon: '💼' },
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
  templates,
  currentResult,
  templateResults,
}) {
  const [activeTab, setActiveTab] = useState('basics')

  function update(field, val) {
    onChange({ ...value, [field]: val })
  }

  const delta = altRunwayMonths != null && baseRunwayMonths != null
    ? altRunwayMonths - baseRunwayMonths
    : null

  const hasChanges =
    value.expenseReductionPct > 0 ||
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
      case 'basics':    return value.expenseReductionPct > 0 || value.sideIncomeMonthly > 0 || assetProceeds > 0
      case 'floor':     return (Number(value.emergencyFloor) || 0) > 0
      case 'benefits':  return (Number(value.benefitDelayWeeks) || 0) > 0 || (Number(value.benefitCutWeeks) || 0) > 0
      case 'freeze':    return !!value.freezeDate
      case 'job':       return (Number(value.jobOfferSalary) || 0) > 0 && !!value.jobOfferStartDate
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
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-gray-300 font-medium">Cut discretionary expenses by</label>
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
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>0% (no change)</span><span>50%</span><span>100% (cut all)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-gray-300 font-medium">Part-time / freelance income</label>
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
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>$0</span><span>$2,500</span><span>$5,000</span>
            </div>
          </div>

          {assetProceeds > 0 && (
            <div className="flex items-center justify-between bg-violet-950/30 border border-violet-700/40 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm text-violet-300 font-medium">Selling assets</p>
                <p className="text-xs text-gray-500 mt-0.5">Toggle assets in the Sellable Assets section below</p>
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
            <p className="text-xs text-gray-600">
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

      {/* ── Job Offer ── */}
      {activeTab === 'job' && (
        <JobOfferPanel
          value={value}
          onChange={onChange}
          baseRunwayMonths={baseRunwayMonths}
          altRunwayMonths={altRunwayMonths}
        />
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
