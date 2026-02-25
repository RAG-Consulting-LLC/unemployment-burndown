import {
  S3Client,
  CreateBucketCommand,
  PutPublicAccessBlockCommand,
  PutBucketPolicyCommand,
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

  // 2. Disable all block-public-access settings
  console.log("Disabling block public access...");
  await s3.send(new PutPublicAccessBlockCommand({
    Bucket: BUCKET,
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: false,
      IgnorePublicAcls: false,
      BlockPublicPolicy: false,
      RestrictPublicBuckets: false,
    },
  }));

  // 3. Public read + public write bucket policy
  console.log("Applying bucket policy...");
  await s3.send(new PutBucketPolicyCommand({
    Bucket: BUCKET,
    Policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "PublicReadWrite",
          Effect: "Allow",
          Principal: "*",
          Action: ["s3:GetObject", "s3:PutObject"],
          Resource: `arn:aws:s3:::${BUCKET}/*`,
        },
      ],
    }),
  }));

  // 4. CORS — allow GET and PUT from any origin (data is public)
  console.log("Applying CORS config...");
  await s3.send(new PutBucketCorsCommand({
    Bucket: BUCKET,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ["*"],
          AllowedMethods: ["GET", "PUT", "HEAD"],
          AllowedHeaders: ["*"],
          MaxAgeSeconds: 3000,
        },
      ],
    },
  }));

  console.log("\n=== DONE ===");
  console.log(`Bucket URL: https://${BUCKET}.s3.${REGION}.amazonaws.com`);
  console.log(`Data URL:   https://${BUCKET}.s3.${REGION}.amazonaws.com/data.json`);
}

setup().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
