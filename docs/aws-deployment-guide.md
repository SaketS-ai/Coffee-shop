# Social Cup AWS Deployment & Production Architecture Guide

This guide documents the technical configuration required to deploy Social Cup to Amazon Web Services (AWS) using a cost-effective, high-reliability architecture.

---

## 1. Frontend SPA Deployment (AWS S3 + CloudFront)

The frontend is a Single-Page Application (SPA) built with React and `BrowserRouter`.

### The SPA Routing Problem
In an SPA, navigation routes like `/app/cafes/123`, `/admin/users`, or `/barista/scanner` are handled entirely inside the user's browser by React Router. When a user navigates directly to these URLs or refreshes the page, the browser requests the literal path from the host.

On S3, `/app/cafes/123` does not exist as a physical object, causing S3 to return `403 AccessDenied` or `404 NoSuchKey`.

### Solution: CloudFront Custom Error Responses
Configure CloudFront with the following custom error responses to redirect all deep links back to `/index.html`:

1. Open the **CloudFront Console** -> Select your Distribution -> **Error pages** -> **Create custom error response**.
2. **First rule:**
   - **HTTP error code:** `403: Forbidden`
   - **Customize error response:** `Yes`
   - **Response page path:** `/index.html`
   - **HTTP response code:** `200: OK`
   - **Error caching minimum TTL:** `0`
3. **Second rule:**
   - **HTTP error code:** `404: Not Found`
   - **Customize error response:** `Yes`
   - **Response page path:** `/index.html`
   - **HTTP response code:** `200: OK`
   - **Error caching minimum TTL:** `0`

### Alternative: CloudFront Function (Viewer Request)
You can also attach a lightweight CloudFront Function on Viewer Request:
```javascript
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    // If request has no file extension (not .js, .css, .png, etc.), rewrite to index.html
    if (!uri.includes('.')) {
        request.uri = '/index.html';
    }
    return request;
}
```

### Alternative: Nginx Fallback (Containerized Frontend)
If serving the frontend containerized via Nginx:
```nginx
location / {
    root /usr/share/nginx/html;
    index index.html index.htm;
    try_files $uri $uri/ /index.html;
}
```

### Frontend Build Environment (Dual Frontend SPAs)
The platform now has two independent frontend applications:
1. **Member Application (`apps/member`):** Customer pass, discovery, and QR vouchers.
2. **Operations Application (`apps/operations`):** Admin console and cafe counter terminal.

Before executing builds, set your API endpoint:
```bash
export VITE_API_URL="https://api.socialcup.com/api"

# Build Member Application (deploys to app.socialcup.com S3 bucket)
npm run build:member

# Build Operations Application (deploys to ops.socialcup.com S3 bucket)
npm run build:operations

# Or build both simultaneously
npm run build
```
Upload the respective `dist/` outputs (`apps/member/dist` and `apps/operations/dist`) to their S3 buckets. Ensure hashed assets (`assets/*`) are cached with `Cache-Control: public, max-age=31536000, immutable`, and `index.html` is uploaded with `Cache-Control: no-cache, no-store, must-revalidate`.

---

## 2. Backend Container Deployment (AWS ECS Fargate or App Runner)

### Single-Instance Architecture (Phase 11 MVP)
- Deploy the Express backend on AWS ECS Fargate or AWS App Runner as a single container instance (0.5 vCPU, 1 GB RAM).
- Place an **AWS Application Load Balancer (ALB)** in front of the container.
- Set `TRUST_PROXY=true` in container environment variables.
- Configure ALB Target Group Health Check:
  - **Health check path:** `/api/health/live` (shallow probe; does not stress the database).
  - **Success code:** `200`

### S3 File Storage Setup
1. Create an S3 Bucket: `socialcup-media-prod`.
2. Disable Block Public Access (or configure a CloudFront distribution with Origin Access Control (OAC) to serve files).
3. CORS Policy on the Bucket:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["https://socialcup.com", "https://app.socialcup.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```
4. IAM Permissions for ECS Task Role:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::socialcup-media-prod/*"
    }
  ]
}
```

### SES Transactional Email Setup
1. Verify sending domain `socialcup.com` in Amazon SES.
2. Add the required DKIM (CNAME), SPF (TXT), and MX records in Route 53.
3. Move SES out of Sandbox mode by submitting a production access request in the AWS Console.
4. IAM Permissions for ECS Task Role:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 3. Database Deployment (AWS RDS PostgreSQL)

### Connection String Formatting
AWS RDS PostgreSQL requires SSL and explicit connection management. Configure `DATABASE_URL` as follows:
```
DATABASE_URL="postgresql://dbadmin:YOUR_PASSWORD@socialcup-db.c123456789.us-east-1.rds.amazonaws.com:5432/socialcup?sslmode=require&connection_limit=15&pool_timeout=15"
```
- `sslmode=require`: Enforces TLS encryption in transit.
- `connection_limit=15`: Restricts Prisma's pool so the container does not exhaust RDS connection limits.

### Database Migrations
Run migrations during CI/CD or ECS task deployment using the Prisma CLI:
```bash
npx prisma migrate deploy
```

---

## 4. Background Scheduler Scaling Strategy

### Single-Instance Mode
- Set `ENABLE_SCHEDULER=true`.
- The in-process `node-cron` sweeps membership renewal every 15 minutes and expired redemption codes every 5 minutes.

### Future Multi-Instance Horizontal Scaling
If the backend is scaled horizontally across 2 or more instances behind an ALB:
1. Set `ENABLE_SCHEDULER=false` on all web API instances.
2. Option A: Use **Amazon EventBridge** scheduled rules to trigger a standalone scheduled ECS Fargate Task or AWS Lambda.
3. Option B: Introduce PostgreSQL transaction-level advisory locks (`SELECT pg_try_advisory_xact_lock(...)`) inside the job functions so only one instance acquires the execution lock.

---

## 5. Security Architecture Review: JWT Storage

### Current Architecture (`localStorage`)
- The frontend currently stores the JWT access token in browser `localStorage` (`social_cup_auth_token`).
- **Benefits:** Simple, stateless, compatible with mobile WebView wrappers, requires no CSRF tokens.
- **Risks:** Vulnerable to exfiltration if a cross-site scripting (XSS) vulnerability exists in frontend dependencies.

### Future Migration Roadmap: `httpOnly` Secure Cookies
To achieve banking-grade token security:
1. **Backend Changes:**
   - Install `cookie-parser`.
   - On `/api/auth/login` and `/api/auth/register`, set the JWT in a `Set-Cookie` header:
     `res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 })`.
   - Update `requireAuth` middleware to read token from `req.cookies.token || req.headers.authorization`.
   - Implement CSRF protection (e.g. Double Submit Cookie pattern or `csurf`/custom header verification).
2. **Frontend Changes:**
   - Configure `fetch` in `src/services/api.ts` to pass `credentials: 'include'`.
   - Remove `authToken.get()` from `Authorization` header.
3. *Note:* Migrating cookies across different top-level domains (e.g. `app.socialcup.com` to `api.socialcup.com`) requires configuring `cookie.domain = '.socialcup.com'`.
