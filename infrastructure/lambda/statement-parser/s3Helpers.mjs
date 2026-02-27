import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-west-1' })

/**
 * Fetch an object from S3 as a Buffer.
 */
export async function getS3Object(bucket, key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  const chunks = []
  for await (const chunk of res.Body) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/**
 * Write a string or Buffer to S3.
 */
export async function putS3Object(bucket, key, body, contentType = 'application/json') {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
}
