# TMS System - Transport Management System

A multi-tenant transport management system with OTP-based authentication, role-based access control, and comprehensive dashboard features.

## Architecture

- **Frontend**: Angular 21 with standalone components, TypeScript, Tailwind CSS
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with UUID support
- **Authentication**: OTP-based email login with JWT tokens (access + refresh)
- **Security**: Rate limiting, token blacklisting, CORS protection

## Features

### Authentication
- ✅ OTP-based email login (no passwords)
- ✅ 6-digit OTP with 5-minute expiry
- ✅ JWT access tokens (30 minutes) and refresh tokens (7 days)
- ✅ Automatic token refresh for active users
- ✅ Rate limiting: 3 OTP requests per 15 minutes

### User Roles
- **SUPER_ADMIN**: Full system access, can register new customers
- **TENANT_ADMIN**: Manage their tenant/company
- **TENANT_USER**: Basic tenant access

### Multi-Tenant Support
- Data isolation between tenants
- Customer registration by Super Admin only
- Automatic welcome email to new customers
- Tenant-specific dashboards
- **Subdomain-based routing**: Each tenant gets their own subdomain (e.g., `acme.mscan.com`)
- Automatic subdomain slug generation from tenant name
- Real-time subdomain availability checking
- Custom subdomain support during tenant registration
- Tenant-scoped authentication via subdomain validation

### Dashboards
- **Super Admin Dashboard**:
  - Total customers/tenants
  - Total users across all tenants
  - Active sessions (24h)
  - Recent customers table
  - Customer registration link

- **Tenant Dashboard**:
  - Company information
  - Total users in company
  - Active users (24h)
  - Recent activity log

## Project Structure

```
mscan/
├── mscan-server/          # Backend Node.js application
│   ├── database/
│   │   ├── schema.sql     # Database schema
│   │   ├── seed.sql       # Initial data (super admin)
│   │   └── migrate.js     # Migration runner
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/    # Auth, error handling
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic (OTP, tokens, email)
│   │   ├── config/        # Database connection
│   │   └── server.js      # Express app entry point
│   ├── .env               # Environment variables
│   └── package.json
│
└── mscan-client/          # Frontend Angular application
    ├── src/
    │   ├── app/
    │   │   ├── components/        # UI components
    │   │   │   ├── login/
    │   │   │   ├── dashboard/
    │   │   │   ├── super-admin-dashboard/
    │   │   │   ├── tenant-dashboard/
    │   │   │   └── customer-registration/
    │   │   ├── services/          # API services
    │   │   │   ├── auth.service.ts
    │   │   │   ├── user.service.ts
    │   │   │   └── dashboard.service.ts
    │   │   ├── guards/            # Route guards
    │   │   ├── interceptors/      # HTTP interceptor
    │   │   ├── models/            # TypeScript interfaces
    │   │   └── environments/      # Environment configs
    │   └── styles.css
    └── package.json
```

## Setup Instructions

### Prerequisites
- Node.js v20.19.4 or higher
- PostgreSQL 14 or higher
- npm 10.8.2 or higher

### Local Development with Subdomains

The application supports subdomain-based tenant routing. For local development:

**Option 1: Use `*.localhost` (Recommended - Works on most systems)**
- Access root domain: `http://localhost:4200`
- Access tenant subdomains: `http://tenant-slug.localhost:4200`
- No configuration needed - modern browsers automatically resolve `*.localhost`

**Option 2: Edit `/etc/hosts` (If `*.localhost` doesn't work)**
```bash
# Add entries to /etc/hosts
127.0.0.1 localhost
127.0.0.1 tenant1.localhost
127.0.0.1 tenant2.localhost
# Add more as needed for each tenant
```

**Testing Subdomain Routing:**
```bash
# After creating a tenant with slug "acme":
# Access via: http://acme.localhost:4200
# Login will redirect to tenant's subdomain after OTP verification
```

### 1. Database Setup

```bash
# Create database
PGPASSWORD=admin psql -U postgres -c "CREATE DATABASE mscan_db;"

# Run migrations
cd mscan-server
node database/migrate.js

# If you have existing tenants without subdomains, run the subdomain migration:
node database/migrate-tenant-subdomains.js --dry-run  # Preview changes
node database/migrate-tenant-subdomains.js             # Apply changes
```

Expected output:
```
✨ Database migration completed successfully!
```

### 2. Backend Setup

```bash
cd mscan-server

# Install dependencies (if not already installed)
npm install

# Configure environment variables (.env already exists)
# Update EMAIL_PASSWORD in .env for production email sending

# Start server
node src/server.js
```

Server will start on **http://localhost:3000**

Health check:
```bash
curl http://localhost:3000/health
# Expected: {"status":"healthy","timestamp":"...","database":"connected"}
```

### 3. Frontend Setup

```bash
cd mscan-client

# Install dependencies (if not already installed)
npm install

# Start development server
npx ng serve --open
```

Frontend will open at **http://localhost:4200**

## Default Credentials

### Super Admin (Pre-seeded)
- **Email**: admin@mscan.com
- **Password**: N/A (use OTP login)

### Test Customer (Created during testing)
- **Company**: Test Transport Co
- **Email**: admin@testtransport.com
- **Password**: N/A (use OTP login)

## Testing the Application

### 1. Test OTP Login Flow

#### Request OTP:
```bash
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@mscan.com"}'
```

Response:
```json
{
  "success": true,
  "message": "OTP sent to your email address",
  "expiresIn": 5
}
```

**Note**: In development, OTPs are logged to console. Check the backend terminal for:
```
🔐 OTP for admin@mscan.com: 123456
```

#### Verify OTP:
```bash
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mscan.com",
    "otp": "123456"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userType": "SUPER_ADMIN"
  }
}
```

#### Get User Context:
```bash
curl -X GET http://localhost:3000/auth/context \
  -H "Authorization: Bearer <accessToken>"
```

### 2. Test Customer Registration (Super Admin Only)

```bash
curl -X POST http://localhost:3000/users/customers \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "ABC Logistics",
    "contactEmail": "admin@abclogistics.com",
    "adminName": "John Doe",
    "contactPhone": "+1 555 0100",
    "address": "123 Main St, City, State 12345"
  }'
```

### 3. Test Dashboard Endpoints

#### Super Admin Dashboard:
```bash
curl -X GET http://localhost:3000/dashboard/stats \
  -H "Authorization: Bearer <accessToken>"
```

#### Tenant Dashboard (login as tenant admin first):
```bash
# Request OTP for tenant admin
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@testtransport.com"}'

# After verifying OTP and getting token:
curl -X GET http://localhost:3000/dashboard/stats \
  -H "Authorization: Bearer <tenantAccessToken>"
```

### 4. Test Token Refresh

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refreshToken>"}'
```

### 5. Frontend UI Testing

1. **Login Page** (http://localhost:4200/login):
   - Enter email: `admin@mscan.com`
   - Click "Send OTP"
   - Check backend console for OTP code
   - Enter the 6-digit OTP
   - Click "Verify & Login"

2. **Super Admin Dashboard**:
   - View system statistics
   - See recent customers table
   - Click "Register New Customer" button

3. **Customer Registration**:
   - Fill in company details
   - Submit form
   - Verify success message
   - Automatic redirect to dashboard

4. **Tenant Login & Dashboard**:
   - Logout from super admin
   - Login with tenant email (e.g., admin@testtransport.com)
   - View tenant-specific dashboard
   - See company info and activity

5. **Navigation & Guards**:
   - Try accessing `/customers` as non-super-admin (should redirect)
   - Try accessing `/dashboard` without login (should redirect to login)
   - Verify automatic token refresh (wait 30+ minutes while using app)

## API Endpoints

### Authentication
- `POST /auth/request-otp` - Request OTP code
- `POST /auth/verify-otp` - Verify OTP and login
- `GET /auth/context` - Get user details (requires auth)
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout and blacklist tokens

### Tenant Management
- `POST /users/customers` - Create new customer/tenant (Super Admin only)
- `GET /users/customers` - List all customers (Super Admin only)
- `GET /tenants/check-slug/:slug` - Check subdomain availability (real-time)
- `GET /tenants/suggest-slugs` - Get subdomain slug suggestions based on tenant name
- `POST /tenants` - Create tenant with custom subdomain

### User Management
- `GET /users/profile` - Get current user profile
- `PUT /users/profile` - Update user profile

### Dashboard
- `GET /dashboard/stats` - Get role-based dashboard statistics

### Health
- `GET /health` - Server health check

## Configuration

### Backend Environment Variables (.env)
```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mscan_db
DB_USER=postgres
DB_PASSWORD=admin

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key-change-this-in-production

# Email (Gmail SMTP)
EMAIL_USER=sumantmishra511@gmail.com
EMAIL_PASSWORD=your-app-password-here
EMAIL_FROM=TMS System <sumantmishra511@gmail.com>

# Subdomain Configuration
DOMAIN_BASE=localhost
ENABLE_SUBDOMAIN_ROUTING=true
RESERVED_SUBDOMAINS=www,api,admin,app,mail,ftp,smtp,pop,imap,ns1,ns2,localhost,staging,dev,test
CORS_ORIGIN=http://localhost:4200

# App
PORT=3000
NODE_ENV=development
```

### Frontend Environment (src/environments/environment.ts)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  domainBase: 'localhost',
  enableSubdomainRouting: true
};
```

**Production** (src/environments/environment.prod.ts):
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.mscan.com',
  domainBase: 'mscan.com',
  enableSubdomainRouting: true
};
```

## Security Features

1. **OTP Authentication**:
   - 6-digit random codes
   - 5-minute expiry
   - Single-use OTPs
   - Maximum 3 verification attempts
   - Rate limiting (3 requests per 15 minutes)

2. **JWT Tokens**:
   - Access token: 30 minutes
   - Refresh token: 7 days
   - Unique JTI (JWT ID) for each token
   - Token blacklisting on logout

3. **Password Security**:
   - No passwords stored (OTP-only authentication)
   - Future support for bcrypt hashing

4. **Data Protection**:
   - CORS enabled for specific origins
   - Helmet.js security headers
   - SQL injection prevention (parameterized queries)
   - XSS protection

5. **Multi-Tenant Isolation**:
   - Tenant-specific data queries
   - Super Admin enforcement (CHECK constraints)
   - Role-based authorization middleware

## Troubleshooting

### Subdomain Routing Issues

**Subdomain not resolving locally:**
```bash
# Option 1: Use *.localhost (works on most modern browsers)
http://tenant-slug.localhost:4200

# Option 2: Add to /etc/hosts (macOS/Linux)
sudo nano /etc/hosts
# Add: 127.0.0.1 tenant-slug.localhost

# Option 3: Add to C:\Windows\System32\drivers\etc\hosts (Windows)
# Add: 127.0.0.1 tenant-slug.localhost
```

**Login redirects to wrong subdomain:**
- Verify JWT token includes `subdomainSlug` field
- Check subdomain detection in browser console
- Ensure `DOMAIN_BASE` environment variable matches your setup

**Tenant created but subdomain doesn't work:**
- Verify `subdomain_slug` field in database: `SELECT id, name, subdomain_slug FROM tenants;`
- Check for reserved subdomain conflicts (www, api, admin, etc.)
- Run subdomain migration script if needed: `node database/migrate-tenant-subdomains.js`

**CORS errors with subdomains:**
- Verify CORS configuration allows wildcard subdomains
- Check backend CORS settings in `server.js`
- Ensure cookies/credentials are properly configured

### Backend Issues

**Database connection failed:**
```bash
# Verify PostgreSQL is running
pg_isready -h localhost -p 5432

# Check database exists
psql -U postgres -l | grep mscan_db

# Recreate if needed
psql -U postgres -c "DROP DATABASE IF EXISTS mscan_db;"
psql -U postgres -c "CREATE DATABASE mscan_db;"
node database/migrate.js
```

**OTP not sending:**
- Development: OTPs are logged to console (check backend terminal)
- Production: Configure EMAIL_PASSWORD in .env with Gmail app password

**Port 3000 already in use:**
```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Frontend Issues

**Angular compilation errors:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Restart dev server
npx ng serve
```

**API calls failing (CORS):**
- Verify backend is running on port 3000
- Check CORS configuration in mscan-server/src/server.js
- Ensure frontend uses correct API URL in environment.ts

**Token refresh not working:**
- Check browser console for errors
- Verify auth interceptor is registered in app.config.ts
- Check token expiry times in backend .env

## Future Enhancements

- [ ] Production subdomain deployment (DNS wildcard, SSL certificates)
- [ ] Subdomain caching for performance optimization
- [ ] Subdomain analytics and monitoring
- [ ] Custom domain mapping (tenant-owned domains)
- [ ] Email service integration (production SMTP)
- [ ] User profile picture uploads
- [ ] Advanced audit logging
- [ ] Real-time notifications (WebSocket)
- [ ] Export dashboard data (CSV/PDF)
- [ ] Multi-factor authentication (MFA)
- [ ] Password recovery flow
- [ ] User invitation system
- [ ] Bulk user import
- [ ] Advanced analytics

---

## Production Deployment (Subdomain Routing)

### DNS Configuration
For production subdomain routing, configure a wildcard DNS A record:

```
Type: A
Name: *
Value: <your-server-ip>
TTL: 3600
```

This allows `*.mscan.com` (any subdomain) to resolve to your server without creating individual DNS records for each tenant.

### SSL Certificate
Obtain a wildcard SSL certificate for your domain:

```bash
# Using Let's Encrypt with Certbot (recommended)
sudo certbot certonly --manual --preferred-challenges=dns \
  -d mscan.com -d *.mscan.com
```

### Nginx Configuration
Configure nginx to handle subdomain routing:

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name mscan.com *.mscan.com;

    ssl_certificate /etc/letsencrypt/live/mscan.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mscan.com/privkey.pem;

    # Frontend (Angular)
    location / {
        proxy_pass http://localhost:4200;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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

### Environment Configuration (Production)

**Backend (.env):**
```
DOMAIN_BASE=mscan.com
ENABLE_SUBDOMAIN_ROUTING=true
CORS_ORIGIN=https://mscan.com,https://*.mscan.com
NODE_ENV=production
```

**Frontend (environment.prod.ts):**
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.mscan.com',
  domainBase: 'mscan.com',
  enableSubdomainRouting: true
};
```

### Verification
After deployment, test subdomain routing:
```bash
# Root domain
curl https://mscan.com/health

# Tenant subdomain (replace 'acme' with actual tenant slug)
curl https://acme.mscan.com/health

# Check SSL certificate
openssl s_client -connect acme.mscan.com:443 -servername acme.mscan.com
```

## License

MIT License

## Support

For issues or questions, please contact the development team.
