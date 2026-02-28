import {
  S3Client,
  CreateBucketCommand,
  PutPublicAccessBlockCommand,
  PutBucketEncryptionCommand,
  DeleteBucketPolicyCommand,
  PutBucketCorsCommand,
} from "@aws-sdk/client-s3";

const REGION = process.env.AWS_REGION;
const BUCKET = "rag-consulting-burndown";

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function setup() {
  // 1. Create bucket
  console.log(`Creating bucket: ${BUCKET}...`);
  try {
    await s3.send(new CreateBucketCommand({
      Bucket: BUCKET,
      CreateBucketConfiguration: { LocationConstraint: REGION },
    }));
    console.log("Bucket created.");
  } catch (e) {
    if (e.name === "BucketAlreadyOwnedByYou") {
      console.log("Bucket already exists, continuing...");
    } else {
      throw e;
    }
  }

  // 2. Enable server-side encryption (SSE-S3)
  console.log("Enabling default encryption (SSE-S3)...");
  await s3.send(new PutBucketEncryptionCommand({
    Bucket: BUCKET,
    ServerSideEncryptionConfiguration: {
      Rules: [
        {
          ApplyServerSideEncryptionByDefault: {
            SSEAlgorithm: "AES256",
          },
          BucketKeyEnabled: true,
        },
      ],
    },
  }));

  // 3. Block ALL public access
  console.log("Blocking all public access...");
  await s3.send(new PutPublicAccessBlockCommand({
    Bucket: BUCKET,
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      IgnorePublicAcls: true,
      BlockPublicPolicy: true,
      RestrictPublicBuckets: true,
    },
  }));

  // 4. Remove any existing public bucket policy
  console.log("Removing public bucket policy...");
  try {
    await s3.send(new DeleteBucketPolicyCommand({ Bucket: BUCKET }));
  } catch (e) {
    // No policy to delete — that's fine
    if (e.name !== "NoSuchBucketPolicy") {
      console.log("  (no existing policy to remove)");
    }
  }

  // 5. Remove CORS config (no longer needed — frontend accesses via API)
  // CORS is only needed if frontend directly accessed S3 (which it no longer does)
  console.log("Note: CORS not configured — all access goes through API Gateway/backend.");

  console.log("\n=== DONE ===");
  console.log(`Bucket: ${BUCKET}`);
  console.log("  - Encryption: SSE-S3 (AES256) enabled");
  console.log("  - Public access: BLOCKED");
  console.log("  - Access: Only via IAM roles (Lambda backend)");
}

setup().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
