import { getPlaidClient } from '../lib/plaid.mjs'
import { getPlaidItemsByUser, getPlaidItem, updateCursor } from '../lib/dynamo.mjs'
import { readDataJson, writeDataJson } from '../lib/s3.mjs'
import { ok, err } from '../lib/response.mjs'

/**
 * POST /plaid/sync
 *
 * Syncs transactions and account balances from all connected Plaid items.
 * Updates data.json in S3 with fresh balances:
 *   - Checking/Savings → savingsAccounts[].amount
 *   - Credit cards     → creditCards[].balance + creditCards[].creditLimit
 *
 * Body: { userId?, itemId? }
 *   If itemId is provided, only syncs that single item.
 *   Otherwise syncs all items for the user.
 */
export async function handler(event) {
  try {
    const body = JSON.parse(event.body || '{}')
    const { userId = 'default', itemId } = body

    const client = getPlaidClient()

    // Determine which items to sync
    let items
    if (itemId) {
      const item = await getPlaidItem(userId, itemId)
      if (!item) return err(404, 'Item not found')
      items = [item]
    } else {
      items = await getPlaidItemsByUser(userId)
    }

    if (items.length === 0) {
      return ok({ message: 'No connected accounts', updated: false })
    }

    // Read current data.json
    let data = await readDataJson()
    if (!data || !data.state) {
      return err(400, 'No existing data.json found in S3. Please save data from the app first.')
    }

    const state = data.state
    if (!state.savingsAccounts) state.savingsAccounts = []
    if (!state.creditCards)     state.creditCards = []
    if (!data.plaidMeta)        data.plaidMeta = {}

    const allAccountUpdates = []

    for (const item of items) {
      const { accessToken, itemId: iid } = item

      // ── Sync transactions (cursor-based) ──
      let cursor = item.cursor || null
      let hasMore = true
      let addedTxns = []

      while (hasMore) {
        const syncRes = await client.transactionsSync({
          access_token: accessToken,
          cursor:       cursor || undefined,
          count:        500,
        })
        const syncData = syncRes.data

        addedTxns = addedTxns.concat(syncData.added || [])
        // We track added txns; modified/removed could be handled later

        hasMore = syncData.has_more
        cursor  = syncData.next_cursor
      }

      // Persist the cursor for next incremental sync
      if (cursor) {
        await updateCursor(userId, iid, cursor)
      }

      // ── Fetch current account balances ──
      const acctRes = await client.accountsGet({ access_token: accessToken })
      const plaidAccounts = acctRes.data.accounts

      for (const acct of plaidAccounts) {
        const update = {
          plaidAccountId:   acct.account_id,
          plaidItemId:      iid,
          institutionName:  item.institutionName,
          name:             acct.name,
          officialName:     acct.official_name,
          type:             acct.type,
          subtype:          acct.subtype,
          mask:             acct.mask,
          currentBalance:   acct.balances.current,
          availableBalance: acct.balances.available,
          limit:            acct.balances.limit,
        }
        allAccountUpdates.push(update)

        // ── Map to existing data model ──
        if (acct.type === 'depository') {
          // Checking / Savings → savingsAccounts
          mapToSavingsAccount(state, data.plaidMeta, acct)
        } else if (acct.type === 'credit') {
          // Credit card → creditCards
          mapToCreditCard(state, data.plaidMeta, acct)
        }
      }
    }

    // Record sync timestamp
    data.plaidMeta.lastSync = new Date().toISOString()
    data.savedAt = new Date().toISOString()

    // Write updated data back to S3
    await writeDataJson(data)

    return ok({
      updated: true,
      accountsUpdated: allAccountUpdates.length,
      accounts: allAccountUpdates,
      data,  // return full updated data so frontend can apply it
    })
  } catch (error) {
    console.error('sync error:', error.response?.data || error.message)
    return err(500, error.response?.data?.error_message || error.message)
  }
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

/**
 * Map a Plaid depository account to a savingsAccounts[] entry.
 * First tries to match by stored plaidAccountId, then by similar name.
 * Creates a new entry if no match found.
 */
function mapToSavingsAccount(state, plaidMeta, plaidAcct) {
  const plaidId = plaidAcct.account_id
  const balance = plaidAcct.balances.available ?? plaidAcct.balances.current ?? 0

  // 1. Match by plaidAccountId
  let existing = state.savingsAccounts.find(a => a.plaidAccountId === plaidId)

  // 2. Match by name (first time linking)
  if (!existing) {
    const plaidName = (plaidAcct.official_name || plaidAcct.name || '').toLowerCase()
    existing = state.savingsAccounts.find(a =>
      !a.plaidAccountId && a.name && plaidName.includes(a.name.toLowerCase())
    )
  }

  if (existing) {
    existing.amount = Math.round(balance * 100) / 100
    existing.plaidAccountId = plaidId
    existing.plaidLastSync  = new Date().toISOString()
  } else {
    // Create new entry
    const displayName = plaidAcct.official_name || plaidAcct.name || 'Linked Account'
    const subtypeLabel = plaidAcct.subtype
      ? ` (${plaidAcct.subtype.charAt(0).toUpperCase() + plaidAcct.subtype.slice(1)})`
      : ''

    state.savingsAccounts.push({
      id:              Date.now() + Math.random(),
      name:            `${displayName}${subtypeLabel}`,
      amount:          Math.round(balance * 100) / 100,
      active:          true,
      assignedTo:      null,
      plaidAccountId:  plaidId,
      plaidLastSync:   new Date().toISOString(),
    })
  }
}

/**
 * Map a Plaid credit account to a creditCards[] entry.
 * Same matching logic: plaidAccountId first, then name, then create.
 */
function mapToCreditCard(state, plaidMeta, plaidAcct) {
  const plaidId = plaidAcct.account_id
  const balance = Math.abs(plaidAcct.balances.current ?? 0)
  const limit   = plaidAcct.balances.limit ?? 0

  // 1. Match by plaidAccountId
  let existing = state.creditCards.find(c => c.plaidAccountId === plaidId)

  // 2. Match by name
  if (!existing) {
    const plaidName = (plaidAcct.official_name || plaidAcct.name || '').toLowerCase()
    existing = state.creditCards.find(c =>
      !c.plaidAccountId && c.name && plaidName.includes(c.name.toLowerCase())
    )
  }

  if (existing) {
    existing.balance     = Math.round(balance * 100) / 100
    existing.creditLimit = Math.round(limit * 100) / 100
    existing.plaidAccountId = plaidId
    existing.plaidLastSync  = new Date().toISOString()
  } else {
    const displayName = plaidAcct.official_name || plaidAcct.name || 'Linked Card'
    state.creditCards.push({
      id:              Date.now() + Math.random(),
      name:            displayName,
      balance:         Math.round(balance * 100) / 100,
      minimumPayment:  0,
      creditLimit:     Math.round(limit * 100) / 100,
      apr:             0,
      statementCloseDay: '',
      assignedTo:      null,
      plaidAccountId:  plaidId,
      plaidLastSync:   new Date().toISOString(),
    })
  }
}
