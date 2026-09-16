# Social Cup — Phase 12: AWS Infrastructure Setup Runbook

Status: **NOT STARTED — no AWS resources created yet.** This environment has no AWS CLI
and no credentials configured, so nothing in this document has been executed. Everything
below is instructions for you to run (Console steps + equivalent CLI commands), or for me
to run once you've given me a way to authenticate that doesn't expose your secret key in
chat (see "Getting me AWS access" below).

Scope discipline, per the brief: infrastructure only. Nothing here deploys the app,
clones the repo onto EC2, runs migrations, or starts PM2. No ECS/Fargate/ALB/RDS Proxy/WAF.

---

## Getting me AWS access (do this first, safely)

Do **not** paste an AWS access key/secret into this chat.

1. In AWS Console → IAM → Users → create a user (e.g. `social-cup-cli-admin`) for this
   setup work only. Attach `AdministratorAccess` **temporarily** (you'll delete this user
   once infra is built — the EC2 role that actually runs in production gets a tightly
   scoped policy, see Step 8, not this one).
2. Create an access key for that user (Console → that user → Security credentials →
   Create access key → "Command Line Interface (CLI)").
3. On your own machine, in your own terminal (not asking me to run it), run:
   ```
   aws configure --profile social-cup
   ```
   and paste the key/secret when prompted. This writes to `~/.aws/credentials` and never
   appears in this conversation.
4. Tell me the profile name (`social-cup`) and I'll use `--profile social-cup` on every
   AWS CLI command from here on.
5. Once infrastructure is built, delete the temporary admin user/key (Step 1's user) —
   it should not persist.

If you'd rather do all of this yourself via Console, every step below has exact Console
instructions too.

---

## Step 1 — Account safety checks (run these first, either of us)

```bash
aws sts get-caller-identity --profile social-cup
aws configure get region --profile social-cup
aws ec2 describe-regions --profile social-cup --query 'Regions[].RegionName' --output table
aws ec2 describe-instances --profile social-cup --query 'Reservations[].Instances[].[InstanceId,State.Name,InstanceType]' --output table
aws rds describe-db-instances --profile social-cup --query 'DBInstances[].[DBInstanceIdentifier,DBInstanceStatus,Engine]' --output table
aws s3 ls --profile social-cup
aws iam list-roles --profile social-cup --query 'Roles[].RoleName' --output table
aws iam list-users --profile social-cup --query 'Users[].UserName' --output table
```

These are all **read-only** — safe to run anytime, tell you exactly what already exists
before anything new gets created. Nothing here deletes or modifies anything.

**Recommended region: `us-east-1` (N. Virginia).** Reasons: cheapest region for
EC2/RDS/S3/data-transfer, full SES support without extra setup, and it's already the
default baked into `backend/.env.example` (`AWS_REGION=us-east-1`), so no code changes
needed. Use this same region for every resource below — EC2, RDS, S3, SES, CloudFront
(CloudFront is global but its origin/config still needs a home region for the S3 bucket).

---

## Step 2 — Billing protection (Console — budgets aren't easily scriptable safely)

Console steps:
1. AWS Console → **Billing and Cost Management** → **Budgets** → **Create budget**.
2. Template: "Zero spend budget" is a good start for a dev account, or a custom
   **Cost budget**: $10–$20/month is plenty of headroom for this MVP's footprint
   (t3/t4g.micro EC2 + db.t3.micro RDS + minimal S3/CloudFront/SES = usually low single
   digits per month within Free Tier, more once Free Tier expires — see cost table below).
3. Set an alert threshold at 80% and 100% of the budget, email notification to yourself.
4. Also enable: Billing preferences → check **"Receive Free Tier Usage Alerts"** and
   **"Receive Billing Alerts"**.

CLI equivalent (if you'd rather I do it):
```bash
aws budgets create-budget --profile social-cup --account-id <ACCOUNT_ID> --budget '{
  "BudgetName": "social-cup-dev-monthly",
  "BudgetLimit": {"Amount": "20", "Unit": "USD"},
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}' --notifications-with-subscribers '[{
  "Notification": {"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80},
  "Subscribers": [{"SubscriptionType":"EMAIL","Address":"<YOUR_EMAIL>"}]
}]'
```

---

## Step 3 — S3 bucket for media

Pick a globally-unique name. Suggested: `social-cup-media-<your-account-id>` (account ID
is always unique, so this can't collide with anyone else's bucket).

```bash
aws s3api create-bucket \
  --profile social-cup --region us-east-1 \
  --bucket social-cup-media-<ACCOUNT_ID>

aws s3api put-public-access-block \
  --profile social-cup --bucket social-cup-media-<ACCOUNT_ID> \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api put-bucket-encryption \
  --profile social-cup --bucket social-cup-media-<ACCOUNT_ID> \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

Versioning is optional per the brief — skip it for MVP (keeps cost/complexity down;
turn on later if accidental-overwrite protection becomes a real concern).

Console equivalent: S3 → Create bucket → name it → Region `us-east-1` → leave
"Block all public access" checked (default) → enable default encryption (SSE-S3) →
Create.

**No bucket policy yet** — that gets added in Step 4 once CloudFront's OAC exists, and
it will only grant CloudFront read access, never public access.

---

## Step 4 — CloudFront in front of the private bucket

This one is easiest via Console because OAC setup auto-generates and can
auto-attach the correct bucket policy:

1. CloudFront → **Create distribution**.
2. Origin domain: select your `social-cup-media-<ACCOUNT_ID>` bucket from the dropdown.
3. Origin access: **Origin access control settings (recommended)** → Create new OAC →
   defaults are fine (Sign requests, SigV4).
4. When prompted, click **"Copy policy"** / **"Update bucket policy"** — this is
   CloudFront generating the exact least-privilege bucket policy (allows only
   `cloudfront.amazonaws.com` with a `SourceArn` condition scoped to this one
   distribution) and offering to attach it for you. Accept it.
5. Viewer protocol policy: **Redirect HTTP to HTTPS**.
6. Price class: **Use only North America and Europe** (cheapest, fine for a Dallas-based
   member base).
7. Create distribution (takes 5–15 minutes to deploy).

CLI equivalent is possible but the OAC + bucket-policy wiring is fiddly and error-prone
scripted — Console is the recommended path here, matching the brief's allowance for
"exact console instructions" where automation isn't the safer choice.

**Document once created:**
- CloudFront distribution ID: `_____________`
- CloudFront domain (e.g. `d1234abcd.cloudfront.net`): `_____________`
- S3 bucket name: `social-cup-media-<ACCOUNT_ID>`
- Backend env var to set: `AWS_CLOUDFRONT_URL=https://<distribution-domain>`
  (note: the code reads `AWS_CLOUDFRONT_URL`, not `AWS_CLOUDFRONT_DOMAIN` — see
  `backend/src/config/env.ts` line 29 and `.env.example` — use the exact name below in
  Step 12, whatever a description elsewhere calls it).

---

## Step 5 — RDS PostgreSQL

```bash
aws rds create-db-subnet-group \
  --profile social-cup --db-subnet-group-name social-cup-db-subnet \
  --db-subnet-group-description "Social Cup RDS subnet group (default VPC)" \
  --subnet-ids <SUBNET_ID_1> <SUBNET_ID_2>   # at least 2 AZs from the default VPC — see Step 10

aws rds create-db-instance \
  --profile social-cup \
  --db-instance-identifier social-cup-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16 \
  --master-username socialcup_admin \
  --master-user-password '<CHOOSE_A_STRONG_PASSWORD_YOURSELF>' \
  --allocated-storage 20 \
  --storage-type gp3 \
  --db-subnet-group-name social-cup-db-subnet \
  --vpc-security-group-ids <RDS_SECURITY_GROUP_ID>   # created in Step 6 \
  --no-publicly-accessible \
  --backup-retention-period 7 \
  --storage-encrypted \
  --no-multi-az \
  --db-name socialcup
```

Notes:
- `db.t3.micro` is the Free-Tier-eligible instance class for RDS (750 hrs/month free for
  12 months on a new account); 20 GB gp3 storage is the minimum sensible size and also
  Free-Tier-eligible.
- `--no-multi-az` — Single-AZ, as specified, keeps cost down (Multi-AZ roughly doubles
  RDS cost).
- `--no-publicly-accessible` is non-negotiable per the brief — never expose Postgres
  directly.
- Password: choose it yourself, don't have me generate or see it. You'll build the
  `DATABASE_URL` from it later (Step 12) — never pasted into this chat.
- Prisma requires PostgreSQL 12+; 16 is a solid current LTS-ish choice.

Console equivalent: RDS → Create database → Standard create → PostgreSQL → version 16 →
Templates: **Free tier** (this auto-picks safe defaults matching most of the above) →
set DB instance identifier `social-cup-db` → master username/password → under
Connectivity, VPC = default, "Public access" = **No**, VPC security group = create new or
pick the one from Step 6 → Additional configuration: initial database name `socialcup`,
enable encryption, backup retention 7 days → Create database.

**Document once created:**
- RDS endpoint: `_____________.rds.amazonaws.com`
- Port: `5432`
- DB name: `socialcup`

---

## Step 6 — Security groups

Two security groups, referencing each other (not CIDR ranges) so only the app tier can
ever reach the database tier:

**`social-cup-ec2-sg`** (attached to the EC2 instance):
| Direction | Protocol | Port | Source | Purpose |
|---|---|---|---|---|
| Inbound | TCP | 22 | Your IP only (`<your-ip>/32`) — see Step 7 note | SSH |
| Inbound | TCP | 80 | `0.0.0.0/0` | HTTP (redirects to HTTPS) |
| Inbound | TCP | 443 | `0.0.0.0/0` | HTTPS (Nginx) |
| Outbound | All | All | `0.0.0.0/0` | default, needed for npm/apt/AWS SDK calls |

**`social-cup-rds-sg`** (attached to the RDS instance):
| Direction | Protocol | Port | Source | Purpose |
|---|---|---|---|---|
| Inbound | TCP | 5432 | `social-cup-ec2-sg` (security-group reference, **not** a CIDR) | Postgres, EC2 only |

```bash
VPC_ID=<your-default-vpc-id>

EC2_SG=$(aws ec2 create-security-group --profile social-cup \
  --group-name social-cup-ec2-sg --description "Social Cup EC2" --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

RDS_SG=$(aws ec2 create-security-group --profile social-cup \
  --group-name social-cup-rds-sg --description "Social Cup RDS" --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress --profile social-cup --group-id $EC2_SG \
  --protocol tcp --port 22 --cidr <YOUR_IP>/32
aws ec2 authorize-security-group-ingress --profile social-cup --group-id $EC2_SG \
  --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --profile social-cup --group-id $EC2_SG \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress --profile social-cup --group-id $RDS_SG \
  --protocol tcp --port 5432 --source-group $EC2_SG
```

Never `0.0.0.0/0` on port 5432 — confirmed absent above by construction (source is a
security-group ID, not a CIDR).

---

## Step 7 — EC2 instance (infrastructure only — app is NOT deployed)

Instance type: `t3.micro` (Free Tier: 750 hrs/month for 12 months) or `t4g.micro`
(Graviton/ARM — slightly cheaper post-Free-Tier, marginally cheaper compute, fine for
Node; just make sure the AMI is an ARM64 image if you pick this).

AMI: Ubuntu 22.04 LTS (or Amazon Linux 2023 — either is fine; instructions below assume
Ubuntu).

```bash
aws ec2 create-key-pair --profile social-cup --key-name social-cup-key \
  --query 'KeyMaterial' --output text > social-cup-key.pem
chmod 400 social-cup-key.pem   # keep this file safe, it's your SSH private key
```

User-data script (installs Node/npm/Git/PM2/Nginx only — does **not** touch the app):

```bash
cat > ec2-userdata.sh <<'EOF'
#!/bin/bash
set -e
apt-get update -y
apt-get install -y git nginx curl

# Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

npm install -g pm2

# Nginx: reverse proxy 443/80 -> Node on 5000 (cert not configured yet - that's a later phase)
cat > /etc/nginx/sites-available/social-cup <<'NGINX'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/social-cup /etc/nginx/sites-enabled/social-cup
systemctl restart nginx
systemctl enable nginx
EOF

aws ec2 run-instances --profile social-cup \
  --image-id <UBUNTU_22_04_AMI_ID_FOR_us-east-1> \
  --instance-type t3.micro \
  --key-name social-cup-key \
  --security-group-ids $EC2_SG \
  --user-data file://ec2-userdata.sh \
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=20,VolumeType=gp3}' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=social-cup-backend}]'
```

(Look up the current Ubuntu 22.04 AMI ID for `us-east-1` at
https://cloud-images.ubuntu.com/locator/ec2/ at the time you run this — it changes
periodically.)

Port 5000 (Node) is **not** opened in the security group — only Nginx (80/443) is
internet-facing, matching `Internet → Nginx :443 → Node :5000`. HTTPS/TLS cert
(Let's Encrypt via certbot) is a small follow-up once you have a domain or are ready to
use the EC2 public DNS name — not done here since Step 11 says no custom domain yet.

SSH restricted to `<YOUR_IP>/32` rather than `0.0.0.0/0` — tighten this to your actual
current public IP; if it changes (e.g., different network), you'll need to update the
security group rule.

**Document once created:**
- Instance ID: `_____________`
- Public IP / DNS: `_____________`

---

## Step 8 — IAM role for EC2 (least privilege — no access keys on the box)

Trust policy (`ec2-trust-policy.json`):
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ec2.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
```

Permissions policy (`social-cup-ec2-policy.json`) — scoped to exactly what the code
calls today (`PutObjectCommand` in `storage.service.ts`, `SendEmailCommand` in
`email.service.ts` — no GetObject/DeleteObject/ListBucket in the codebase yet, so they're
omitted per least-privilege; add them later only if a feature actually needs them):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SocialCupS3Upload",
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::social-cup-media-<ACCOUNT_ID>/*"
    },
    {
      "Sid": "SocialCupSesSend",
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*",
      "Condition": {
        "StringEquals": { "ses:FromAddress": "noreply@socialcup.com" }
      }
    }
  ]
}
```
(Swap `noreply@socialcup.com` for whatever `EMAIL_FROM` you actually verify in Step 9.)

```bash
aws iam create-role --profile social-cup \
  --role-name social-cup-ec2-role \
  --assume-role-policy-document file://ec2-trust-policy.json

aws iam put-role-policy --profile social-cup \
  --role-name social-cup-ec2-role \
  --policy-name social-cup-ec2-policy \
  --policy-document file://social-cup-ec2-policy.json

aws iam create-instance-profile --profile social-cup \
  --instance-profile-name social-cup-ec2-profile

aws iam add-role-to-instance-profile --profile social-cup \
  --instance-profile-name social-cup-ec2-profile \
  --role-name social-cup-ec2-role

# Attach to the already-running instance (or pass --iam-instance-profile at run-instances time):
aws ec2 associate-iam-instance-profile --profile social-cup \
  --instance-id <INSTANCE_ID> \
  --iam-instance-profile Name=social-cup-ec2-profile
```

No `AdministratorAccess`, no access keys stored anywhere on the instance — the AWS SDK
in `storage.service.ts`/`email.service.ts` automatically picks up instance-profile
credentials when `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` are left unset (confirmed in
code: both files only add explicit credentials `if (env.awsAccessKeyId && ...)`,
otherwise the SDK falls back to its default credential chain, which includes the EC2
instance profile).

---

## Step 9 — SES

1. SES Console (region `us-east-1`) → **Verified identities** → **Create identity**.
2. Verify either a single email address (fastest — click a confirmation link) or your
   whole domain (needs DNS TXT/CNAME/DKIM records — better long-term, do this once you
   have a real domain).
3. Set `EMAIL_FROM` (Step 12) to exactly the verified address/domain.
4. **Sandbox limitation**: new SES accounts start in the sandbox — you can only send
   *to* addresses you've also verified, capped at low volume. To send to arbitrary real
   member emails, you must request **Production access**: SES Console → Account
   dashboard → "Request production access" → fill the use-case form (transactional:
   verification links, password resets, receipts) → AWS reviews manually, typically
   24 hours. **This is a manual request I cannot complete for you or fake as done** —
   document it as an open action item.

**Document:**
- Sender identity: `_____________` (verified? yes/no)
- Region: `us-east-1`
- Sandbox status: sandbox / production access requested on `<date>` / production

---

## Step 10 — Networking (default VPC)

```bash
aws ec2 describe-vpcs --profile social-cup --filters Name=isDefault,Values=true \
  --query 'Vpcs[0].VpcId' --output text
aws ec2 describe-subnets --profile social-cup --filters Name=vpc-id,Values=<VPC_ID> \
  --query 'Subnets[].[SubnetId,AvailabilityZone]' --output table
```
For an MVP, the default VPC is suitable — it already has subnets across multiple AZs
(needed for the RDS subnet group in Step 5) and internet connectivity via its default
Internet Gateway. No NAT Gateway needed (that's only for private-subnet outbound
internet access, which nothing here requires — EC2 is in a public subnet with a public
IP, RDS is only reached privately by EC2 via the security-group rule from Step 6). This
keeps cost down per Step 13's guidance.

---

## Step 11 — Domain

Skipping per the brief. For now, the app will be reached via:
- Backend: EC2 public DNS (e.g. `ec2-xx-xx-xx-xx.compute-1.amazonaws.com`) or public IP,
  proxied through Nginx on port 80/443 (self-signed or no TLS until a domain exists —
  note HTTPS without a real domain means no trusted cert; that's an accepted gap for
  this phase, to close when a domain is added).
- Frontend: Amplify's generated `*.amplifyapp.com` domain (Amplify setup itself is a
  separate, later step per the architecture diagram — not covered in this
  infrastructure-only phase since Amplify's GitHub connection is closer to "deployment").
- Images: the CloudFront domain from Step 4.

---

## Step 12 — Environment variable checklist

Backend (verified against `backend/src/config/env.ts` — only vars actually read by the
app are listed; nothing speculative):

| Variable | Required? | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | From RDS: `postgresql://socialcup_admin:<PASSWORD>@<rds-endpoint>:5432/socialcup?sslmode=require` |
| `JWT_SECRET` | Yes | Generate fresh for production: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` — never reuse the local dev one |
| `CLIENT_URL` | Yes | Comma-separated allowed origins, e.g. the Amplify domain |
| `JWT_EXPIRES_IN` | No (default `7d`) | |
| `PORT` | No (default `5000`) | |
| `NODE_ENV` | Yes | `production` |
| `TRUST_PROXY` | No (auto-true in production) | Leave unset; `env.ts` already sets true when `NODE_ENV=production` |
| `ENABLE_SCHEDULER` | Yes | `true` (single EC2 instance — fine per code's own comment; only set `false` if you ever run more than one instance) |
| `AWS_REGION` | Yes | `us-east-1` |
| `AWS_S3_BUCKET` | Yes | `social-cup-media-<ACCOUNT_ID>` |
| `AWS_CLOUDFRONT_URL` | Yes | `https://<cloudfront-domain>` (**note the exact name** — code reads `AWS_CLOUDFRONT_URL`, not `AWS_CLOUDFRONT_DOMAIN`) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | **No — leave unset** | EC2 instance profile (Step 8) supplies credentials automatically |
| `ENABLE_SES` | Yes | `true` |
| `EMAIL_FROM` | Yes | Must exactly match the SES-verified identity from Step 9 |
| `AWS_SES_REGION` | No (defaults to `AWS_REGION`) | |
| `AUTH_RATE_LIMIT_WINDOW_MS` / `AUTH_RATE_LIMIT_MAX` | No | Defaults are reasonable (15 min / 20 attempts) |

Frontend:

| Variable | Notes |
|---|---|
| `VITE_API_URL` | `https://<your-backend-domain-or-ec2-dns>/api` |

None of these get committed to GitHub. Once EC2 is ready to actually receive the app
(next phase), they'd live in a `.env` file on the instance (not in the repo) — or, if you
want to go a step further later, AWS Systems Manager Parameter Store / Secrets Manager,
as `.env.example` itself already suggests.

---

## Step 13 — Cost control / estimate

Everything above deliberately avoids: NAT Gateway, Load Balancer, ECS, Fargate, RDS
Proxy, Multi-AZ, large instance sizes, extra CloudWatch dashboards/alarms.

Rough monthly estimate (`us-east-1`, first 12 months with Free Tier, then after):

| Resource | Free Tier (12 mo) | After Free Tier |
|---|---|---|
| EC2 `t3.micro` | $0 (750 hrs/mo free) | ~$7.50/mo |
| RDS `db.t3.micro`, 20GB gp3, single-AZ | $0 (750 hrs/mo free) | ~$13/mo |
| S3 (a few GB of images) | ~$0 | ~$0.10–0.50/mo |
| CloudFront | $0 (1TB/mo free, forever, not just 12mo) | ~$0 at this scale |
| SES | $0.10 per 1,000 emails after first 62k/mo from EC2 | negligible |
| Data transfer out | small amounts free | a few cents at MVP scale |

**Estimated total: effectively $0/month for the first 12 months**, then roughly
**$20–25/month** after Free Tier expires, at MVP-level traffic. Nothing above should
trigger a cost surprise; if you ever change an instance size or add Multi-AZ, re-check
this table first.

---

## Step 14 — Explicitly NOT done in this phase

Confirmed not performed, per the brief:
- No `git clone` of the app onto EC2
- No `npm install` of the app
- No Prisma migrations run against RDS
- No PM2 start of the backend
- No frontend deployed to Amplify
- No frontend pointed at a production backend
- No production data migrated

---

## Step 15 — Verification checklist (fill in once each step is actually run)

- [ ] S3 bucket exists, private, public access blocked, encryption enabled
- [ ] CloudFront distribution deployed, HTTPS works, OAC configured, bucket policy scoped to that one distribution
- [ ] RDS available, not publicly accessible, security group allows only the EC2 SG
- [ ] EC2 running, SSH reachable from your IP, Nginx/Node/PM2/Git installed (no app deployed)
- [ ] IAM role attached to EC2, least privilege confirmed, no `AdministratorAccess`, no access keys on the box
- [ ] SES sender verified, sandbox/production status documented
- [ ] Budget alert configured
- [ ] Temporary admin IAM user (from "Getting me AWS access") deleted once the above is done

---

## Final report template (fill in as each step completes)

1. AWS region selected: `us-east-1`
2. AWS resources created: *(none yet — pending your go-ahead / access)*
3. S3 bucket name: `social-cup-media-<ACCOUNT_ID>` *(planned)*
4. CloudFront distribution/domain: *(pending)*
5. RDS instance/endpoint: `social-cup-db` *(pending)*
6. EC2 instance ID: *(pending)*
7. EC2 public IP/DNS: *(pending)*
8. Security groups created: `social-cup-ec2-sg`, `social-cup-rds-sg` *(planned, not yet created)*
9. IAM role created: `social-cup-ec2-role` *(planned)*
10. SES verification status: *(pending — manual SES production-access request required, see Step 9)*
11. Environment variables required: see Step 12 table above
12. Estimated cost: ~$0/mo for 12 months (Free Tier), ~$20–25/mo after — see Step 13
13. Requires manual AWS Console action: CloudFront + OAC setup (Step 4), SES domain/production-access request (Step 9), budget alert (Step 2)
14. Anything that failed: N/A — nothing attempted yet due to no AWS access
15. Security concerns: none introduced; the runbook itself enforces private RDS, private S3, no root/admin keys on EC2, least-privilege IAM
