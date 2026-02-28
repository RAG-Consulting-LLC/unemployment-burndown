import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { ok, err } from '../lib/response.mjs'

const BUCKET = process.env.S3_BUCKET || 'rag-consulting-burndown'
const REGION = process.env.S3_REGION || 'us-west-1'

let _s3 = null
function getS3() {
  if (_s3) return _s3
  _s3 = new S3Client({ region: REGION })
  return _s3
}

/**
 * GET /statements
 * Returns the statements index from S3.
 *
 * GET /statements/{statementId}
 * Returns a specific statement from S3.
 */
export async function handler(event) {
  try {
    const statementId = event.pathParameters?.statementId
    const key = statementId
      ? `statements/${statementId}.json`
      : 'statements/index.json'

    const res = await getS3().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    const body = await res.Body.transformToString('utf-8')
    return ok(JSON.parse(body))
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      if (event.pathParameters?.statementId) {
        return err(404, 'Statement not found')
      }
      return ok({ version: 1, lastUpdated: null, statements: [] })
    }
    console.error('getStatements error:', error.message)
    return err(500, error.message)
  }
}
