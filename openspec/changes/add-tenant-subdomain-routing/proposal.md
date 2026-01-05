# Change Proposal: Tenant Subdomain Routing

## Overview
Implement multi-tenant subdomain routing where each tenant's dashboard is accessible via their own subdomain (e.g., `acme-corp.mscan.com` instead of `mscan.com/tenant/dashboard`). This provides better tenant isolation, branding, and user experience.

## Motivation
### Problems Solved
1. **Better Tenant Isolation**: Each tenant has their own subdomain, improving security and data separation
2. **Enhanced Branding**: Tenants can have custom subdomains matching their company names
3. **Improved UX**: Cleaner URLs without tenant IDs in paths
4. **Professional Appearance**: Subdomain routing is more enterprise-friendly
5. **SEO Benefits**: Each tenant can have separate SEO optimization

### Use Cases
- **Tenant Registration**: When super admin creates a tenant, generate a unique subdomain slug
- **Tenant Login**: Users login at `{tenant-slug}.mscan.com` and see only their tenant's data
- **White-labeling**: Future potential for custom domains (e.g., `rewards.acme.com` → `acme-corp.mscan.com`)

## Proposed Changes

### Architecture: Single Deployment with Wildcard DNS

**Important**: This uses a **single server deployment** with **one wildcard DNS entry**, NOT separate DNS entries per tenant.

```
DNS Configuration (One-Time Setup):
A    @     →  server-ip     (mscan.com)
A    *     →  server-ip     (*.mscan.com) ← Wildcard catches ALL subdomains

Result:
- tenant1.mscan.com  ─┐
- tenant2.mscan.com  ─┤
- tenant3.mscan.com  ─┼──→  Same Server, Same Code
- tenant-n.mscan.com ─┘      Middleware determines tenant
```

**Key Point**: When a new tenant registers, NO DNS changes are needed. The wildcard DNS already routes all subdomains to your server. The backend middleware simply looks up the subdomain in the database to identify the tenant.

### 1. Database Changes
- Add `subdomain_slug` column to `tenants` table (unique, indexed)
- Add validation for slug format (lowercase, alphanumeric, hyphens only)
- Allow custom subdomain input during registration (user can specify their preferred slug)
- Auto-generate slug from tenant name as fallback suggestion
- Add slug uniqueness constraint

### 2. Backend Changes
- **Subdomain Middleware**: Detect subdomain from request hostname and load tenant context
- **Tenant Resolution**: Map subdomain to tenant ID early in request pipeline (database lookup, no DNS changes)
- **CORS Configuration**: Allow requests from all tenant subdomains (`*.mscan.com`)
- **Slug Generation Service**: Create unique slugs from tenant names with conflict resolution
- **Slug Validation API**: Real-time subdomain availability check during registration
- **Custom Subdomain Input**: Accept user-provided subdomain during tenant creation
- **Super Admin Routes**: Keep super-admin routes on root domain (`mscan.com`)
- **Authentication**: Update JWT to include tenant subdomain for validation
- **No DNS Changes Required**: Wildcard DNS handles all subdomains automatically

### 3. Frontend Changes
- **Environment Configuration**: Support subdomain detection and routing
- **Tenant Registration Form**: Add custom subdomain input field with real-time availability check
- **Subdomain Preview**: Show live preview of tenant URL (e.g., `your-company.mscan.com`)
- **Subdomain Suggestions**: Auto-suggest slug based on tenant name, allow editing
- **Validation Feedback**: Real-time validation (format, availability, reserved names)
- **Login Redirect**: After OTP verification, redirect to tenant's subdomain
- **Super Admin Portal**: Always accessible at root domain
- **Tenant Portal**: Accessible only at tenant's subdomain
- **Subdomain Guard**: Angular guard to verify user belongs to current subdomain

### 4. Development Environment
- **Local Setup**: Use `*.localhost` for development (e.g., `acme-corp.localhost:4200`)
- **Hosts File**: Document setup for testing multiple subdomains locally
- **Environment Variables**: Support both subdomain and path-based routing for flexibility

## Implementation Approach

### Phase 1: Database & Backend Foundation
1. Add database migration for `subdomain_slug`
2. Create slug generation service (auto-suggest + custom input)
3. Add API endpoint for real-time subdomain availability check
4. Implement subdomain detection middleware (database lookup, no DNS)
5. Update tenant creation to accept custom subdomain input
6. Add subdomain validation and uniqueness checks
7. Add reserved subdomain list validation

### Phase 2: Authentication & Routing
1. Update authentication to work with subdomains
2. Implement tenant context resolution from subdomain
3. Configure CORS for wildcard subdomains
4. Update JWT to include tenant subdomain
5. Add subdomain-based route guards

### Phase 3: Frontend Integration
1. Update Angular environment configuration
2. Implement subdomain detection service
3. Add custom subdomain input field to tenant registration form
4. Implement real-time subdomain availability checker (debounced API calls)
5. Add subdomain preview and validation UI feedback
6. Show auto-suggested slug with edit capability
7. Add subdomain guards for routes
8. Update login flow to redirect to tenant subdomain
9. Update navigation for subdomain-aware routing

### Phase 4: Testing & Documentation
1. Add unit tests for slug generation
2. Add integration tests for subdomain routing
3. Test CORS with multiple subdomains
4. Document local development setup
5. Document deployment with DNS configuration

## Impact Assessment

### Breaking Changes
- **Existing Tenants**: Need to generate subdomains for existing tenants
- **Bookmarked URLs**: Old path-based URLs will need redirects
- **API Calls**: Frontend must include subdomain in requests

### Backward Compatibility
- Keep path-based routing as fallback for transition period
- Support both `tenant.mscan.com` and `mscan.com/tenant/*` during migration
- Provide migration script for existing data

### Security Considerations
- **Subdomain Takeover**: Prevent unauthorized subdomain creation
- **CORS Security**: Validate subdomain pattern in CORS configuration
- **Tenant Isolation**: Ensure strict validation that users can only access their tenant's subdomain
- **DNS Wildcard**: Properly configure DNS for production

### Performance Impact
- Minimal overhead for subdomain parsing
- Early tenant context loading improves performance
- Reduced route complexity without tenant ID in paths

## Tenant Registration Flow

### New Tenant Registration with Custom Subdomain

**Step 1: Basic Information**
- Tenant name, contact person, email, phone (existing fields)

**Step 2: Choose Subdomain (NEW)**
```
┌─────────────────────────────────────────────────┐
│ Choose Your Subdomain                           │
├─────────────────────────────────────────────────┤
│ Tenant Name: Acme Corporation                   │
│                                                 │
│ Your subdomain:                                 │
│ ┌─────────────┐                                │
│ │ acme-corp   │ .mscan.com    [✓ Available]    │
│ └─────────────┘                                │
│                                                 │
│ Suggested: acme-corp, acme, acmecorp           │
│                                                 │
│ Your dashboard will be accessible at:          │
│ https://acme-corp.mscan.com                    │
│                                                 │
│ ⓘ Only lowercase letters, numbers, and hyphens │
│   3-50 characters                               │
└─────────────────────────────────────────────────┘
```

**Real-time Validation**:
- ✓ Format validation (a-z, 0-9, hyphens only)
- ✓ Length check (3-50 characters)
- ✓ Availability check (debounced API call)
- ✓ Reserved subdomain check
- ✓ Show suggestions if unavailable

**Step 3: Confirmation**
- Review all information including chosen subdomain
- Create tenant with custom subdomain
- **No DNS changes needed** - wildcard DNS already configured

## Migration Strategy

### For Existing Tenants
```sql
-- Generate subdomains for existing tenants
UPDATE tenants 
SET subdomain_slug = LOWER(REGEXP_REPLACE(tenant_name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE subdomain_slug IS NULL;

-- Handle duplicates by appending incremental numbers
-- (handled by migration script logic)
```

### DNS Setup (One-Time Only)
```bash
# Add to DNS provider (Hostinger, Cloudflare, etc.)
A    @     →  your-server-ip
A    *     →  your-server-ip  # Wildcard catches all subdomains

# That's it! No more DNS changes needed for new tenants
```

### For Users
1. Email notification about new subdomain access
2. Old URLs redirect to new subdomains for 6 months
3. Update saved links in documentation

## Risks & Mitigation

### Risk 1: DNS Configuration Complexity
- **Mitigation**: Provide clear documentation and automation scripts
- **Fallback**: Keep path-based routing available

### Risk 2: Local Development Setup
- **Mitigation**: Use `*.localhost` which works without hosts file on modern browsers
- **Fallback**: Document hosts file setup for older systems

### Risk 3: Slug Conflicts
- **Mitigation**: Implement automatic conflict resolution (append numbers)
- **Validation**: Check uniqueness before tenant creation

### Risk 4: Cross-Origin Issues
- **Mitigation**: Properly configure CORS with wildcard support
- **Testing**: Comprehensive CORS testing across subdomains

## Success Criteria
- [ ] Tenants can choose custom subdomain during registration
- [ ] Real-time subdomain availability check works
- [ ] Auto-suggested slugs are generated from tenant name
- [ ] Subdomain validation prevents invalid formats
- [ ] Reserved subdomains are blocked
- [ ] Tenants can access dashboard at `{custom-slug}.mscan.com`
- [ ] Super admin portal remains at root domain
- [ ] Subdomain authentication works correctly
- [ ] Existing tenants migrated with auto-generated slugs
- [ ] New tenants instantly accessible at chosen subdomain (no DNS wait)
- [ ] Local development works with `*.localhost`
- [ ] All tests pass with subdomain routing
- [ ] Zero security vulnerabilities from subdomain handling
- [ ] Single deployment handles unlimited subdomains

## Timeline Estimate
- **Phase 1**: 2-3 days (Database & Backend)
- **Phase 2**: 2-3 days (Authentication)
- **Phase 3**: 2-3 days (Frontend)
- **Phase 4**: 1-2 days (Testing & Docs)
- **Total**: 7-11 days

## Dependencies
- Node.js subdomain parsing (no new dependencies needed)
- Angular environment configuration updates
- DNS wildcard configuration for production
- SSL certificate with wildcard support (`*.mscan.com`)

## Alternatives Considered

### Alternative 1: Path-based Multi-tenancy (Current)
- **Pros**: Simpler setup, no DNS configuration
- **Cons**: Less professional, tenant ID in URLs, harder white-labeling

### Alternative 2: Separate Deployments per Tenant
- **Pros**: Complete isolation, custom domains easy
- **Cons**: High infrastructure cost, complex management

### Alternative 3: Query Parameter Tenant Selection
- **Pros**: Simplest implementation
- **Cons**: Poor UX, security concerns, unprofessional

## References
- Multi-tenant SaaS best practices
- Subdomain routing patterns
- Angular environment-based configuration
- Express.js subdomain handling
