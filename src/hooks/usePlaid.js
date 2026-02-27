import { useState, useCallback } from 'react'

export function usePlaid({
  plaidAccounts,
  onPlaidAccountsChange,
  plaidTransactions,
  onPlaidTransactionsChange,
  plaidSyncCursor,
  onPlaidSyncCursorChange,
  savingsAccounts,
  onSavingsChange,
  creditCards,
  onCreditCardsChange,
}) {
  const [linkToken, setLinkToken] = useState(null)
  const [linking, setLinking] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [fetchingTxns, setFetchingTxns] = useState(false)
  const [error, setError] = useState(null)

  const createLinkToken = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/plaid/create-link-token', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create link token')
      const data = await res.json()
      setLinkToken(data.link_token)
      return data.link_token
    } catch (err) {
      setError(err.message)
      return null
    }
  }, [])

  const onLinkSuccess = useCallback(async (publicToken, metadata) => {
    try {
      setLinking(true)
      setError(null)
      const res = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken }),
      })
      if (!res.ok) throw new Error('Failed to exchange token')
      const data = await res.json()

      const newItem = {
        id: data.item_id,
        institutionName: data.institution_name,
        accessToken: data.access_token,
        lastSynced: new Date().toISOString(),
        linkedAt: new Date().toISOString(),
        accounts: data.accounts.map(a => ({
          plaidAccountId: a.account_id,
          name: a.name,
          officialName: a.official_name,
          type: a.type,
          subtype: a.subtype,
          mask: a.mask,
          currentBalance: a.balances.current,
          availableBalance: a.balances.available,
          limit: a.balances.limit,
          mappedTo: null,
          autoSync: true,
        })),
      }

      onPlaidAccountsChange([...plaidAccounts, newItem])
    } catch (err) {
      setError(err.message)
    } finally {
      setLinking(false)
    }
  }, [plaidAccounts, onPlaidAccountsChange])

  const syncBalances = useCallback(async (plaidItemId) => {
    const item = plaidAccounts.find(a => a.id === plaidItemId)
    if (!item) return

    try {
      setSyncing(true)
      setError(null)
      const res = await fetch('/api/plaid/balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: item.accessToken }),
      })
      if (!res.ok) throw new Error('Failed to fetch balances')
      const data = await res.json()

      // Update plaid accounts with new balances
      const updatedAccounts = plaidAccounts.map(pa => {
        if (pa.id !== plaidItemId) return pa
        return {
          ...pa,
          lastSynced: new Date().toISOString(),
          accounts: pa.accounts.map(acc => {
            const fresh = data.accounts.find(d => d.account_id === acc.plaidAccountId)
            if (!fresh) return acc
            return {
              ...acc,
              currentBalance: fresh.balances.current,
              availableBalance: fresh.balances.available,
              limit: fresh.balances.limit,
            }
          }),
        }
      })
      onPlaidAccountsChange(updatedAccounts)

      // Apply auto-sync to mapped local accounts
      const updatedItem = updatedAccounts.find(a => a.id === plaidItemId)
      if (updatedItem) {
        let newSavings = [...savingsAccounts]
        let newCards = [...creditCards]
        let savingsChanged = false
        let cardsChanged = false

        for (const acc of updatedItem.accounts) {
          if (!acc.autoSync || !acc.mappedTo) continue
          const { type, localId } = acc.mappedTo

          if (type === 'savingsAccounts') {
            newSavings = newSavings.map(s =>
              s.id === localId ? { ...s, amount: acc.currentBalance ?? s.amount } : s
            )
            savingsChanged = true
          } else if (type === 'creditCards') {
            newCards = newCards.map(c =>
              c.id === localId ? { ...c, balance: Math.abs(acc.currentBalance ?? c.balance), creditLimit: acc.limit ?? c.creditLimit } : c
            )
            cardsChanged = true
          }
        }

        if (savingsChanged) onSavingsChange(newSavings)
        if (cardsChanged) onCreditCardsChange(newCards)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSyncing(false)
    }
  }, [plaidAccounts, onPlaidAccountsChange, savingsAccounts, onSavingsChange, creditCards, onCreditCardsChange])

  const syncAllBalances = useCallback(async () => {
    for (const item of plaidAccounts) {
      await syncBalances(item.id)
    }
  }, [plaidAccounts, syncBalances])

  const fetchTransactions = useCallback(async (plaidItemId) => {
    const item = plaidAccounts.find(a => a.id === plaidItemId)
    if (!item) return

    try {
      setFetchingTxns(true)
      setError(null)
      const cursor = plaidSyncCursor[plaidItemId] || ''
      const res = await fetch('/api/plaid/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: item.accessToken, cursor }),
      })
      if (!res.ok) throw new Error('Failed to fetch transactions')
      const data = await res.json()

      // Build updated transactions list
      let updated = [...plaidTransactions]

      // Remove deleted transactions
      const removedIds = new Set(data.removed.map(t => t.transaction_id))
      updated = updated.filter(t => !removedIds.has(t.id))

      // Update modified transactions
      for (const mod of data.modified) {
        updated = updated.map(t =>
          t.id === mod.transaction_id
            ? { ...t, date: mod.date, name: mod.merchant_name || mod.name, amount: mod.amount, category: mod.category, pending: mod.pending }
            : t
        )
      }

      // Add new transactions
      for (const add of data.added) {
        if (!updated.find(t => t.id === add.transaction_id)) {
          updated.push({
            id: add.transaction_id,
            plaidAccountId: add.account_id,
            date: add.date,
            name: add.merchant_name || add.name,
            amount: add.amount,
            category: add.category,
            pending: add.pending,
            mappedExpenseCategory: null,
            excluded: false,
          })
        }
      }

      // Sort by date descending
      updated.sort((a, b) => b.date.localeCompare(a.date))

      onPlaidTransactionsChange(updated)
      onPlaidSyncCursorChange({ ...plaidSyncCursor, [plaidItemId]: data.next_cursor })
    } catch (err) {
      setError(err.message)
    } finally {
      setFetchingTxns(false)
    }
  }, [plaidAccounts, plaidTransactions, plaidSyncCursor, onPlaidTransactionsChange, onPlaidSyncCursorChange])

  const unlinkInstitution = useCallback((plaidItemId) => {
    onPlaidAccountsChange(plaidAccounts.filter(a => a.id !== plaidItemId))
    // Remove related transactions
    const item = plaidAccounts.find(a => a.id === plaidItemId)
    if (item) {
      const accountIds = new Set(item.accounts.map(a => a.plaidAccountId))
      onPlaidTransactionsChange(plaidTransactions.filter(t => !accountIds.has(t.plaidAccountId)))
    }
    // Remove cursor
    const newCursors = { ...plaidSyncCursor }
    delete newCursors[plaidItemId]
    onPlaidSyncCursorChange(newCursors)
  }, [plaidAccounts, plaidTransactions, plaidSyncCursor, onPlaidAccountsChange, onPlaidTransactionsChange, onPlaidSyncCursorChange])

  const mapAccount = useCallback((plaidItemId, plaidAccountId, targetType, localId) => {
    onPlaidAccountsChange(plaidAccounts.map(pa => {
      if (pa.id !== plaidItemId) return pa
      return {
        ...pa,
        accounts: pa.accounts.map(acc => {
          if (acc.plaidAccountId !== plaidAccountId) return acc
          return { ...acc, mappedTo: targetType && localId ? { type: targetType, localId } : null }
        }),
      }
    }))
  }, [plaidAccounts, onPlaidAccountsChange])

  const toggleAutoSync = useCallback((plaidItemId, plaidAccountId) => {
    onPlaidAccountsChange(plaidAccounts.map(pa => {
      if (pa.id !== plaidItemId) return pa
      return {
        ...pa,
        accounts: pa.accounts.map(acc => {
          if (acc.plaidAccountId !== plaidAccountId) return acc
          return { ...acc, autoSync: !acc.autoSync }
        }),
      }
    }))
  }, [plaidAccounts, onPlaidAccountsChange])

  return {
    linkToken,
    linking,
    syncing,
    fetchingTxns,
    error,
    createLinkToken,
    onLinkSuccess,
    syncBalances,
    syncAllBalances,
    fetchTransactions,
    unlinkInstitution,
    mapAccount,
    toggleAutoSync,
  }
}
