import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

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
app.use(express.json({ limit: '10mb' }))

// ── S3 client for data proxy ──
const S3_BUCKET = process.env.S3_BUCKET || 'rag-consulting-burndown'
const S3_REGION = process.env.AWS_REGION || 'us-west-1'
const s3 = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

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

// ── Safety: max pagination pages (matches backend PLAID_MAX_SYNC_PAGES) ──
const MAX_SYNC_PAGES = parseInt(process.env.PLAID_MAX_SYNC_PAGES || '10', 10)

// ── Safety: in-memory per-item sync cooldown for dev server ──
const SYNC_COOLDOWN_MS = parseInt(process.env.PLAID_SYNC_COOLDOWN_SECONDS || '300', 10) * 1000
const lastSyncTimes = new Map()

// ── Safety: in-memory monthly call counter for dev server ──
const MONTHLY_BUDGET = parseFloat(process.env.PLAID_MONTHLY_BUDGET || '10')
const EST_COST_PER_CALL = parseFloat(process.env.PLAID_EST_COST_PER_CALL || '0.10')
const MAX_MONTHLY_CALLS = Math.floor(MONTHLY_BUDGET / EST_COST_PER_CALL)
let callCounter = { month: new Date().toISOString().slice(0, 7), count: 0 }

function checkDevBudget() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  if (callCounter.month !== currentMonth) {
    callCounter = { month: currentMonth, count: 0 }
  }
  return {
    allowed: callCounter.count < MAX_MONTHLY_CALLS,
    used: callCounter.count,
    limit: MAX_MONTHLY_CALLS,
    remaining: Math.max(0, MAX_MONTHLY_CALLS - callCounter.count),
  }
}

function recordDevCall() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  if (callCounter.month !== currentMonth) {
    callCounter = { month: currentMonth, count: 0 }
  }
  callCounter.count++
}

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
    // Budget check
    const budget = checkDevBudget()
    if (!budget.allowed) {
      return res.status(429).json({ error: `Monthly API budget exhausted (${budget.used}/${budget.limit} calls).` })
    }

    const { access_token, cursor } = req.body

    let allAdded = []
    let allModified = []
    let allRemoved = []
    let nextCursor = cursor || ''
    let hasMore = true
    let pageCount = 0

    while (hasMore && pageCount < MAX_SYNC_PAGES) {
      pageCount++
      recordDevCall()
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

    if (hasMore) {
      console.warn(`Transactions sync hit page limit (${MAX_SYNC_PAGES}). Remaining data will sync on next call.`)
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

// Budget status endpoint (dev server)
app.get('/api/plaid/budget', (req, res) => {
  const budget = checkDevBudget()
  res.json({
    ...budget,
    budgetDollars: MONTHLY_BUDGET,
    estCostPerCall: EST_COST_PER_CALL,
    month: new Date().toISOString().slice(0, 7),
  })
})

// ── Data API (S3 proxy — replaces direct public S3 access) ──

async function s3Get(key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }))
  return JSON.parse(await res.Body.transformToString('utf-8'))
}

// GET /api/data — read data.json
app.get('/api/data', async (req, res) => {
  try {
    const data = await s3Get('data.json')
    res.json(data)
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return res.json(null)
    }
    console.error('GET /api/data error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/data — write data.json
app.put('/api/data', async (req, res) => {
  try {
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: 'data.json',
      Body: JSON.stringify(req.body, null, 2),
      ContentType: 'application/json',
    }))
    res.json({ saved: true, savedAt: new Date().toISOString() })
  } catch (err) {
    console.error('PUT /api/data error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/statements — statements index
app.get('/api/statements', async (req, res) => {
  try {
    const data = await s3Get('statements/index.json')
    res.json(data)
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return res.json({ version: 1, lastUpdated: null, statements: [] })
    }
    console.error('GET /api/statements error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/statements/:id — single statement
app.get('/api/statements/:id', async (req, res) => {
  try {
    const data = await s3Get(`statements/${req.params.id}.json`)
    res.json(data)
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ error: 'Statement not found' })
    }
    console.error('GET /api/statements/:id error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PLAID_SERVER_PORT || 3001
app.listen(PORT, () => {
  console.log(`Plaid API server running on http://localhost:${PORT}`)
})
