import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'

const TABLE = process.env.TOKENS_TABLE || 'PlaidTokens'

let _docClient = null

function getDocClient() {
  if (_docClient) return _docClient
  const client = new DynamoDBClient({})
  _docClient = DynamoDBDocumentClient.from(client)
  return _docClient
}

/**
 * Store a Plaid item (access_token + metadata).
 */
export async function putPlaidItem({ userId, itemId, accessToken, institutionId, institutionName, cursor }) {
  await getDocClient().send(new PutCommand({
    TableName: TABLE,
    Item: {
      userId,
      itemId,
      accessToken,
      institutionId:   institutionId || null,
      institutionName: institutionName || null,
      cursor:          cursor || null,
      createdAt:       new Date().toISOString(),
      updatedAt:       new Date().toISOString(),
    },
  }))
}

/**
 * Get a single Plaid item by userId + itemId.
 */
export async function getPlaidItem(userId, itemId) {
  const res = await getDocClient().send(new GetCommand({
    TableName: TABLE,
    Key: { userId, itemId },
  }))
  return res.Item || null
}

/**
 * Get all Plaid items for a user.
 */
export async function getPlaidItemsByUser(userId) {
  const res = await getDocClient().send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  }))
  return res.Items || []
}

/**
 * Update the sync cursor for an item.
 */
export async function updateCursor(userId, itemId, cursor) {
  await getDocClient().send(new PutCommand({
    TableName: TABLE,
    Item: {
      ...(await getPlaidItem(userId, itemId)),
      cursor,
      updatedAt: new Date().toISOString(),
    },
  }))
}

/**
 * Delete a Plaid item.
 */
export async function deletePlaidItem(userId, itemId) {
  await getDocClient().send(new DeleteCommand({
    TableName: TABLE,
    Key: { userId, itemId },
  }))
}
