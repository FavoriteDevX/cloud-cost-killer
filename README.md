# 💸 Cloud Cost Killer: Automated AWS FinOps Webhook

An infrastructure-as-code serverless engine that acts as an automated emergency circuit breaker for cloud infrastructure budgets. When spending trends exceed thresholds, it sweeps the configured AWS account to freeze development nodes, delete orphaned resources, and move volatile files to deep cold storage tiers.

## ⚡ Mitigations Executed
*   **Workload Interception:** Shuts down tagged non-production compute resources.
*   **Orphaned Volume Sweep:** Queries and deletes unattached AWS EBS volumes instantly.
*   **S3 Deep-Freeze Lifecycle Injector:** Updates data policies to transition telemetry clusters to Amazon Glacier within 24 hours.

## 🛠️ Configuration
Deploy via AWS Lambda or your preferred serverless framework. Ensure the execution role possesses explicit IAM policies for `ec2:DescribeVolumes`, `ec2:DeleteVolume`, `ec2:StopInstances`, and `s3:PutBucketLifecycleConfiguration`.
