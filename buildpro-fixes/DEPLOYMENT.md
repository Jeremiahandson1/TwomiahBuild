# BuildPro Deployment Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Docker & Docker Compose (for containerized deployment)
- Domain with SSL certificate

## Environment Variables

### Backend

```env
# ── Required ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host:5432/buildpro
JWT_SECRET=<64-character-random-string>
JWT_REFRESH_SECRET=<64-character-random-string>
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# ── Storage (CRITICAL — defaults to local disk which is EPHEMERAL on Render) ──
# Set to "s3" and configure R2/S3 variables below before go-live.
STORAGE_BACKEND=s3

# Cloudflare R2 (recommended)
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret-key>
R2_BUCKET_NAME=buildpro-uploads
R2_PUBLIC_URL=https://<your-r2-subdomain>.r2.dev

# AWS S3 (alternative to R2)
# S3_BUCKET=buildpro-uploads
# S3_REGION=us-east-1
# S3_ACCESS_KEY_ID=<aws-access-key>
# S3_SECRET_ACCESS_KEY=<aws-secret>

# ── Security ──────────────────────────────────────────────────────────────────
# 64-char hex string used to encrypt sensitive fields (Twilio creds, etc.)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
FIELD_ENCRYPTION_KEY=<64-char-hex>

# ── Error Monitoring (Sentry) ─────────────────────────────────────────────────
# Strongly recommended before first paying customer.
# Get DSN from https://sentry.io → New Project → Node.js
# Install: npm install @sentry/node  (already in package.json reminder)
SENTRY_DSN=https://<key>@sentry.io/<project-id>

# ── Push Notifications (VAPID) ────────────────────────────────────────────────
# Generate: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=<vapid-public>
VAPID_PRIVATE_KEY=<vapid-private>
VAPID_SUBJECT=mailto:support@your-domain.com

# ── Email ─────────────────────────────────────────────────────────────────────
SENDGRID_API_KEY=<your-sendgrid-key>
FROM_EMAIL=noreply@your-domain.com

# ── Twilio SMS ────────────────────────────────────────────────────────────────
TWILIO_ACCOUNT_SID=<twilio-sid>
TWILIO_AUTH_TOKEN=<twilio-token>
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# ── Stripe ────────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ── Operations ────────────────────────────────────────────────────────────────
# Confirms you have verified that automated DB backups are enabled on Render.
DB_BACKUPS_CONFIRMED=true
LOG_LEVEL=info
UPLOAD_DIR=/app/uploads
```

### Frontend

```env
VITE_API_URL=https://api.your-domain.com

# Error monitoring (Sentry) — matches your Sentry React project DSN
VITE_SENTRY_DSN=https://<key>@sentry.io/<project-id>

# Expo push notifications project ID (for mobile — also set in app.json)
EXPO_PUBLIC_PROJECT_ID=<your-expo-project-id>
```

## Deployment Options

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/your-org/buildpro.git
cd buildpro

# 2. Create .env file
cp .env.example .env
# Edit .env with your values

# 3. Build and start
docker-compose up -d --build

# 4. Run migrations
docker-compose exec backend npx prisma migrate deploy

# 5. (Optional) Seed demo data
docker-compose exec backend npm run db:seed
```

### Option 2: Render

#### Backend (Web Service)
1. Create new Web Service
2. Connect to GitHub repository
3. Set root directory: `backend`
4. Build command: `npm install && npx prisma generate`
5. Start command: `npm start`
6. Add environment variables
7. Add PostgreSQL database

#### Frontend (Static Site)
1. Create new Static Site
2. Connect to GitHub repository
3. Set root directory: `frontend`
4. Build command: `npm install && npm run build`
5. Publish directory: `dist`
6. Add environment variables

### Option 3: Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

### Option 4: Kubernetes

```yaml
# Example deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: buildpro-backend
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: backend
        image: ghcr.io/your-org/buildpro/backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: buildpro-secrets
              key: database-url
```

## SSL/TLS Configuration

### Using Caddy (Recommended)

```caddyfile
api.your-domain.com {
    reverse_proxy backend:3001
}

your-domain.com {
    root * /var/www/buildpro
    try_files {path} /index.html
    file_server
}
```

### Using nginx

```nginx
server {
    listen 443 ssl http2;
    server_name api.your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## Database Migrations

```bash
# Generate migration
npx prisma migrate dev --name <migration-name>

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development only!)
npx prisma migrate reset
```

## Monitoring

### Health Check Endpoints

- Backend: `GET /health`
- Frontend: `GET /health`

### Logging

Logs are written to stdout (console), which Render captures automatically.
File-based logs are disabled in production to prevent ephemeral disk loss.

To add persistent log draining, connect one of these from the Render dashboard:
- **Logtail** (Better Stack) — free tier, excellent search
- **Papertrail** — simple, free tier available
- **Datadog Logs** — if you're already using Datadog APM

### Error Monitoring (Sentry)

Set `SENTRY_DSN` (backend) and `VITE_SENTRY_DSN` (frontend) in your Render
environment variables. You'll know about errors in production before your
customers have to tell you.

## Backup Strategy

### Database

```bash
# Manual backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup-20240315.sql
```

### Uploads

```bash
# Sync to S3
aws s3 sync ./uploads s3://your-bucket/buildpro-uploads
```

## Scaling

### Horizontal Scaling

1. Use a load balancer (nginx, HAProxy, cloud LB)
2. Configure session affinity for WebSockets
3. Use Redis for session storage

### Database Scaling

1. Add read replicas
2. Use connection pooling (PgBouncer)
3. Enable query caching

## Troubleshooting

### Common Issues

1. **WebSocket disconnections**
   - Check proxy timeout settings
   - Ensure sticky sessions are enabled

2. **File upload failures**
   - Check upload directory permissions
   - Verify nginx client_max_body_size

3. **Database connection errors**
   - Check connection pool size
   - Verify SSL certificate paths

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm start
```
