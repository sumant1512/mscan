# Subdomain Routing Migration Guide

## Overview

This guide helps you migrate your existing TMS System installation to use subdomain-based tenant routing. With subdomain routing, each tenant gets their own unique subdomain (e.g., `acme.mscan.com` instead of `mscan.com/tenant/acme`).

## Benefits of Subdomain Routing

- **Better tenant isolation**: Each tenant feels like they have their own application
- **Improved security**: Subdomain-based authentication and CORS policies
- **Cleaner URLs**: `acme.mscan.com/dashboard` vs `mscan.com/tenant/acme/dashboard`
- **Scalability**: Easier to implement per-tenant CDN, caching, and rate limiting
- **Professional appearance**: Tenants get branded URLs

## Migration Steps

### Phase 1: Backup & Preparation

#### 1.1 Backup Your Database
```bash
# Create a full database backup
pg_dump -U postgres mscan_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql
```

#### 1.2 Update Application Code
```bash
cd mscan
git pull origin main  # Or your branch with subdomain support

# Backend
cd mscan-server
npm install

# Frontend
cd ../mscan-client
npm install
```

### Phase 2: Database Migration

#### 2.1 Run Schema Migration
The subdomain_slug column should already exist if you're using the latest schema. Verify:

```bash
psql -U postgres -d mscan_db -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'subdomain_slug';"
```

Expected output:
```
 column_name    | data_type
----------------+-----------
 subdomain_slug | character varying
```

If the column doesn't exist, run:
```bash
psql -U postgres -d mscan_db -c "ALTER TABLE tenants ADD COLUMN subdomain_slug VARCHAR(100) UNIQUE;"
psql -U postgres -d mscan_db -c "CREATE INDEX idx_tenants_subdomain_slug ON tenants(subdomain_slug);"
```

#### 2.2 Generate Subdomains for Existing Tenants

**Preview Changes (Dry Run):**
```bash
cd mscan-server
node database/migrate-tenant-subdomains.js --dry-run
```

Example output:
```
🚀 Starting Tenant Subdomain Migration...
⚠️  DRY RUN MODE - No changes will be made to the database

📋 Fetching tenants without subdomain...
   Found 3 tenant(s) without subdomain

✅ Tenant #1 "Acme Logistics" → "acme-logistics" (dry run)
✅ Tenant #2 "Global Transport Inc" → "global-transport-inc" (dry run)
✅ Tenant #3 "Test Transport Co" → "test-transport-co" (dry run)

📊 Migration Summary:
   Total tenants processed: 3
   Successful updates: 3
   Failed updates: 0

⚠️  This was a DRY RUN. No changes were made.
   Run without --dry-run to apply changes.
```

**Apply Changes:**
```bash
node database/migrate-tenant-subdomains.js
```

#### 2.3 Verify Migration
```bash
# Check all tenants have subdomains
psql -U postgres -d mscan_db -c "SELECT id, name, subdomain_slug FROM tenants ORDER BY id;"
```

Expected:
```
 id |          name           |   subdomain_slug
----+-------------------------+-------------------
  1 | Acme Logistics          | acme-logistics
  2 | Global Transport Inc    | global-transport-inc
  3 | Test Transport Co       | test-transport-co
```

### Phase 3: Update Configuration

#### 3.1 Backend Environment Variables
Update `mscan-server/.env`:

```bash
# Add these new variables
DOMAIN_BASE=localhost                    # Change to your domain in production
ENABLE_SUBDOMAIN_ROUTING=true
RESERVED_SUBDOMAINS=www,api,admin,app,mail,ftp,smtp,pop,imap,ns1,ns2,localhost,staging,dev,test
CORS_ORIGIN=http://localhost:4200       # Update for production
```

#### 3.2 Frontend Environment Configuration
Update `mscan-client/src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  domainBase: 'localhost',
  enableSubdomainRouting: true  // Enable subdomain routing
};
```

For production, update `environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.mscan.com',
  domainBase: 'mscan.com',
  enableSubdomainRouting: true
};
```

### Phase 4: Local Testing

#### 4.1 Restart Services
```bash
# Terminal 1: Backend
cd mscan-server
node src/server.js

# Terminal 2: Frontend
cd mscan-client
npx ng serve
```

#### 4.2 Test Subdomain Access

**Option 1: Using `*.localhost` (Recommended)**
Most modern browsers automatically resolve `*.localhost`:

```bash
# Root domain
open http://localhost:4200

# Tenant subdomain (use actual slug from database)
open http://acme-logistics.localhost:4200
```

**Option 2: Edit `/etc/hosts`**
If `*.localhost` doesn't work, add entries manually:

```bash
sudo nano /etc/hosts

# Add lines:
127.0.0.1 localhost
127.0.0.1 acme-logistics.localhost
127.0.0.1 global-transport-inc.localhost
127.0.0.1 test-transport-co.localhost
```

#### 4.3 Test Authentication Flow

1. **Super Admin Login:**
   - Go to `http://localhost:4200/login`
   - Login with `admin@mscan.com`
   - Should see "Logged in as Super Admin" indicator

2. **Tenant User Login:**
   - Go to `http://localhost:4200/login`
   - Login with tenant admin email (e.g., `admin@acme.com`)
   - After OTP verification, should redirect to `http://acme-logistics.localhost:4200/dashboard`
   - Should see subdomain badge in navigation

3. **Subdomain Validation:**
   - Try accessing `http://wrong-subdomain.localhost:4200/dashboard`
   - Should be redirected or shown error (subdomain mismatch)

### Phase 5: Production Deployment

#### 5.1 DNS Configuration
Set up wildcard DNS A record pointing to your server:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | your-server-ip | 3600 |
| A | * | your-server-ip | 3600 |

Verify DNS propagation:
```bash
# Should resolve to your server IP
nslookup acme.mscan.com
nslookup anything.mscan.com
```

#### 5.2 SSL Certificate
Obtain a wildcard SSL certificate:

```bash
# Using Let's Encrypt with Certbot
sudo certbot certonly --manual --preferred-challenges=dns \
  -d mscan.com -d *.mscan.com

# Follow prompts to add DNS TXT records for verification
```

#### 5.3 Web Server Configuration

**Nginx Configuration:**
```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name mscan.com *.mscan.com;

    ssl_certificate /etc/letsencrypt/live/mscan.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mscan.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        root /var/www/mscan/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Restart nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

#### 5.4 Deploy Application

```bash
# Build frontend
cd mscan-client
npm run build --prod

# Copy build to web server
sudo cp -r dist/mscan-client/* /var/www/mscan/client/dist/

# Restart backend with production environment
cd mscan-server
pm2 restart mscan-server
# or
sudo systemctl restart mscan-server
```

### Phase 6: Notify Users

#### 6.1 Send Migration Notification Emails
Inform all tenant admins about the new subdomain URLs:

**Email Template:**
```
Subject: Your New Tenant URL - Action Required

Hi [Tenant Admin Name],

We've upgraded our system with dedicated subdomain routing for better security and user experience.

Your new tenant URL:
https://[tenant-slug].mscan.com

What's changed:
✓ Each tenant now has a dedicated subdomain
✓ Improved security with subdomain-based authentication
✓ Cleaner, more professional URLs
✓ Faster performance

Action required:
1. Update your bookmarks to the new URL
2. Login using your existing credentials
3. Inform your team members about the new URL

Your old URL will redirect to the new subdomain for the next 30 days.

Need help? Contact support@mscan.com

Best regards,
TMS System Team
```

#### 6.2 Update Documentation
- Update internal documentation with new URLs
- Update training materials
- Update API documentation
- Update any third-party integrations

## Rollback Plan

If you need to rollback:

### 1. Restore Database Backup
```bash
# Stop application
pm2 stop mscan-server

# Restore database
psql -U postgres -d mscan_db < backup_YYYYMMDD_HHMMSS.sql

# Restart application
pm2 start mscan-server
```

### 2. Disable Subdomain Routing
Set `ENABLE_SUBDOMAIN_ROUTING=false` in `.env` and restart services.

## Troubleshooting

### Issue: Tenants can't access their subdomain
**Solution:**
- Verify DNS wildcard is configured correctly: `nslookup tenant.mscan.com`
- Check subdomain_slug exists in database: `SELECT id, name, subdomain_slug FROM tenants;`
- Verify CORS allows subdomains in backend configuration

### Issue: SSL certificate errors
**Solution:**
- Ensure wildcard certificate covers `*.mscan.com`
- Verify certificate installation: `openssl s_client -connect tenant.mscan.com:443`
- Check nginx SSL configuration

### Issue: Login redirects to wrong subdomain
**Solution:**
- Verify JWT token includes `subdomainSlug` field
- Check backend `verifyOTP` response includes subdomain
- Clear browser cookies and try again

### Issue: Subdomain slug conflicts
**Solution:**
```bash
# Check for duplicates
psql -U postgres -d mscan_db -c "SELECT subdomain_slug, COUNT(*) FROM tenants GROUP BY subdomain_slug HAVING COUNT(*) > 1;"

# Manually fix conflicts
psql -U postgres -d mscan_db -c "UPDATE tenants SET subdomain_slug = 'new-unique-slug' WHERE id = X;"
```

## Post-Migration Checklist

- [ ] All tenants have unique subdomain_slug
- [ ] DNS wildcard A record is configured
- [ ] Wildcard SSL certificate is installed
- [ ] Local testing passed (login, navigation, logout)
- [ ] Production deployment successful
- [ ] Tenant admin notifications sent
- [ ] Documentation updated
- [ ] Old URLs redirect to new subdomains (if implementing backward compatibility)
- [ ] Monitoring/alerts configured for subdomain routing
- [ ] Team trained on new subdomain structure

## Support

For migration assistance:
- Email: support@mscan.com
- Documentation: https://docs.mscan.com
- Create issue: https://github.com/your-org/mscan/issues

## Best Practices

1. **Test in staging first**: Always test migration in staging environment before production
2. **Monitor performance**: Watch for DNS lookup overhead, add caching if needed
3. **Security audit**: Review CORS, JWT validation, and subdomain isolation
4. **User communication**: Keep users informed throughout migration process
5. **Gradual rollout**: Consider phased rollout for large installations
6. **Backup regularly**: Maintain regular database backups during migration period

---

**Migration Version:** 1.0  
**Last Updated:** December 2025  
**Applies to:** TMS System v2.0+
