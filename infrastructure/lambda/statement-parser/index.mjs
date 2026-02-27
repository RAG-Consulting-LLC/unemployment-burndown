import { getS3Object, putS3Object } from './s3Helpers.mjs'
import { parseEmail, extractTextFromAttachments } from './emailParser.mjs'
import { parseStatementWithBedrock, matchToCard } from './parser.mjs'

const BUCKET = process.env.BUCKET_NAME || 'rag-consulting-burndown'

export async function handler(event) {
  console.log('Statement parser invoked', JSON.stringify(event, null, 2))

  for (const record of event.Records) {
    const s3Key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '))
    console.log(`Processing email: ${s3Key}`)

    try {
      // 1. Fetch raw email from S3
      const emailBuffer = await getS3Object(BUCKET, s3Key)

      // 2. Parse MIME email
      const parsed = await parseEmail(emailBuffer)
      console.log(`Email from: ${parsed.from?.text}, subject: ${parsed.subject}`)

      // 3. Extract text content (from body + PDF attachments)
      const textContent = await extractTextFromAttachments(parsed)
      if (!textContent || textContent.trim().length < 50) {
        console.warn('Insufficient text content extracted, skipping')
        return { statusCode: 200, body: 'Skipped: insufficient content' }
      }

      // 4. Call Bedrock Claude to parse the statement
      const statementData = await parseStatementWithBedrock(
        textContent,
        parsed.from?.text || 'unknown'
      )

      // 5. Match to existing credit card
      const cardId = await matchToCard(BUCKET, statementData.issuer, statementData)
      statementData.cardId = cardId

      // 6. Assign metadata
      const stmtId = `stmt_${Date.now()}`
      statementData.id = stmtId
      statementData.sourceEmailId = s3Key
      statementData.parsedAt = new Date().toISOString()

      // Give each transaction an ID
      if (statementData.transactions) {
        statementData.transactions = statementData.transactions.map((txn, i) => ({
          ...txn,
          id: `${stmtId}_txn_${String(i).padStart(3, '0')}`,
        }))
      }

      // 7. Write parsed statement to S3
      await putS3Object(
        BUCKET,
        `statements/${stmtId}.json`,
        JSON.stringify(statementData, null, 2)
      )
      console.log(`Wrote statement: statements/${stmtId}.json`)

      // 8. Update index.json
      await updateIndex(BUCKET, statementData)
      console.log('Updated statements/index.json')

    } catch (err) {
      console.error(`Error processing ${s3Key}:`, err)
      throw err
    }
  }

  return { statusCode: 200, body: 'OK' }
}

async function updateIndex(bucket, statementData) {
  let index
  try {
    const raw = await getS3Object(bucket, 'statements/index.json')
    index = JSON.parse(raw.toString('utf-8'))
  } catch {
    index = { version: 1, lastUpdated: null, statements: [] }
  }

  // Add new statement summary to index
  index.statements.push({
    id: statementData.id,
    cardId: statementData.cardId,
    issuer: statementData.issuer || null,
    closingDate: statementData.closingDate || null,
    statementBalance: statementData.statementBalance || 0,
    transactionCount: statementData.transactions?.length || 0,
    parsedAt: statementData.parsedAt,
  })

  index.lastUpdated = new Date().toISOString()

  await putS3Object(
    bucket,
    'statements/index.json',
    JSON.stringify(index, null, 2)
  )
}
