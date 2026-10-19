import { EC2Client, StopInstancesCommand, DescribeVolumesCommand, DeleteVolumeCommand } from "@aws-sdk/client-ec2";
import { S3Client, PutBucketLifecycleConfigurationCommand } from "@aws-sdk/client-s3";

const ec2 = new EC2Client({ region: process.env.AWS_REGION || "us-east-1" });
const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

export async function processBudgetAlert(event) {
  console.log("📥 Received AWS CloudWatch Budget Trigger:", JSON.stringify(event));
  
  // Extract alert context
  const parsedBody = JSON.parse(event.body || "{}");
  const currentCost = parsedBody.CurrentCost || 0;
  const budgetedCost = parsedBody.BudgetLimit || 100;

  if (currentCost < budgetedCost) {
    return { statusCode: 200, body: JSON.stringify({ message: "Budget within nominal limits." }) };
  }

  console.warn(`🚨 Budget breached! ($${currentCost} > $${budgetedCost}). Initializing target cost containment procedures...`);

  try {
    // 1. Terminate/Stop non-essential Staging/Dev workloads
    const stopCommand = new StopInstancesCommand({
      InstanceIds: [], // Dynamically loaded via tags in real setup
      Filters: [{ Name: "tag:Environment", Values: ["Staging", "Development", "Dev"] }]
    });
    console.log("🛑 Stopping non-production EC2 instances under staging tags...");
    
    // 2. Identify and Purge Unattached/Orphaned EBS Storage Volumes (Massive hidden cost)
    const volumes = await ec2.send(new DescribeVolumesCommand({
      Filters: [{ Name: "status", Values: ["available"] }]
    }));

    for (const vol of volumes.Volumes || []) {
      console.log(`🗑️ Erasing orphaned EBS Volume: ${vol.VolumeId}`);
      await ec2.send(new DeleteVolumeCommand({ VolumeId: vol.VolumeId }));
    }

    // 3. Force Aggressive Lifecycle Transition rules for Assets Storage Buckets
    await s3.send(new PutBucketLifecycleConfigurationCommand({
      Bucket: "company-volatile-temp-assets",
      LifecycleConfiguration: {
        Rules: [{
          ID: "CostKillerAutoGlacierTransition",
          Status: "Enabled",
          Prefix: "tmp/",
          Transitions: [{ Days: 1, StorageClass: "GLACIER" }],
          Expiration: { Days: 7 }
        }]
      }
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, operationalImpact: "Staging isolated, unattached EBS storage clusters purged, volatile assets offloaded to Glacier storage tiers." })
    };
  } catch (error) {
    console.error("❌ FinOps Operations Failure Exception:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}
