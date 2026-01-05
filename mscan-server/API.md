# TMS Backend API Documentation

## Base URL
```
Development: http://localhost:3000
Production: https://api.mscan.com
Subdomain: https://api.{tenant-slug}.mscan.com (if tenant-specific API endpoint)
```

## Subdomain Routing

The TMS system supports subdomain-based tenant routing. Each tenant has a unique subdomain:

**Examples:**
- Root domain: `https://mscan.com` (Super Admin)
- Tenant A: `https://acme.mscan.com`
- Tenant B: `https://global-transport.mscan.com`

**Local Development:**
- Root: `http://localhost:4200`
- Tenant: `http://tenant-slug.localhost:4200`

**Authentication:**
- JWT tokens include `subdomainSlug` field for tenant identification
- After OTP verification, users are redirected to their tenant's subdomain
- Subdomain validation ensures users can only access their tenant's data

## Authentication Flow
## Public Scan API

### Rate Limits
- `POST /api/public/scan/start`: 60 requests per 10 minutes per `(coupon_code, device_id, ip)`
- `POST /api/public/scan/:sessionId/mobile`: 10 requests per 24 hours per `mobile_e164` (falls back to IP)
- `POST /api/public/scan/:sessionId/verify-otp`: 20 requests per 10 minutes per `sessionId` (per-session)
- All endpoints also have a generic IP limiter (120 req/min). On limit, returns:
```json
{ "success": false, "error": "rate_limited*", "retry_after": "timestamp" }
```

### Telemetry Events
The system records structured events to `scan_events` (or logs if table not present):
- `scan_started`: `{ tenant_id, session_id, coupon_code, device_id }`
- `otp_sent`: `{ tenant_id, session_id, mobile_e164 (masked) }`
- `otp_failed`: `{ tenant_id, session_id, coupon_code, attempts }`
- `otp_verified`: `{ tenant_id, session_id, coupon_code, mobile_e164 }`
- `points_awarded`: `{ tenant_id, session_id, coupon_code, amount, balance }`
- `coupon_redeemed`: `{ tenant_id, session_id, coupon_code }`

### Flow
1. `POST /api/public/scan/start` → validates `coupon_code` is `active` and creates session.
2. `POST /api/public/scan/:sessionId/mobile` → captures `mobile_e164`, generates OTP.
3. `POST /api/public/scan/:sessionId/verify-otp` → verifies OTP, awards `coupon_points`, updates ledger, and marks coupon `used`.


### 1. Request OTP
```bash
POST /auth/request-otp
Content-Type: application/json

{
  "email": "admin@mscan.com"
}

Response:
{
  "success": true,
  "message": "OTP sent to your email address",
  "expiresIn": 5
}
```

**Note:** Check `mscan-server/server.log` for the OTP code in development.

### 2. Verify OTP & Login
```bash
POST /auth/verify-otp
Content-Type: application/json

{
  "email": "admin@mscan.com",
  "otp": "123456"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "userType": "SUPER_ADMIN",
    "subdomain": null  // null for super admin, tenant slug for tenant users
  }
}
```

**JWT Token Payload:**
```json
{
  "userId": "uuid",
  "role": "TENANT_ADMIN",
  "tenantId": "tenant-uuid",
  "subdomainSlug": "acme-logistics",  // Tenant's subdomain
  "jti": "unique-token-id",
  "type": "access",
  "iat": 1234567890,
  "exp": 1234569690
}
```

**Subdomain Redirect:**
- Super Admin: Remains on root domain (`mscan.com`)
- Tenant Users: Redirected to tenant subdomain after login (`acme-logistics.mscan.com`)

### 3. Get User Context
```bash
GET /auth/context
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@mscan.com",
    "fullName": "System Administrator",
    "role": "SUPER_ADMIN",
    "permissions": [
      "view_all_tenants",
      "create_customer",
      "manage_users",
      "view_system_stats",
      "access_admin_panel"
    ]
  }
}
```

### 4. Refresh Token
```bash
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGci..."
}

Response:
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

### 5. Logout
```bash
POST /auth/logout
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "refreshToken": "eyJhbGci..."
}

Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

## User Management (Super Admin Only)

### Create Customer (Tenant)
```bash
POST /users/customers
Authorization: Bearer {superAdminAccessToken}
Content-Type: application/json

{
  "companyName": "Test Transport Co",
  "adminEmail": "admin@testtransport.com",
  "adminName": "John Doe",
  "contactPhone": "+1234567890",
  "address": "123 Test Street, Test City",
  "subdomainSlug": "test-transport"  // Optional: custom subdomain (auto-generated if omitted)
}

Response:
{
  "success": true,
  "message": "Customer created successfully",
  "data": {
    "tenant": {
      "id": "uuid",
      "companyName": "Test Transport Co",
      "contactEmail": "admin@testtransport.com",
      "subdomainSlug": "test-transport"  // Generated or custom subdomain
    },
    "admin": {
      "id": "uuid",
      "email": "admin@testtransport.com",
      "fullName": "John Doe",
      "role": "TENANT_ADMIN"
    }
  }
}
```

**Subdomain Slug Rules:**
- 3-50 characters
- Lowercase alphanumeric and hyphens only
- Cannot use reserved subdomains (www, api, admin, app, etc.)
- Must be unique across all tenants
- Auto-generated from company name if not provided

### Get All Customers
```bash
GET /users/customers
Authorization: Bearer {superAdminAccessToken}

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "companyName": "Test Transport Co",
      "contactEmail": "admin@testtransport.com",
      "contactPhone": "+1234567890",
      "address": "123 Test Street",
      "subdomainSlug": "test-transport",  // Tenant's subdomain
      "isActive": true,
      "userCount": 1,
      "createdAt": "2025-12-26T00:00:00.000Z"
    }
  ]
}
```

## User Profile

### Get Profile
```bash
GET /users/profile
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@mscan.com",
    "fullName": "System Administrator",
    "phone": null,
    "role": "SUPER_ADMIN",
    "isActive": true,
    "createdAt": "2025-12-26T00:00:00.000Z"
  }
}
```

### Update Profile
```bash
PUT /users/profile
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "fullName": "Updated Name",
  "phone": "+9876543210"
}

Response:
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid",
    "email": "admin@mscan.com",
    "fullName": "Updated Name",
    "phone": "+9876543210",
    "role": "SUPER_ADMIN"
  }
}
```

## Dashboard

### Get Dashboard Stats
```bash
GET /dashboard/stats
Authorization: Bearer {accessToken}

# Super Admin Response:
{
  "success": true,
  "data": {
    "totalTenants": 1,
    "totalUsers": 2,
    "activeSessions24h": 1,
    "systemHealth": "healthy",
    "recentTenants": [
      {
        "id": "uuid",
        "companyName": "Test Transport Co",
        "contactEmail": "admin@testtransport.com",
        "createdAt": "2025-12-26T00:00:00.000Z"
      }
    ]
  }
}

# Tenant User Response:
{
  "success": true,
  "data": {
    "tenant": {
      "companyName": "Test Transport Co",
      "contactEmail": "admin@testtransport.com",
      "memberSince": "2025-12-26T00:00:00.000Z"
    },
    "totalUsers": 1,
    "activeUsers24h": 1,
    "recentActivity": [
      {
        "action": "LOGIN",
        "user": "John Doe",
        "email": "admin@testtransport.com",
        "timestamp": "2025-12-26T00:00:00.000Z"
      }
    ]
  }
}
```

## Health Check

```bash
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2025-12-26T00:00:00.000Z",
  "database": "connected"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Email is required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "A user with this email already exists"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "message": "Too many OTP requests. Please try again in 10 minutes"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal Server Error"
}
```

---

## Tenant Subdomain Management

### Check Subdomain Availability
Real-time availability checker for tenant subdomain registration.

```bash
GET /tenants/check-slug/:slug
Authorization: Bearer {accessToken}

# Example
GET /tenants/check-slug/acme-logistics

Response (Available):
{
  "success": true,
  "available": true,
  "slug": "acme-logistics",
  "message": "Subdomain is available"
}

Response (Taken):
{
  "success": true,
  "available": false,
  "slug": "acme",
  "message": "Subdomain is already taken",
  "suggestions": [
    "acme-2",
    "acme-logistics",
    "acme-transport"
  ]
}

Response (Invalid):
{
  "success": false,
  "available": false,
  "slug": "a",
  "message": "Subdomain must be 3-50 characters",
  "error": "Invalid slug format"
}

Response (Reserved):
{
  "success": false,
  "available": false,
  "slug": "www",
  "message": "This subdomain is reserved",
  "error": "Reserved subdomain"
}
```

**Reserved Subdomains:**
- System: `www`, `api`, `admin`, `app`, `mail`, `ftp`, `smtp`, `pop`, `imap`
- DNS: `ns1`, `ns2`, `localhost`
- Environments: `staging`, `dev`, `test`, `demo`

### Get Subdomain Suggestions
Generate alternative subdomain slugs based on tenant name.

```bash
GET /tenants/suggest-slugs?name={tenantName}
Authorization: Bearer {accessToken}

# Example
GET /tenants/suggest-slugs?name=Acme%20Logistics%20Inc

Response:
{
  "success": true,
  "suggestions": [
    "acme-logistics-inc",
    "acme-logistics",
    "acme",
    "acme-inc",
    "acmelogistics"
  ]
}
```

**Slug Generation Rules:**
- Convert to lowercase
- Replace spaces with hyphens
- Remove special characters
- Trim to 50 characters max
- Ensure minimum 3 characters
- Check against reserved list
- Verify uniqueness in database

### Create Tenant with Custom Subdomain
```bash
POST /tenants
Authorization: Bearer {superAdminAccessToken}
Content-Type: application/json

{
  "companyName": "Acme Logistics",
  "contactEmail": "admin@acme.com",
  "adminName": "John Smith",
  "contactPhone": "+1234567890",
  "address": "123 Business St",
  "subdomainSlug": "acme"  // Optional: auto-generated if omitted
}

Response (Success):
{
  "success": true,
  "message": "Tenant created successfully",
  "data": {
    "id": "uuid",
    "companyName": "Acme Logistics",
    "contactEmail": "admin@acme.com",
    "subdomainSlug": "acme",
    "tenantUrl": "https://acme.mscan.com"
  }
}

Response (Conflict):
{
  "success": false,
  "message": "Subdomain 'acme' is already taken",
  "suggestions": [
    "acme-2",
    "acme-logistics",
    "acme-transport"
  ]
}
```

### Get Tenant by Subdomain
```bash
GET /tenants/by-subdomain/:slug
Authorization: Bearer {accessToken}

# Example
GET /tenants/by-subdomain/acme

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "companyName": "Acme Logistics",
    "subdomainSlug": "acme",
    "contactEmail": "admin@acme.com",
    "isActive": true,
    "createdAt": "2025-12-26T00:00:00.000Z"
  }
}
```

### Subdomain Validation in Authentication
When a tenant user logs in, the system validates that they're accessing from the correct subdomain:

```bash
GET /auth/context
Authorization: Bearer {accessToken}
Host: acme.mscan.com

Response (Valid Subdomain):
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@acme.com",
    "role": "TENANT_ADMIN",
    "tenant": {
      "id": "uuid",
      "name": "Acme Logistics",
      "subdomain": "acme"
    }
  }
}

Response (Subdomain Mismatch):
{
  "success": false,
  "message": "Subdomain mismatch. Please access from your tenant's subdomain: acme.mscan.com",
  "expectedSubdomain": "acme",
  "currentSubdomain": "wrong-subdomain"
}
```

---

## Default Users

### Super Admin
- **Email:** admin@mscan.com
- **Login:** Use OTP authentication

### Test Tenant Admin (after creating customer)
- **Email:** admin@testtransport.com
- **Login:** Use OTP authentication

## Development Notes

- OTPs are logged to console in development mode (check `server.log`)
- Access tokens expire in 30 minutes
- Refresh tokens expire in 7 days
- OTP rate limit: 3 requests per 15 minutes per email
- OTP expires in 5 minutes
- Maximum OTP attempts: 3

## Testing with cURL

```bash
# Full login flow
OTP_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mscan.com"}')

# Check logs for OTP
tail -1 mscan-server/server.log

# Verify OTP (replace 123456 with actual OTP)
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mscan.com","otp":"123456"}')

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Get dashboard stats
curl -s http://localhost:3000/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"
```
