import { useMemo } from 'react'
import dayjs from 'dayjs'

/**
 * whatIf shape:
 *   expenseReductionPct    number  0-100  % cut to non-essential expenses
 *   sideIncomeMonthly      number  flat monthly side income
 *   emergencyFloor         number  stop runway at this cash floor (default 0)
 *   benefitDelayWeeks      number  shift benefit start by +N weeks
 *   benefitCutWeeks        number  reduce benefit duration by N weeks
 *   freezeDate             string  ISO date – full spending until here, then reductions kick in
 *   jobOfferSalary         number  monthly take-home after job starts
 *   jobOfferStartDate      string  ISO date job begins
 *   freelanceRamp          array   [{monthOffset, monthlyAmount}] sorted by monthOffset
 *   partnerIncomeMonthly   number  second household income
 *   partnerStartDate       string  ISO date partner income begins
 */
export function useBurndown(savings, unemployment, expenses, whatIf, oneTimeExpenses = [], extraCash = 0, investments = [], oneTimeIncome = [], monthlyIncome = [], startDate = null) {
  return useMemo(() => {
    const today = dayjs(startDate || new Date())

    // --- Benefit window ---
    const rawBenefitStart = dayjs(unemployment.startDate)
    const delayWeeks = Number(whatIf.benefitDelayWeeks) || 0
    const cutWeeks   = Number(whatIf.benefitCutWeeks)   || 0
    const benefitStart = rawBenefitStart.add(delayWeeks, 'week')
    const baseDuration = Math.max(0, unemployment.durationWeeks - cutWeeks)
    const benefitEnd   = benefitStart.add(baseDuration, 'week')
    const monthlyBenefits = unemployment.weeklyAmount * (52 / 12)

    // --- Expense split ---
    const essentialTotal = expenses
      .filter(e => e.essential)
      .reduce((sum, e) => sum + (Number(e.monthlyAmount) || 0), 0)
    const nonEssentialTotal = expenses
      .filter(e => !e.essential)
      .reduce((sum, e) => sum + (Number(e.monthlyAmount) || 0), 0)

    const reductionFactor = 1 - (whatIf.expenseReductionPct || 0) / 100
    const effectiveExpenses = essentialTotal + nonEssentialTotal * reductionFactor

    // --- Flat side income ---
    const sideIncome = Number(whatIf.sideIncomeMonthly) || 0

    // --- Monthly investments ---
    const monthlyInvestments = investments
      .filter(inv => inv.active)
      .reduce((sum, inv) => sum + (Number(inv.monthlyAmount) || 0), 0)

    // --- One-time expenses by month slot ---
    const oneTimeByMonth = {}
    for (const ote of oneTimeExpenses) {
      if (!ote.date || !ote.amount) continue
      const oteDate = dayjs(ote.date)
      if (oteDate.isBefore(today)) continue
      const monthsAhead = oteDate.diff(today, 'month')
      const slot = Math.max(1, monthsAhead + 1)
      oneTimeByMonth[slot] = (oneTimeByMonth[slot] || 0) + (Number(ote.amount) || 0)
    }

    // --- One-time income injections by month slot ---
    const oneTimeIncomeByMonth = {}
    for (const oti of oneTimeIncome) {
      if (!oti.date || !oti.amount) continue
      const otiDate = dayjs(oti.date)
      if (otiDate.isBefore(today)) continue
      const monthsAhead = otiDate.diff(today, 'month')
      const slot = Math.max(1, monthsAhead + 1)
      oneTimeIncomeByMonth[slot] = (oneTimeIncomeByMonth[slot] || 0) + (Number(oti.amount) || 0)
    }

    // --- Job offer ---
    const jobSalary    = Number(whatIf.jobOfferSalary) || 0
    const jobStartDate = whatIf.jobOfferStartDate ? dayjs(whatIf.jobOfferStartDate) : null

    // --- Freeze date ---
    const freezeDate = whatIf.freezeDate ? dayjs(whatIf.freezeDate) : null

    // --- Freelance ramp ---
    const freelanceRamp = Array.isArray(whatIf.freelanceRamp) ? whatIf.freelanceRamp : []

    // --- Partner income ---
    const partnerIncome    = Number(whatIf.partnerIncomeMonthly) || 0
    const partnerStartDate = whatIf.partnerStartDate ? dayjs(whatIf.partnerStartDate) : null

    // --- Emergency floor ---
    const emergencyFloor = Number(whatIf.emergencyFloor) || 0

    // --- Simulation ---
    const MAX_MONTHS = 120
    let balance = (Number(savings) || 0) + (Number(extraCash) || 0)
    let balanceEssential = balance  // parallel track: essentials + income only

    const dataPoints = [
      {
        date: today.toDate(),
        dateLabel: today.format('MMM YYYY'),
        balance: Math.round(Math.max(0, balance - emergencyFloor)),
        rawBalance: Math.round(balance),
        balanceEssentialOnly: Math.round(Math.max(0, balanceEssential - emergencyFloor)),
        month: 0,
        income: 0,
        netBurn: 0,
        netBurnEssentialOnly: 0,
        inBenefitWindow: false,
        jobActive: false,
      },
    ]

    let runoutDate  = null
    let runoutMonth = null

    for (let i = 1; i <= MAX_MONTHS; i++) {
      const currentDate = today.add(i, 'month')

      // Benefits
      const inBenefitWindow =
        currentDate.isAfter(benefitStart) && currentDate.isBefore(benefitEnd)
      let income = inBenefitWindow ? monthlyBenefits : 0

      // Flat side income (applies until job starts, if job start given)
      const jobActive = jobStartDate && !currentDate.isBefore(jobStartDate)
      if (!jobActive) income += sideIncome

      // Job offer salary
      if (jobActive) income += jobSalary

      // Partner income
      const partnerActive = partnerStartDate && !currentDate.isBefore(partnerStartDate)
      if (partnerActive) income += partnerIncome

      // Recurring monthly income sources
      for (const src of monthlyIncome) {
        if (!src.monthlyAmount) continue
        if (src.startDate && dayjs(src.startDate).isAfter(currentDate)) continue
        if (src.endDate && dayjs(src.endDate).isBefore(currentDate)) continue
        income += Number(src.monthlyAmount) || 0
      }

      // Freelance ramp: find highest tier whose monthOffset <= i
      if (freelanceRamp.length > 0) {
        const activeTier = [...freelanceRamp]
          .filter(t => t.monthOffset <= i)
          .sort((a, b) => b.monthOffset - a.monthOffset)[0]
        if (activeTier) income += Number(activeTier.monthlyAmount) || 0
      }

      // Expense reduction only applies after freeze date (or always if no freeze date)
      const afterFreeze = freezeDate ? !currentDate.isBefore(freezeDate) : true
      const expReductionFactor = afterFreeze ? reductionFactor : 1
      const monthExpenses = essentialTotal + nonEssentialTotal * expReductionFactor

      const oneTimeCost = oneTimeByMonth[i] || 0
      const oneTimeIncomeThisMonth = oneTimeIncomeByMonth[i] || 0
      const netBurn = monthExpenses + monthlyInvestments - income + oneTimeCost - oneTimeIncomeThisMonth
      const prevBalance = balance
      balance = balance - netBurn

      // Essentials-only parallel track (no discretionary spending, no one-time costs)
      const netBurnEssentialOnly = essentialTotal + monthlyInvestments - income
      const prevBalanceEssential = balanceEssential
      balanceEssential = balanceEssential - netBurnEssentialOnly

      // Runout = when balance drops to or below the emergency floor
      const effectiveBalance = balance - emergencyFloor
      const prevEffective   = prevBalance - emergencyFloor

      if (effectiveBalance <= 0 && runoutDate === null) {
        const safeDenom = netBurn === 0 ? 1 : netBurn
        const fraction  = Math.min(1, Math.max(0, prevEffective / safeDenom))
        const crossoverDate = today.add(i - 1 + fraction, 'month')
        runoutDate  = crossoverDate.toDate()
        runoutMonth = i - 1 + fraction
      }

      const effectiveBalanceEssential = balanceEssential - emergencyFloor

      dataPoints.push({
        date: currentDate.toDate(),
        dateLabel: currentDate.format('MMM YYYY'),
        balance: Math.max(0, Math.round(effectiveBalance)),
        rawBalance: Math.round(balance),
        balanceEssentialOnly: Math.max(0, Math.round(effectiveBalanceEssential)),
        month: i,
        income: Math.round(income),
        netBurn: Math.round(netBurn),
        netBurnEssentialOnly: Math.round(netBurnEssentialOnly),
        oneTimeCost: oneTimeCost > 0 ? Math.round(oneTimeCost) : undefined,
        oneTimeIncome: oneTimeIncomeThisMonth > 0 ? Math.round(oneTimeIncomeThisMonth) : undefined,
        inBenefitWindow,
        jobActive: !!jobActive,
      })

      if (effectiveBalance <= 0 && i >= (runoutMonth || 0) + 3) break
    }

    // Current-month net burn (no one-time)
    const currentInBenefit = today.isAfter(benefitStart) && today.isBefore(benefitEnd)
    const activeMonthlyIncomeNow = monthlyIncome
      .filter(src => {
        if (!src.monthlyAmount) return false
        if (src.startDate && dayjs(src.startDate).isAfter(today)) return false
        if (src.endDate && dayjs(src.endDate).isBefore(today)) return false
        return true
      })
      .reduce((s, src) => s + (Number(src.monthlyAmount) || 0), 0)
    const jobActiveNow = jobStartDate && !today.isBefore(jobStartDate)
    const partnerActiveNow = partnerStartDate && !today.isBefore(partnerStartDate)
    let currentIncome = (currentInBenefit ? monthlyBenefits : 0) + activeMonthlyIncomeNow
    if (jobActiveNow) {
      currentIncome += jobSalary
    } else {
      currentIncome += sideIncome
    }
    if (partnerActiveNow) currentIncome += partnerIncome
    const currentNetBurn = effectiveExpenses + monthlyInvestments - currentIncome
    const totalMonthlyIncome = activeMonthlyIncomeNow

    return {
      dataPoints,
      runoutDate,
      totalRunwayMonths: runoutMonth,
      currentNetBurn,
      effectiveExpenses,
      monthlyBenefits,
      monthlyInvestments,
      totalMonthlyIncome,
      benefitEnd: benefitEnd.toDate(),
      benefitStart: benefitStart.toDate(),
      emergencyFloor,
    }
  }, [savings, unemployment, expenses, whatIf, oneTimeExpenses, extraCash, investments, oneTimeIncome, monthlyIncome, startDate])
}
