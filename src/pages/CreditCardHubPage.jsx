import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStatementStorage } from '../hooks/useStatementStorage'
import SectionCard from '../components/layout/SectionCard'
import CardOverviewBanner from '../components/statements/CardOverviewBanner'
import StatementList from '../components/statements/StatementList'
import StatementChartTabs from '../components/statements/StatementChartTabs'
import TransactionTable from '../components/statements/TransactionTable'
import StatementImportStatus from '../components/statements/StatementImportStatus'

export default function CreditCardHubPage({ creditCards, people = [] }) {
  const [searchParams] = useSearchParams()
  const initialCardId = searchParams.get('card')
  const [selectedCardId, setSelectedCardId] = useState(
    initialCardId ? Number(initialCardId) : null
  )

  const { index, statements, loading, error, loadStatement, refreshIndex } = useStatementStorage()

  // Load all statement details for the selected card(s)
  useEffect(() => {
    if (!index?.statements?.length) return
    const toLoad = index.statements
      .filter(s => selectedCardId === null || s.cardId === selectedCardId)
    for (const s of toLoad) {
      if (!statements[s.id]) loadStatement(s.id)
    }
  }, [index, selectedCardId]) // eslint-disable-line

  // Collect all transactions from loaded statements
  const allTransactions = useMemo(() => {
    const txns = []
    const relevantStmts = (index?.statements || [])
      .filter(s => selectedCardId === null || s.cardId === selectedCardId)

    for (const stmtMeta of relevantStmts) {
      const full = statements[stmtMeta.id]
      if (!full?.transactions) continue
      for (const txn of full.transactions) {
        txns.push({ ...txn, cardId: full.cardId })
      }
    }
    return txns
  }, [index, statements, selectedCardId])

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 main-bottom-pad space-y-5">

      {/* Page title */}
      <div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Credit Card Statements
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Unified view of spending across all your credit cards
        </p>
      </div>

      {/* Import status */}
      <StatementImportStatus
        statementIndex={index}
        loading={loading}
        error={error}
        onRefresh={refreshIndex}
      />

      {/* Card selector / overview */}
      {creditCards.length > 0 ? (
        <SectionCard title="Your Cards">
          <CardOverviewBanner
            creditCards={creditCards}
            statementIndex={index}
            selectedCardId={selectedCardId}
            onSelectCard={setSelectedCardId}
            people={people}
          />
        </SectionCard>
      ) : (
        <SectionCard title="Your Cards">
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
            No credit cards configured yet. Add cards in the{' '}
            <a href="/" className="underline" style={{ color: 'var(--accent-blue)' }}>
              burndown tracker
            </a>{' '}
            to link statements.
          </p>
        </SectionCard>
      )}

      {/* Spending charts */}
      <StatementChartTabs
        transactions={allTransactions}
        creditCards={creditCards}
      />

      {/* Statement list */}
      <SectionCard title="Statements">
        <StatementList
          statementIndex={index}
          creditCards={creditCards}
          people={people}
          selectedCardId={selectedCardId}
          onLoadStatement={loadStatement}
        />
      </SectionCard>

      {/* Transaction table */}
      <SectionCard title="Transactions">
        <TransactionTable transactions={allTransactions} />
      </SectionCard>

      <p className="text-center text-xs text-faint pb-4">
        Statement data is stored separately and loaded on demand from S3.
      </p>
    </main>
  )
}
