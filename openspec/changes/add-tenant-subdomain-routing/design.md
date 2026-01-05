# Technical Design: Tenant Subdomain Routing

## Architecture Overview

### Single Deployment + Wildcard DNS

**Critical Concept**: This uses **ONE wildcard DNS entry** that routes ALL subdomains to the same server.

```
DNS Configuration (One-Time Setup):
┌──────────────────────────────────────────┐
│ A    @     →  123.456.789.0  (root)     │
│ A    *     →  123.456.789.0  (wildcard) │ ← ALL subdomains
└──────────────────────────────────────────┘

When tenant registers with subdomain "acme-corp":
1. Save "acme-corp" to database
2. NO DNS changes needed
3. acme-corp.mscan.com instantly works (wildcard DNS)
4. Middleware looks up "acme-corp" in database
5. Returns tenant data

Result: Instant subdomain activation, zero DNS management
```

### Request Flow
```
User Request: acme-corp.mscan.com/dashboard
    ↓
1. DNS Resolution → Server IP
    ↓
2. Server Receives Request (hostname: acme-corp.mscan.com)
    ↓
3. Subdomain Middleware
   - Extract subdomain: "acme-corp"
   - Query DB: SELECT id FROM tenants WHERE subdomain_slug = 'acme-corp'
   - Attach tenant context to req.tenant
    ↓
4. Auth Middleware
   - Validate JWT
   - Verify JWT.tenant_subdomain === req.tenant.subdomain_slug
    ↓
5. Route Handler
   - Use req.tenant.id for tenant-specific queries
   - Return tenant-scoped data
```

### Super Admin Flow
```
User Request: mscan.com/super-admin/dashboard
    ↓
1. Subdomain Middleware
   - Detect root domain (no subdomain)
   - Skip tenant resolution
   - Set req.isRootDomain = true
    ↓
2. Auth Middleware
   - Validate JWT
   - Verify user.role === 'SUPER_ADMIN'
    ↓
3. Route Handler
   - Access all tenants data
   - Return system-wide information
```

## Database Schema

### Updated Tenants Table
```sql
ALTER TABLE tenants ADD COLUMN subdomain_slug VARCHAR(100) UNIQUE;
CREATE UNIQUE INDEX idx_tenants_subdomain_slug ON tenants(subdomain_slug);
CREATE INDEX idx_tenants_subdomain_slug_lookup ON tenants(subdomain_slug) WHERE subdomain_slug IS NOT NULL;

-- Constraint for slug format
ALTER TABLE tenants ADD CONSTRAINT check_subdomain_slug_format 
  CHECK (subdomain_slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$');
```

### Slug Format Rules
- **Minimum Length**: 3 characters
- **Maximum Length**: 50 characters
- **Allowed Characters**: Lowercase letters (a-z), numbers (0-9), hyphens (-)
- **Rules**:
  - Must start with letter or number
  - Must end with letter or number
  - Cannot have consecutive hyphens
  - Cannot be a reserved subdomain

### Reserved Subdomains
```javascript
const RESERVED_SUBDOMAINS = [
  'www', 'api', 'admin', 'app', 'mail', 'ftp',
  'localhost', 'staging', 'dev', 'test',
  'cdn', 'assets', 'static', 'docs', 'help',
  'support', 'status', 'blog', 'forum',
  'super-admin', 'system', 'root', 'mscan'
];
```

## Backend Implementation

### 1. Slug Generator Service

```javascript
// slug-generator.service.js
const db = require('../config/database');

class SlugGenerator {
  /**
   * Generate a URL-safe slug from tenant name (for suggestions)
   */
  static generateSlug(tenantName) {
    // Convert to lowercase
    let slug = tenantName.toLowerCase();
    
    // Replace spaces and special chars with hyphens
    slug = slug.replace(/[^a-z0-9]+/g, '-');
    
    // Remove leading/trailing hyphens
    slug = slug.replace(/^-+|-+$/g, '');
    
    // Limit length
    slug = slug.substring(0, 50);
    
    // Ensure doesn't end with hyphen after truncation
    slug = slug.replace(/-+$/, '');
    
    return slug;
  }

  /**
   * Check if slug is available
   */
  static async isSlugAvailable(slug) {
    const result = await db.query(
      'SELECT id FROM tenants WHERE subdomain_slug = $1',
      [slug]
    );
    return result.rows.length === 0;
  }

  /**
   * Check if slug is reserved
   */
  static isReserved(slug) {
    const reserved = process.env.RESERVED_SUBDOMAINS?.split(',') || RESERVED_SUBDOMAINS;
    return reserved.includes(slug);
  }

  /**
   * Generate unique slug with conflict resolution
   */
  static async generateUniqueSlug(tenantName) {
    const baseSlug = this.generateSlug(tenantName);
    
    // Check if reserved
    if (this.isReserved(baseSlug)) {
      throw new Error(`Subdomain '${baseSlug}' is reserved`);
    }
    
    // Check if available
    if (await this.isSlugAvailable(baseSlug)) {
      return baseSlug;
    }
    
    // Try with numbers appended
    for (let i = 2; i <= 100; i++) {
      const slug = `${baseSlug}-${i}`;
      if (await this.isSlugAvailable(slug)) {
        return slug;
      }
    }
    
    throw new Error('Unable to generate unique subdomain');
  }

  /**
   * Generate multiple slug suggestions from tenant name
   */
  static async generateSuggestions(tenantName) {
    const baseSlug = this.generateSlug(tenantName);
    const suggestions = [baseSlug];
    
    // Add variations
    const words = tenantName.toLowerCase().split(/[^a-z0-9]+/);
    if (words.length > 1) {
      suggestions.push(words.join(''))      // "acmecorp"
      suggestions.push(words[0])            // "acme"
      if (words.length > 2) {
        suggestions.push(words.slice(0, 2).join('-'))  // "acme-corp"
      }
    }
    
    // Filter available suggestions
    const available = [];
    for (const slug of suggestions) {
      if (!this.isReserved(slug) && await this.isSlugAvailable(slug)) {
        available.push(slug);
      }
    }
    
    return available.slice(0, 5);  // Return top 5 suggestions
  }

  /**
   * Validate custom slug format (for user input)
   */
  static validateSlug(slug) {
    const regex = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
    
    if (!regex.test(slug)) {
      return {
        valid: false,
        error: 'Slug must be 3-50 characters, lowercase letters, numbers, and hyphens only'
      };
    }
    
    if (this.isReserved(slug)) {
      return {
        valid: false,
        error: 'This subdomain is reserved'
      };
    }
    
    return { valid: true };
  }
}

module.exports = SlugGenerator;

// tenant.controller.js additions

/**
 * Check subdomain availability (real-time validation)
 */
router.get('/check-slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Validate format
    const validation = SlugGenerator.validateSlug(slug);
    if (!validation.valid) {
      return res.json({
        available: false,
        error: validation.error
      });
    }
    
    // Check availability
    const available = await SlugGenerator.isSlugAvailable(slug);
    
    res.json({
      available,
      slug,
      message: available ? 'Subdomain is available' : 'Subdomain is already taken'
    });
  } catch (error) {
    console.error('Check slug error:', error);
    res.status(500).json({ error: 'Failed to check subdomain availability' });
  }
});

/**
 * Get subdomain suggestions based on tenant name
 */
router.get('/suggest-slugs', async (req, res) => {
  try {
    const { tenantName } = req.query;
    
    if (!tenantName) {
      return res.status(400).json({ error: 'Tenant name is required' });
    }
    
    const suggestions = await SlugGenerator.generateSuggestions(tenantName);
    
    res.json({
      suggestions,
      count: suggestions.length
    });
  } catch (error) {
    console.error('Suggest slugs error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

/**
 * Create tenant with custom subdomain
 */
router.post('/tenants', authenticate, async (req, res) => {
  const client = await db.getClient();
  
  try {
    const { tenant_name, subdomain_slug, email, phone, contact_person } = req.body;
    
    await client.query('BEGIN');
    
    // Handle subdomain
    let slug = subdomain_slug;
    
    if (!slug) {
      // Auto-generate if not provided
      slug = await SlugGenerator.generateUniqueSlug(tenant_name);
    } else {
      // Validate custom slug
      const validation = SlugGenerator.validateSlug(slug);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      
      // Check availability
      const available = await SlugGenerator.isSlugAvailable(slug);
      if (!available) {
        const suggestions = await SlugGenerator.generateSuggestions(tenant_name);
        return res.status(409).json({
          error: 'Subdomain is already taken',
          suggestions
        });
      }
    }
    
    // Create tenant with subdomain
    const result = await client.query(
      `INSERT INTO tenants (tenant_name, subdomain_slug, contact_person, phone, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [tenant_name, slug, contact_person, phone]
    );
    
    const tenant = result.rows[0];
    
    // Create user account
    await client.query(
      `INSERT INTO users (tenant_id, email, full_name, phone, role, is_active)
       VALUES ($1, $2, $3, $4, 'TENANT_ADMIN', true)`,
      [tenant.id, email, contact_person || tenant_name, phone]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Tenant created successfully',
      tenant,
      subdomain_url: `https://${slug}.mscan.com`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create tenant error:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  } finally {
    client.release();
  }
});

module.exports = SlugGenerator;
```

### 2. Subdomain Middleware

```javascript
// subdomain.middleware.js
const db = require('../config/database');

const subdomainMiddleware = async (req, res, next) => {
  try {
    const hostname = req.hostname;
    const baseDomain = process.env.DOMAIN_BASE || 'localhost';
    
    // Skip for super admin routes
    if (req.path.startsWith('/api/super-admin')) {
      req.isRootDomain = true;
      return next();
    }
    
    // Extract subdomain
    const subdomain = extractSubdomain(hostname, baseDomain);
    
    // Root domain (no subdomain)
    if (!subdomain) {
      req.isRootDomain = true;
      return next();
    }
    
    // Resolve tenant from subdomain
    const result = await db.query(
      'SELECT id, tenant_name, subdomain_slug, is_active FROM tenants WHERE subdomain_slug = $1',
      [subdomain]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Tenant not found',
        message: `No tenant found for subdomain: ${subdomain}`
      });
    }
    
    const tenant = result.rows[0];
    
    if (!tenant.is_active) {
      return res.status(403).json({
        error: 'Tenant inactive',
        message: 'This tenant account is currently inactive'
      });
    }
    
    // Attach tenant context
    req.tenant = tenant;
    req.subdomain = subdomain;
    
    next();
  } catch (error) {
    console.error('Subdomain middleware error:', error);
    res.status(500).json({ error: 'Failed to resolve subdomain' });
  }
};

function extractSubdomain(hostname, baseDomain) {
  // Handle localhost
  if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
    return null;
  }
  
  // Handle IP addresses
  if (/^\d+\.\d+\.\d+\.\d+/.test(hostname)) {
    return null;
  }
  
  // Handle subdomain.localhost
  if (hostname.endsWith('.localhost')) {
    const parts = hostname.split('.');
    return parts.length > 1 ? parts[0] : null;
  }
  
  // Handle subdomain.domain.tld
  const domainRegex = new RegExp(`\\.${baseDomain.replace('.', '\\.')}$`);
  if (!domainRegex.test(hostname)) {
    return null; // Not our domain
  }
  
  const subdomain = hostname.replace(domainRegex, '');
  return subdomain || null;
}

module.exports = subdomainMiddleware;
```

### 3. Update Auth Middleware

```javascript
// auth.middleware.js (additions)
const requireTenantSubdomain = (req, res, next) => {
  // Skip for super admin
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }
  
  // Verify subdomain matches user's tenant
  if (!req.tenant) {
    return res.status(403).json({
      error: 'Invalid subdomain',
      message: 'Please access from your tenant subdomain'
    });
  }
  
  if (req.user.tenant_id !== req.tenant.id) {
    return res.status(403).json({
      error: 'Subdomain mismatch',
      message: 'You do not have access to this tenant'
    });
  }
  
  next();
};
```

### 4. Update CORS Configuration

```javascript
// server.js
const cors = require('cors');

const baseDomain = process.env.DOMAIN_BASE || 'localhost';
const allowedOrigins = [
  `http://localhost:4200`,
  `http://${baseDomain}`,
  `https://${baseDomain}`,
  new RegExp(`^https?://[a-z0-9-]+\\.${baseDomain.replace('.', '\\.')}$`),
  new RegExp(`^http://[a-z0-9-]+\\.localhost(:\\d+)?$`) // Local development
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

## Frontend Implementation

### 1. Tenant Registration Form with Custom Subdomain

```typescript
// tenant-create.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-tenant-create',
  templateUrl: './tenant-create.component.html'
})
export class TenantCreateComponent implements OnInit {
  tenantForm: FormGroup;
  subdomainAvailable: boolean | null = null;
  checkingAvailability = false;
  suggestions: string[] = [];
  domainBase = environment.domainBase;
  
  constructor(
    private fb: FormBuilder,
    private tenantService: TenantService
  ) {}
  
  ngOnInit() {
    this.tenantForm = this.fb.group({
      tenant_name: ['', [Validators.required, Validators.minLength(3)]],
      subdomain_slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/)]],
      contact_person: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]]
    });
    
    // Auto-suggest subdomain from tenant name
    this.tenantForm.get('tenant_name')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(name => {
        if (name && name.length >= 3) {
          this.generateSlugSuggestion(name);
        }
      });
    
    // Real-time availability check
    this.tenantForm.get('subdomain_slug')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(slug => {
          if (!slug || slug.length < 3) {
            return of(null);
          }
          this.checkingAvailability = true;
          return this.tenantService.checkSubdomainAvailability(slug);
        })
      )
      .subscribe(result => {
        this.checkingAvailability = false;
        if (result) {
          this.subdomainAvailable = result.available;
        }
      });
  }
  
  generateSlugSuggestion(tenantName: string) {
    const slug = tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
    
    this.tenantForm.patchValue({ subdomain_slug: slug }, { emitEvent: true });
    
    // Also get server suggestions
    this.tenantService.getSubdomainSuggestions(tenantName).subscribe(result => {
      this.suggestions = result.suggestions;
    });
  }
  
  selectSuggestion(slug: string) {
    this.tenantForm.patchValue({ subdomain_slug: slug });
  }
  
  getSubdomainPreview(): string {
    const slug = this.tenantForm.get('subdomain_slug')?.value;
    const port = window.location.port ? `:${window.location.port}` : '';
    return slug ? `${slug}.${this.domainBase}${port}` : `your-subdomain.${this.domainBase}`;
  }
  
  onSubmit() {
    if (this.tenantForm.valid && this.subdomainAvailable) {
      this.tenantService.createTenant(this.tenantForm.value).subscribe({
        next: (response) => {
          alert(`Tenant created! Access at: ${response.subdomain_url}`);
          // Redirect or close modal
        },
        error: (error) => {
          if (error.error.suggestions) {
            this.suggestions = error.error.suggestions;
          }
          alert(error.error.error || 'Failed to create tenant');
        }
      });
    }
  }
}
```

```html
<!-- tenant-create.component.html -->
<form [formGroup]="tenantForm" (ngSubmit)="onSubmit()">
  <!-- Existing fields: tenant_name, contact_person, email, phone -->
  
  <div class="form-group">
    <label>Tenant Name *</label>
    <input type="text" formControlName="tenant_name" class="form-control" />
  </div>
  
  <!-- NEW: Custom Subdomain Input -->
  <div class="form-group subdomain-input">
    <label>Choose Your Subdomain *</label>
    <div class="input-group">
      <input 
        type="text" 
        formControlName="subdomain_slug" 
        class="form-control"
        placeholder="your-company"
        [class.is-valid]="subdomainAvailable === true"
        [class.is-invalid]="subdomainAvailable === false || tenantForm.get('subdomain_slug')?.invalid"
      />
      <span class="input-group-text">.{{ domainBase }}</span>
      <div class="validation-icon">
        <span *ngIf="checkingAvailability" class="spinner">⏳</span>
        <span *ngIf="!checkingAvailability && subdomainAvailable === true" class="text-success">✓</span>
        <span *ngIf="!checkingAvailability && subdomainAvailable === false" class="text-danger">✗</span>
      </div>
    </div>
    
    <div class="form-text">
      <div *ngIf="subdomainAvailable === true" class="text-success">
        ✓ Available! Your dashboard will be at: <strong>https://{{ getSubdomainPreview() }}</strong>
      </div>
      <div *ngIf="subdomainAvailable === false" class="text-danger">
        ✗ This subdomain is already taken. Try one of these:
      </div>
      <div class="format-help">
        ⓘ 3-50 characters, lowercase letters, numbers, and hyphens only
      </div>
    </div>
    
    <!-- Suggestions -->
    <div *ngIf="suggestions.length > 0" class="suggestions">
      <strong>Suggestions:</strong>
      <div class="suggestion-pills">
        <button 
          *ngFor="let suggestion of suggestions" 
          type="button"
          class="btn btn-sm btn-outline-primary"
          (click)="selectSuggestion(suggestion)"
        >
          {{ suggestion }}
        </button>
      </div>
    </div>
  </div>
  
  <!-- Preview Box -->
  <div class="preview-box">
    <strong>Your tenant URL:</strong>
    <div class="url-preview">https://{{ getSubdomainPreview() }}</div>
  </div>
  
  <!-- Other fields: contact_person, email, phone -->
  
  <button 
    type="submit" 
    class="btn btn-primary"
    [disabled]="tenantForm.invalid || subdomainAvailable !== true || checkingAvailability"
  >
    Create Tenant
  </button>
</form>
```

```typescript
// tenant.service.ts additions
checkSubdomainAvailability(slug: string): Observable<any> {
  return this.http.get(`/api/tenants/check-slug/${slug}`);
}

getSubdomainSuggestions(tenantName: string): Observable<any> {
  return this.http.get(`/api/tenants/suggest-slugs`, {
    params: { tenantName }
  });
}

createTenant(tenantData: any): Observable<any> {
  return this.http.post('/api/tenants', tenantData);
}
```

### 2. Subdomain Service

```typescript
// subdomain.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SubdomainService {
  
  getCurrentSubdomain(): string | null {
    const hostname = window.location.hostname;
    const baseDomain = environment.domainBase;
    
    // Handle localhost
    if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
      return null;
    }
    
    // Handle subdomain.localhost
    if (hostname.endsWith('.localhost')) {
      const parts = hostname.split('.');
      return parts.length > 1 ? parts[0] : null;
    }
    
    // Handle subdomain.domain.tld
    const domainRegex = new RegExp(`\\.${baseDomain.replace('.', '\\.')}$`);
    if (!domainRegex.test(hostname)) {
      return null;
    }
    
    const subdomain = hostname.replace(domainRegex, '');
    return subdomain || null;
  }
  
  isRootDomain(): boolean {
    return this.getCurrentSubdomain() === null;
  }
  
  buildSubdomainUrl(slug: string, path: string = '/'): string {
    const protocol = window.location.protocol;
    const baseDomain = environment.domainBase;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    return `${protocol}//${slug}.${baseDomain}${port}${path}`;
  }
  
  redirectToSubdomain(slug: string, path: string = '/'): void {
    const url = this.buildSubdomainUrl(slug, path);
    window.location.href = url;
  }
  
  redirectToRootDomain(path: string = '/'): void {
    const protocol = window.location.protocol;
    const baseDomain = environment.domainBase;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    window.location.href = `${protocol}//${baseDomain}${port}${path}`;
  }
}
```

### 2. Subdomain Guard

```typescript
// subdomain.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SubdomainService } from '../services/subdomain.service';
import { AuthService } from '../services/auth.service';

export const subdomainGuard: CanActivateFn = (route, state) => {
  const subdomainService = inject(SubdomainService);
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const currentSubdomain = subdomainService.getCurrentSubdomain();
  const userSubdomain = authService.getTenantSubdomain();
  const userRole = authService.getCurrentUser()?.role;
  
  // Super admin can access from root domain
  if (userRole === 'SUPER_ADMIN' && subdomainService.isRootDomain()) {
    return true;
  }
  
  // Tenant users must access from their subdomain
  if (!currentSubdomain) {
    // On root domain but not super admin
    if (userSubdomain) {
      subdomainService.redirectToSubdomain(userSubdomain, state.url);
      return false;
    }
    router.navigate(['/login']);
    return false;
  }
  
  // Verify subdomain matches user's tenant
  if (currentSubdomain !== userSubdomain) {
    router.navigate(['/unauthorized']);
    return false;
  }
  
  return true;
};
```

## Local Development Setup

### Hosts File (Optional for older systems)
```
# /etc/hosts (macOS/Linux) or C:\Windows\System32\drivers\etc\hosts (Windows)
127.0.0.1  mscan.localhost
127.0.0.1  acme-corp.localhost
127.0.0.1  example-inc.localhost
```

### Modern Browser Support
Modern browsers support `*.localhost` automatically without hosts file configuration.

### Testing URLs
- Root domain: `http://localhost:4200`
- Tenant subdomain: `http://acme-corp.localhost:4200`
- API: `http://acme-corp.localhost:3000/api/...`

## Production Deployment

### DNS Configuration
```
# DNS Records for mscan.com
A     @           →  123.456.789.0  (root domain)
A     *           →  123.456.789.0  (wildcard for all subdomains)
```

### SSL Certificate
```bash
# Obtain wildcard SSL certificate
certbot certonly --manual --preferred-challenges=dns \
  -d mscan.com -d *.mscan.com
```

### Nginx Configuration
```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name ~^(?<subdomain>.+)\.mscan\.com$;
    
    ssl_certificate /path/to/wildcard.crt;
    ssl_certificate_key /path/to/wildcard.key;
    
    location / {
        proxy_pass http://localhost:4200;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Security Considerations

### 1. Subdomain Takeover Prevention
- Always validate subdomain exists in database
- Return 404 for unknown subdomains
- Don't allow subdomain creation without authentication

### 2. CORS Security
- Use strict regex for subdomain pattern matching
- Validate origin headers on every request
- Don't use wildcard `*` for credentials-enabled CORS

### 3. Tenant Isolation
- Verify subdomain in every authenticated request
- Include subdomain in JWT for validation
- Log subdomain mismatches for security monitoring

### 4. DNS Security
- Use DNSSEC for DNS record protection
- Monitor for unauthorized DNS changes
- Implement rate limiting on subdomain resolution

## Performance Optimization

### 1. Caching
```javascript
// In-memory cache for subdomain → tenant_id mapping
const subdomainCache = new Map();

async function resolveTenant(subdomain) {
  if (subdomainCache.has(subdomain)) {
    return subdomainCache.get(subdomain);
  }
  
  const tenant = await db.query(/*...*/);
  subdomainCache.set(subdomain, tenant);
  
  return tenant;
}
```

### 2. Database Indexing
- Index on `subdomain_slug` for O(1) lookups
- Use partial index for active tenants only
- Monitor query performance

### 3. CDN Configuration
- Configure CDN to handle wildcard subdomains
- Set appropriate cache headers
- Use subdomain-specific cache keys
