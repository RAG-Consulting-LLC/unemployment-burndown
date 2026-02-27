import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

const BUCKET = process.env.S3_BUCKET || 'rag-consulting-burndown'
const REGION = process.env.S3_REGION || 'us-west-1'
const DATA_KEY = 'data.json'

let _s3 = null

function getS3() {
  if (_s3) return _s3
  _s3 = new S3Client({ region: REGION })
  return _s3
}

/**
 * Read and parse data.json from S3.
 * Returns null if the file doesn't exist.
 */
export async function readDataJson() {
  try {
    const res = await getS3().send(new GetObjectCommand({ Bucket: BUCKET, Key: DATA_KEY }))
    const body = await res.Body.transformToString('utf-8')
    return JSON.parse(body)
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return null
    }
    throw err
  }
}

/**
 * Write data.json back to S3.
 */
export async function writeDataJson(data) {
  await getS3().send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: DATA_KEY,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  }))
}
