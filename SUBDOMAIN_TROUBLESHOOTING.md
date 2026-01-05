# Subdomain Routing Troubleshooting Guide

## Common Issues and Solutions

### 1. Subdomain Not Resolving

#### Symptom
Browser shows "This site can't be reached" or "DNS_PROBE_FINISHED_NXDOMAIN" when accessing tenant subdomain.

#### Solutions

**For Local Development:**

**Option A: Use `*.localhost` (Recommended)**
Modern browsers automatically resolve `*.localhost` to `127.0.0.1`:

```bash
# Access tenant subdomain
http://acme.localhost:4200

# This should work without any configuration on:
# - Chrome 63+
# - Firefox 60+
# - Safari 11.1+
```

**Option B: Edit `/etc/hosts` (macOS/Linux)**
```bash
sudo nano /etc/hosts

# Add entries for each tenant:
127.0.0.1 localhost
127.0.0.1 acme.localhost
127.0.0.1 global-transport.localhost
127.0.0.1 test-tenant.localhost
```

**Option C: Edit `hosts` file (Windows)**
```powershell
# Run Notepad as Administrator
notepad C:\Windows\System32\drivers\etc\hosts

# Add entries:
127.0.0.1 localhost
127.0.0.1 acme.localhost
127.0.0.1 global-transport.localhost
```

**For Production:**

Check DNS configuration:
```bash
# Verify wildcard DNS is set up
nslookup acme.mscan.com
nslookup anything.mscan.com

# Both should resolve to your server IP
```

If not resolving, add DNS A record:
```
Type: A
Name: *
Value: your-server-ip
TTL: 3600
```

Wait for DNS propagation (can take up to 48 hours):
```bash
# Check propagation status
dig acme.mscan.com
# or use online tool: https://www.whatsmydns.net/
```

---

### 2. Login Redirects to Wrong Subdomain

#### Symptom
After OTP verification, user is redirected to incorrect subdomain or stays on root domain.

#### Diagnosis
1. Check JWT token includes subdomain:
```bash
# In browser console after login:
const token = localStorage.getItem('accessToken');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Subdomain:', payload.subdomainSlug);
```

2. Verify backend response includes subdomain:
```bash
# Check OTP verification response
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"user@acme.com","otp":"123456"}'
  
# Response should include:
{
  "data": {
    "subdomain": "acme",  // Should match tenant's subdomain_slug
    ...
  }
}
```

#### Solutions

**Backend Check:**
```bash
# Verify tenant has subdomain_slug in database
psql -U postgres -d mscan_db -c "SELECT id, name, subdomain_slug FROM tenants WHERE id = 'tenant-uuid';"

# If subdomain_slug is NULL:
node database/migrate-tenant-subdomains.js
```

**Frontend Check:**
```typescript
// In auth.service.ts, verify redirect logic:
if (response.subdomain) {
  this.subdomainService.redirectToSubdomain(response.subdomain);
} else {
  // Super admin - stay on root domain
  this.router.navigate(['/dashboard']);
}
```

**Clear Browser Cache:**
```bash
# Clear cookies and localStorage
# In browser console:
localStorage.clear();
document.cookie.split(";").forEach(c => document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"));

# Then login again
```

---

### 3. CORS Errors with Subdomains

#### Symptom
Browser console shows:
```
Access to XMLHttpRequest at 'http://localhost:3000/api/...' from origin 'http://acme.localhost:4200' has been blocked by CORS policy
```

#### Solutions

**Backend Configuration (mscan-server/src/server.js):**

```javascript
// Update CORS configuration to allow wildcard subdomains
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:4200',
      'http://localhost:3000',
      /^http:\/\/.*\.localhost:4200$/,  // Wildcard for *.localhost
      /^https:\/\/.*\.mscan\.com$/      // Wildcard for *.mscan.com
    ];
    
    if (!origin || allowedOrigins.some(allowed => 
      typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
    )) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

**Environment Variables (.env):**
```bash
CORS_ORIGIN=http://localhost:4200,http://*.localhost:4200
```

**Restart Backend:**
```bash
# Kill current process
pkill -f "node src/server.js"

# Restart
cd mscan-server
node src/server.js
```

---

### 4. Subdomain Validation Fails After Login

#### Symptom
User logs in successfully but is immediately redirected or shown "Subdomain mismatch" error.

#### Diagnosis
```bash
# Check token's subdomain matches current subdomain
# In browser console:
const currentSubdomain = window.location.hostname.split('.')[0];
const token = localStorage.getItem('accessToken');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Current:', currentSubdomain);
console.log('Token:', payload.subdomainSlug);
```

#### Solutions

**Mismatch Scenario:**
- User with subdomain `acme` tries to access `another-tenant.localhost`
- Expected behavior: Redirect to `acme.localhost`

**Fix in Frontend (subdomain.guard.ts):**
```typescript
canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
  const currentSubdomain = this.subdomainService.getCurrentSubdomain();
  const userSubdomain = this.authService.getTenantSubdomain();
  
  if (userSubdomain && currentSubdomain !== userSubdomain) {
    // Redirect to correct subdomain
    this.subdomainService.redirectToSubdomain(userSubdomain);
    return false;
  }
  
  return true;
}
```

**Backend Validation (auth.controller.js):**
```javascript
const getUserContext = async (req, res) => {
  const userId = req.user.userId;
  const currentSubdomain = req.subdomain; // From subdomain middleware
  
  // Get user's tenant subdomain from database
  const user = await pool.query(
    'SELECT u.*, t.subdomain_slug FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.id = $1',
    [userId]
  );
  
  // Validate subdomain matches (unless super admin)
  if (user.role !== 'SUPER_ADMIN' && currentSubdomain !== user.subdomain_slug) {
    return res.status(403).json({
      success: false,
      message: 'Subdomain mismatch',
      expectedSubdomain: user.subdomain_slug,
      currentSubdomain
    });
  }
  
  // Return user context...
};
```

---

### 5. Tenant Created But No Subdomain Assigned

#### Symptom
New tenant created successfully but `subdomain_slug` is NULL in database.

#### Diagnosis
```bash
# Check tenant record
psql -U postgres -d mscan_db -c "SELECT id, name, subdomain_slug FROM tenants ORDER BY created_at DESC LIMIT 5;"
```

#### Solutions

**Run Migration Script:**
```bash
cd mscan-server

# Dry run to preview changes
node database/migrate-tenant-subdomains.js --dry-run

# Apply migration
node database/migrate-tenant-subdomains.js
```

**Manual Fix:**
```bash
# Generate slug for specific tenant
psql -U postgres -d mscan_db

# Update tenant
UPDATE tenants 
SET subdomain_slug = 'acme-logistics' 
WHERE id = 'tenant-uuid';

# Verify uniqueness
SELECT subdomain_slug, COUNT(*) 
FROM tenants 
GROUP BY subdomain_slug 
HAVING COUNT(*) > 1;
```

**Fix Tenant Controller:**
Ensure tenant creation includes subdomain generation:

```javascript
// tenant.controller.js
const createTenant = async (req, res) => {
  const { companyName, customSubdomain, ... } = req.body;
  
  // Generate or validate subdomain
  let subdomain = customSubdomain;
  if (!subdomain) {
    subdomain = slugGeneratorService.generateSlugFromName(companyName);
  } else {
    const validation = slugGeneratorService.validateCustomSlug(subdomain);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.error });
    }
  }
  
  // Check availability
  const existing = await pool.query('SELECT id FROM tenants WHERE subdomain_slug = $1', [subdomain]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ 
      success: false, 
      message: 'Subdomain already taken',
      suggestions: await slugGeneratorService.getSuggestions(companyName)
    });
  }
  
  // Create tenant with subdomain
  await pool.query(
    'INSERT INTO tenants (id, name, subdomain_slug, ...) VALUES ($1, $2, $3, ...)',
    [id, companyName, subdomain, ...]
  );
};
```

---

### 6. Subdomain Slug Conflicts

#### Symptom
Multiple tenants have the same `subdomain_slug`, causing routing confusion.

#### Diagnosis
```bash
# Find duplicate slugs
psql -U postgres -d mscan_db -c "
SELECT subdomain_slug, COUNT(*) as count, array_agg(name) as tenants
FROM tenants 
WHERE subdomain_slug IS NOT NULL
GROUP BY subdomain_slug 
HAVING COUNT(*) > 1;
"
```

#### Solutions

**Fix Duplicates Manually:**
```bash
psql -U postgres -d mscan_db

# Rename conflicting subdomains
UPDATE tenants SET subdomain_slug = 'acme-2' WHERE id = 'second-tenant-uuid';
UPDATE tenants SET subdomain_slug = 'acme-3' WHERE id = 'third-tenant-uuid';
```

**Enforce Uniqueness:**
```bash
# Add unique constraint (if not exists)
psql -U postgres -d mscan_db -c "
ALTER TABLE tenants 
ADD CONSTRAINT unique_subdomain_slug UNIQUE (subdomain_slug);
"
```

---

### 7. SSL Certificate Errors on Subdomains

#### Symptom
Browser shows "Your connection is not private" or certificate mismatch errors when accessing tenant subdomains.

#### Solutions

**Verify Wildcard Certificate:**
```bash
# Check certificate covers *.mscan.com
openssl s_client -connect acme.mscan.com:443 -servername acme.mscan.com | grep subject

# Should show: *.mscan.com or both mscan.com and *.mscan.com
```

**Obtain Wildcard Certificate (Let's Encrypt):**
```bash
# Install Certbot
sudo apt-get install certbot

# Request wildcard certificate (requires DNS challenge)
sudo certbot certonly --manual --preferred-challenges=dns \
  -d mscan.com -d *.mscan.com

# Follow prompts to add DNS TXT records
```

**Update Nginx Configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name mscan.com *.mscan.com;

    # Use wildcard certificate
    ssl_certificate /etc/letsencrypt/live/mscan.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mscan.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # ... rest of config
}
```

**Verify SSL Configuration:**
```bash
# Test SSL
curl -I https://acme.mscan.com

# Check certificate validity
echo | openssl s_client -connect acme.mscan.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

### 8. Performance Issues with Subdomain Routing

#### Symptom
Slow page loads, high latency on subdomain requests.

#### Diagnosis
```bash
# Check database query performance
psql -U postgres -d mscan_db

# Explain analyze subdomain lookup
EXPLAIN ANALYZE 
SELECT id, name FROM tenants WHERE subdomain_slug = 'acme';
```

#### Solutions

**Add Database Index (if missing):**
```sql
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain_slug 
ON tenants(subdomain_slug);
```

**Implement Caching (Node.js):**
```javascript
// In subdomain.middleware.js
const NodeCache = require('node-cache');
const subdomainCache = new NodeCache({ stdTTL: 300 }); // 5 minutes

const getSubdomainMiddleware = async (req, res, next) => {
  const subdomain = extractSubdomain(req.hostname);
  
  // Check cache first
  const cached = subdomainCache.get(subdomain);
  if (cached) {
    req.tenant = cached;
    return next();
  }
  
  // Query database
  const result = await pool.query(
    'SELECT id, name, subdomain_slug FROM tenants WHERE subdomain_slug = $1',
    [subdomain]
  );
  
  if (result.rows.length > 0) {
    const tenant = result.rows[0];
    subdomainCache.set(subdomain, tenant); // Cache result
    req.tenant = tenant;
  }
  
  next();
};
```

**Monitor Performance:**
```bash
# Install monitoring dependencies
npm install prom-client

# Add metrics endpoint
# See implementation in server.js
```

---

### 9. Reserved Subdomain Conflicts

#### Symptom
Cannot create tenant with certain subdomain slugs like "www", "api", "admin".

#### Expected Behavior
This is intentional. Reserved subdomains protect system routes.

#### Reserved List
```javascript
const RESERVED_SUBDOMAINS = [
  'www', 'api', 'admin', 'app', 'mail',
  'ftp', 'smtp', 'pop', 'imap', 'ns1', 'ns2',
  'localhost', 'staging', 'dev', 'test', 'demo'
];
```

#### Solutions

**For Legitimate Use:**
Remove subdomain from reserved list in `.env`:
```bash
RESERVED_SUBDOMAINS=www,api,admin,app,mail
# Remove specific subdomain if needed for tenant use
```

**For Tenant:**
Choose alternative subdomain:
- Instead of "www": use "main", "home", or company name
- Instead of "api": use "api-portal", "developers"
- Instead of "admin": use "management", "control"

---

### 10. Frontend Subdomain Detection Issues

#### Symptom
Subdomain not detected correctly in Angular application.

#### Diagnosis
```typescript
// In browser console
const hostname = window.location.hostname;
console.log('Hostname:', hostname);

// Should be: acme.localhost or acme.mscan.com
// Not: localhost or mscan.com
```

#### Solutions

**Fix SubdomainService:**
```typescript
// subdomain.service.ts
getCurrentSubdomain(): string | null {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // Handle localhost variants
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null; // Root domain
  }
  
  // Handle *.localhost (local development)
  if (hostname.endsWith('.localhost')) {
    const subdomain = hostname.replace('.localhost', '');
    return subdomain === 'localhost' ? null : subdomain;
  }
  
  // Handle production domain (*.mscan.com)
  const domainBase = environment.domainBase; // 'mscan.com'
  if (hostname === domainBase) {
    return null; // Root domain
  }
  
  if (hostname.endsWith(`.${domainBase}`)) {
    return hostname.replace(`.${domainBase}`, '');
  }
  
  return null;
}
```

---

## Quick Reference

### Verification Checklist

**Local Development:**
- [ ] Backend running on port 3000
- [ ] Frontend running on port 4200
- [ ] Can access `http://localhost:4200`
- [ ] Can access `http://tenant-slug.localhost:4200`
- [ ] Login redirects to correct subdomain
- [ ] Navigation shows subdomain indicator
- [ ] Logout redirects to root domain

**Production:**
- [ ] DNS wildcard A record configured (`*.mscan.com`)
- [ ] Wildcard SSL certificate installed
- [ ] Nginx configured for subdomain routing
- [ ] All tenants have `subdomain_slug` in database
- [ ] Environment variables set correctly (DOMAIN_BASE, etc.)
- [ ] CORS allows wildcard subdomains
- [ ] Health check passes on root and subdomains

### Useful Commands

```bash
# Check tenant subdomains
psql -U postgres -d mscan_db -c "SELECT id, name, subdomain_slug FROM tenants;"

# Test subdomain availability
curl http://localhost:3000/tenants/check-slug/acme

# Get slug suggestions
curl "http://localhost:3000/tenants/suggest-slugs?name=Acme%20Logistics"

# Check DNS resolution
nslookup acme.mscan.com

# Test SSL certificate
openssl s_client -connect acme.mscan.com:443 -servername acme.mscan.com

# View backend logs
tail -f mscan-server/server.log

# Clear browser data
localStorage.clear(); // In browser console
```

---

## Getting Help

If you're still experiencing issues:

1. **Check logs**: Review backend console output and `server.log`
2. **Browser console**: Look for JavaScript errors or network failures
3. **Database**: Verify tenant records are correct
4. **Environment**: Ensure `.env` variables match your setup
5. **Documentation**: Review [README.md](README.md) and [SUBDOMAIN_MIGRATION_GUIDE.md](SUBDOMAIN_MIGRATION_GUIDE.md)

**Contact Support:**
- Email: support@mscan.com
- GitHub Issues: https://github.com/your-org/mscan/issues
- Documentation: https://docs.mscan.com

---

**Last Updated:** December 2025  
**Version:** 1.0
