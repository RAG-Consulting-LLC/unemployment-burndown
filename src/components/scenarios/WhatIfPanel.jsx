import { useState } from 'react'
import { formatCurrency, formatMonths } from '../../utils/formatters'
import dayjs from 'dayjs'
import EmergencyFloorPanel from './EmergencyFloorPanel'
import BenefitGapPanel from './BenefitGapPanel'
import ExpenseFreezeDatePanel from './ExpenseFreezeDatePanel'
import JobOfferPanel from './JobOfferPanel'
import FreelanceRampPanel from './FreelanceRampPanel'
import ComparePanel from './ComparePanel'

/* ── Chevron icon ── */
function Chevron({ open }) {
  return (
    <svg
      className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

/* ── Scenario row wrapper (accordion) ── */
function ScenarioRow({ id, icon, label, color, summary, delta, isActive, isOpen, onToggle, children }) {
  const deltaColor = delta > 0
    ? 'text-emerald-400'
    : delta < 0
    ? 'text-red-400'
    : 'text-gray-500'

  const borderAccent = isActive
    ? `border-l-2 ${color}`
    : 'border-l-2 border-l-transparent'

  return (
    <div className={`rounded-lg border border-gray-700/60 overflow-hidden transition-colors ${isOpen ? 'bg-gray-800/40' : 'bg-gray-800/20 hover:bg-gray-800/40'}`}>
      {/* Summary row — always visible */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${borderAccent}`}
      >
        <Chevron open={isOpen} />
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-medium text-gray-300 min-w-0">{label}</span>

        {/* Status summary */}
        <span className="ml-auto flex items-center gap-2 min-w-0">
          {isActive ? (
            <>
              <span className="text-xs text-gray-400 truncate max-w-[180px]">{summary}</span>
              {delta !== null && delta !== 0 && (
                <span className={`text-xs font-bold whitespace-nowrap ${deltaColor}`}>
                  {delta > 0 ? '+' : ''}{formatMonths(Math.abs(delta))}
                </span>
              )}
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            </>
          ) : (
            <span className="text-xs text-gray-600 italic">not set</span>
          )}
        </span>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-700/40">
          {children}
        </div>
      )}
    </div>
  )
}

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
  const [openId, setOpenId] = useState(null)

  function toggle(id) {
    setOpenId(prev => prev === id ? null : id)
  }

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

  // Scenario activity checks & summaries
  const basicsActive = value.expenseReductionPct > 0 || value.sideIncomeMonthly > 0 || assetProceeds > 0
  const basicsSummary = [
    value.expenseReductionPct > 0 && `-${value.expenseReductionPct}%`,
    value.sideIncomeMonthly > 0 && `+${formatCurrency(value.sideIncomeMonthly)}/mo`,
    assetProceeds > 0 && `+${formatCurrency(assetProceeds)} assets`,
  ].filter(Boolean).join(', ')

  const floorVal = Number(value.emergencyFloor) || 0
  const floorActive = floorVal > 0
  const floorSummary = formatCurrency(floorVal) + ' reserve'

  const delayWeeks = Number(value.benefitDelayWeeks) || 0
  const cutWeeks = Number(value.benefitCutWeeks) || 0
  const benefitsActive = delayWeeks > 0 || cutWeeks > 0
  const benefitsSummary = [
    delayWeeks > 0 && `${delayWeeks}wk delay`,
    cutWeeks > 0 && `${cutWeeks}wk cut`,
  ].filter(Boolean).join(', ')

  const freezeActive = !!value.freezeDate && value.expenseReductionPct > 0
  const freezeSummary = value.freezeDate
    ? `until ${dayjs(value.freezeDate).format('MMM D')}`
    : ''

  const jobSalary = Number(value.jobOfferSalary) || 0
  const jobActive = jobSalary > 0 && !!value.jobOfferStartDate
  const jobSummary = jobActive
    ? `${formatCurrency(jobSalary)}/mo from ${dayjs(value.jobOfferStartDate).format('MMM \'YY')}`
    : ''

  const ramp = value.freelanceRamp || []
  const freelanceActive = ramp.some(t => (Number(t.monthlyAmount) || 0) > 0)
  const freelanceSummary = freelanceActive
    ? `${ramp.filter(t => t.monthlyAmount > 0).length} phases, up to ${formatCurrency(Math.max(...ramp.map(t => t.monthlyAmount || 0)))}/mo`
    : ''

  const enrichedTemplates = (templates || []).map(t => ({
    ...t,
    _burndownResult: templateResults?.[t.id] || null,
  }))

  return (
    <div className="space-y-2">
      {/* Overall impact bar */}
      {hasChanges && delta !== null && (
        <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs border ${
          delta > 0 ? 'bg-emerald-950/30 border-emerald-700/30 text-emerald-300'
          : delta < 0 ? 'bg-red-950/30 border-red-700/30 text-red-300'
          : 'bg-gray-700/30 border-gray-600 text-gray-400'
        }`}>
          <span>
            {delta > 0 ? 'Scenarios extend runway by' : delta < 0 ? 'Scenarios shorten runway by' : 'No net runway change'}
          </span>
          {delta !== 0 && (
            <span className="font-bold text-sm">{delta > 0 ? '+' : ''}{formatMonths(Math.abs(delta))}</span>
          )}
        </div>
      )}

      {/* Accordion rows */}
      <ScenarioRow
        id="basics" icon="⚙️" label="Basics" color="border-l-blue-500"
        isActive={basicsActive} summary={basicsSummary} delta={basicsActive ? delta : null}
        isOpen={openId === 'basics'} onToggle={() => toggle('basics')}
      >
        <div className="space-y-3 pt-2">
          {/* Expense cut - compact inline */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-xs text-gray-400">Cut expenses</label>
              <input
                type="range" min="0" max="100" step="5"
                value={value.expenseReductionPct}
                onChange={e => update('expenseReductionPct', Number(e.target.value))}
                className="flex-1 h-1.5 accent-blue-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded min-w-[3rem] text-center">
                {value.expenseReductionPct}%
              </span>
            </div>
          </div>

          {/* Side income - compact inline */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-xs text-gray-400">Side income</label>
              <input
                type="range" min="0" max="5000" step="100"
                value={value.sideIncomeMonthly}
                onChange={e => update('sideIncomeMonthly', Number(e.target.value))}
                className="flex-1 h-1.5 accent-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-emerald-400 bg-emerald-900/30 px-1.5 py-0.5 rounded min-w-[3rem] text-center">
                {formatCurrency(value.sideIncomeMonthly)}
              </span>
            </div>
          </div>

          {assetProceeds > 0 && (
            <div className="flex items-center justify-between bg-violet-950/20 border border-violet-700/30 rounded px-2.5 py-1.5 text-xs">
              <span className="text-violet-300">Selling assets</span>
              <span className="text-violet-300 font-bold">{formatCurrency(assetProceeds)}</span>
            </div>
          )}
        </div>
      </ScenarioRow>

      <ScenarioRow
        id="floor" icon="🛡️" label="Cash Floor" color="border-l-amber-500"
        isActive={floorActive} summary={floorSummary} delta={floorActive ? delta : null}
        isOpen={openId === 'floor'} onToggle={() => toggle('floor')}
      >
        <EmergencyFloorPanel
          value={value}
          onChange={onChange}
          baseRunwayMonths={baseRunwayMonths}
          altRunwayMonths={altRunwayMonths}
        />
      </ScenarioRow>

      <ScenarioRow
        id="benefits" icon="⚠️" label="Benefit Gap" color="border-l-rose-500"
        isActive={benefitsActive} summary={benefitsSummary} delta={benefitsActive ? delta : null}
        isOpen={openId === 'benefits'} onToggle={() => toggle('benefits')}
      >
        <BenefitGapPanel
          value={value}
          onChange={onChange}
          unemployment={unemployment}
          baseRunwayMonths={baseRunwayMonths}
          altRunwayMonths={altRunwayMonths}
        />
      </ScenarioRow>

      <ScenarioRow
        id="freeze" icon="📅" label="Freeze Date" color="border-l-blue-400"
        isActive={freezeActive} summary={freezeSummary} delta={freezeActive ? delta : null}
        isOpen={openId === 'freeze'} onToggle={() => toggle('freeze')}
      >
        <ExpenseFreezeDatePanel
          value={value}
          onChange={onChange}
          baseRunwayMonths={baseRunwayMonths}
          altRunwayMonths={altRunwayMonths}
        />
      </ScenarioRow>

      <ScenarioRow
        id="job" icon="💼" label="Job Offer" color="border-l-emerald-500"
        isActive={jobActive} summary={jobSummary} delta={jobActive ? delta : null}
        isOpen={openId === 'job'} onToggle={() => toggle('job')}
      >
        <JobOfferPanel
          value={value}
          onChange={onChange}
          baseRunwayMonths={baseRunwayMonths}
          altRunwayMonths={altRunwayMonths}
        />
      </ScenarioRow>

      <ScenarioRow
        id="freelance" icon="📈" label="Freelance" color="border-l-teal-500"
        isActive={freelanceActive} summary={freelanceSummary} delta={freelanceActive ? delta : null}
        isOpen={openId === 'freelance'} onToggle={() => toggle('freelance')}
      >
        <FreelanceRampPanel
          value={value}
          onChange={onChange}
          baseRunwayMonths={baseRunwayMonths}
          altRunwayMonths={altRunwayMonths}
        />
      </ScenarioRow>

      <ScenarioRow
        id="compare" icon="⚖️" label="Compare" color="border-l-purple-500"
        isActive={false} summary="" delta={null}
        isOpen={openId === 'compare'} onToggle={() => toggle('compare')}
      >
        <ComparePanel
          templates={enrichedTemplates}
          currentResult={currentResult}
          currentLabel="Current"
        />
      </ScenarioRow>

      {/* Reset button */}
      {hasChanges && (
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-1.5 w-full text-xs px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800/40 text-gray-400 hover:border-orange-500 hover:text-orange-400 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
            <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L6.053 5h6.447a5.5 5.5 0 1 1 0 11H6a.75.75 0 0 1 0-1.5h6.5a4 4 0 1 0 0-8H6.053l1.715 1.708a.75.75 0 0 1-1.06 1.061L4.197 6.757a1 1 0 0 1 0-1.414l2.511-2.511a.75.75 0 0 1 1.085.4z" clipRule="evenodd" />
          </svg>
          Reset all scenarios
        </button>
      )}
    </div>
  )
}
