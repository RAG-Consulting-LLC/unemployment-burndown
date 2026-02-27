import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env from project root (or parent repo root if in a worktree)
dotenv.config({ path: resolve(__dirname, '..', '.env') })
if (!process.env.PLAID_CLIENT_ID) {
  // Try parent repo path (for git worktree setups)
  const parentEnv = resolve(__dirname, '..', '..', '..', '..', '.env')
  if (existsSync(parentEnv)) dotenv.config({ path: parentEnv })
}

const app = express()
app.use(cors())
app.use(express.json())

const config = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SANDBOX_SECRET,
    },
  },
})

const plaidClient = new PlaidApi(config)

// Create a link token for Plaid Link
app.post('/api/plaid/create-link-token', async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'burndown-user-1' },
      client_name: 'Burndown Tracker',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    })
    res.json({ link_token: response.data.link_token })
  } catch (err) {
    console.error('create-link-token error:', err.response?.data || err.message)
    res.status(500).json({ error: err.response?.data || err.message })
  }
})

// Exchange public_token for access_token and get accounts
app.post('/api/plaid/exchange-token', async (req, res) => {
  try {
    const { public_token } = req.body

    // Exchange for access token
    const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token })
    const { access_token, item_id } = exchangeRes.data

    // Get account details
    const accountsRes = await plaidClient.accountsGet({ access_token })
    const accounts = accountsRes.data.accounts

    // Get institution name
    let institutionName = 'Unknown Bank'
    const institutionId = accountsRes.data.item?.institution_id
    if (institutionId) {
      try {
        const instRes = await plaidClient.institutionsGetById({
          institution_id: institutionId,
          country_codes: [CountryCode.Us],
        })
        institutionName = instRes.data.institution.name
      } catch {
        // Keep default name if institution lookup fails
      }
    }

    res.json({
      access_token,
      item_id,
      institution_name: institutionName,
      accounts: accounts.map(a => ({
        account_id: a.account_id,
        name: a.name,
        official_name: a.official_name,
        type: a.type,
        subtype: a.subtype,
        mask: a.mask,
        balances: {
          current: a.balances.current,
          available: a.balances.available,
          limit: a.balances.limit,
        },
      })),
    })
  } catch (err) {
    console.error('exchange-token error:', err.response?.data || err.message)
    res.status(500).json({ error: err.response?.data || err.message })
  }
})

// Fetch current balances for a linked institution
app.post('/api/plaid/balances', async (req, res) => {
  try {
    const { access_token } = req.body
    const response = await plaidClient.accountsBalanceGet({ access_token })
    res.json({
      accounts: response.data.accounts.map(a => ({
        account_id: a.account_id,
        balances: {
          current: a.balances.current,
          available: a.balances.available,
          limit: a.balances.limit,
        },
      })),
    })
  } catch (err) {
    console.error('balances error:', err.response?.data || err.message)
    res.status(500).json({ error: err.response?.data || err.message })
  }
})

// Fetch transactions using /transactions/sync for incremental sync
app.post('/api/plaid/transactions', async (req, res) => {
  try {
    const { access_token, cursor } = req.body

    let allAdded = []
    let allModified = []
    let allRemoved = []
    let nextCursor = cursor || ''
    let hasMore = true

    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token,
        cursor: nextCursor || undefined,
      })
      const data = response.data

      allAdded = allAdded.concat(data.added)
      allModified = allModified.concat(data.modified)
      allRemoved = allRemoved.concat(data.removed)
      nextCursor = data.next_cursor
      hasMore = data.has_more
    }

    res.json({
      added: allAdded.map(t => ({
        transaction_id: t.transaction_id,
        account_id: t.account_id,
        date: t.date,
        name: t.name,
        merchant_name: t.merchant_name,
        amount: t.amount,
        category: t.personal_finance_category
          ? [t.personal_finance_category.primary, t.personal_finance_category.detailed]
          : t.category || [],
        pending: t.pending,
      })),
      modified: allModified.map(t => ({
        transaction_id: t.transaction_id,
        account_id: t.account_id,
        date: t.date,
        name: t.name,
        merchant_name: t.merchant_name,
        amount: t.amount,
        category: t.personal_finance_category
          ? [t.personal_finance_category.primary, t.personal_finance_category.detailed]
          : t.category || [],
        pending: t.pending,
      })),
      removed: allRemoved.map(t => ({ transaction_id: t.transaction_id })),
      next_cursor: nextCursor,
    })
  } catch (err) {
    console.error('transactions error:', err.response?.data || err.message)
    res.status(500).json({ error: err.response?.data || err.message })
  }
})

const PORT = process.env.PLAID_SERVER_PORT || 3001
app.listen(PORT, () => {
  console.log(`Plaid API server running on http://localhost:${PORT}`)
})
