import { useMemo } from 'react'
import dayjs from 'dayjs'

export function useBurndown(savings, unemployment, expenses, whatIf, oneTimeExpenses = [], extraCash = 0, investments = []) {
  return useMemo(() => {
    const today = dayjs('2026-02-21')

    // Unemployment benefit window
    const benefitStart = dayjs(unemployment.startDate)
    const benefitEnd = benefitStart.add(unemployment.durationWeeks, 'week')
    const monthlyBenefits = unemployment.weeklyAmount * (52 / 12)

    // Split essential vs non-essential expenses
    const essentialTotal = expenses
      .filter(e => e.essential)
      .reduce((sum, e) => sum + (Number(e.monthlyAmount) || 0), 0)
    const nonEssentialTotal = expenses
      .filter(e => !e.essential)
      .reduce((sum, e) => sum + (Number(e.monthlyAmount) || 0), 0)

    // Apply what-if reduction to non-essential expenses
    const reductionFactor = 1 - (whatIf.expenseReductionPct || 0) / 100
    const effectiveExpenses = essentialTotal + nonEssentialTotal * reductionFactor

    const sideIncome = Number(whatIf.sideIncomeMonthly) || 0

    // Sum of active monthly investment contributions (added to burn)
    const monthlyInvestments = investments
      .filter(inv => inv.active)
      .reduce((sum, inv) => sum + (Number(inv.monthlyAmount) || 0), 0)

    // Build a map of one-time expenses keyed by "month index" (months from today)
    // Each entry = total one-time cost hitting in that calendar month
    const oneTimeByMonth = {}
    for (const ote of oneTimeExpenses) {
      if (!ote.date || !ote.amount) continue
      const oteDate = dayjs(ote.date)
      if (oteDate.isBefore(today)) continue // already passed, skip
      // Which month slot does this fall in? (month 1 = today+1mo window, etc.)
      const monthsAhead = oteDate.diff(today, 'month')
      const slot = Math.max(1, monthsAhead + 1) // put in the month it actually lands
      oneTimeByMonth[slot] = (oneTimeByMonth[slot] || 0) + (Number(ote.amount) || 0)
    }

    // Month-by-month simulation (cap at 120 months / 10 years)
    const MAX_MONTHS = 120
    // Starting balance = cash savings + any sold asset proceeds (what-if)
    let balance = (Number(savings) || 0) + (Number(extraCash) || 0)
    const dataPoints = [
      {
        date: today.toDate(),
        dateLabel: today.format('MMM YYYY'),
        balance: Math.round(balance),
        month: 0,
      },
    ]

    let runoutDate = null
    let runoutMonth = null

    for (let i = 1; i <= MAX_MONTHS; i++) {
      const currentDate = today.add(i, 'month')

      // Is this month within the unemployment benefit window?
      const inBenefitWindow =
        currentDate.isAfter(benefitStart) && currentDate.isBefore(benefitEnd)
      const income = sideIncome + (inBenefitWindow ? monthlyBenefits : 0)

      const oneTimeCost = oneTimeByMonth[i] || 0
      const netBurn = effectiveExpenses + monthlyInvestments - income + oneTimeCost
      const prevBalance = balance
      balance = balance - netBurn

      if (balance <= 0 && runoutDate === null) {
        // Interpolate the exact crossover point within this month
        const safeDenom = netBurn === 0 ? 1 : netBurn
        const fraction = Math.min(1, Math.max(0, prevBalance / safeDenom))
        const crossoverDate = today.add(i - 1 + fraction, 'month')
        runoutDate = crossoverDate.toDate()
        runoutMonth = i - 1 + fraction
      }

      dataPoints.push({
        date: currentDate.toDate(),
        dateLabel: currentDate.format('MMM YYYY'),
        balance: Math.max(0, Math.round(balance)),
        month: i,
        oneTimeCost: oneTimeCost > 0 ? Math.round(oneTimeCost) : undefined,
      })

      // Stop generating points 3 months after hitting zero
      if (balance <= 0 && i >= (runoutMonth || 0) + 3) break
    }

    // Current monthly net burn (for the present month, excluding one-time)
    const currentInBenefit =
      today.isAfter(benefitStart) && today.isBefore(benefitEnd)
    const currentIncome = sideIncome + (currentInBenefit ? monthlyBenefits : 0)
    const currentNetBurn = effectiveExpenses + monthlyInvestments - currentIncome

    const totalRunwayMonths = runoutMonth

    return {
      dataPoints,
      runoutDate,
      totalRunwayMonths,
      currentNetBurn,
      effectiveExpenses,
      monthlyBenefits,
      monthlyInvestments,
      benefitEnd: benefitEnd.toDate(),
    }
  }, [savings, unemployment, expenses, whatIf, oneTimeExpenses, extraCash, investments])
}
