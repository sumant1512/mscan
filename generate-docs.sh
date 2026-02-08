#!/bin/bash

# MScan Documentation Generator
# This script creates comprehensive documentation for the MScan project

set -e

DOCS_DIR="docs"
mkdir -p "$DOCS_DIR"

echo "📚 Generating MScan Documentation..."

# Create comprehensive documentation files
cat > "$DOCS_DIR/SETUP.md" << 'EOF'
# MScan Setup Guide

Complete installation and configuration guide for MScan platform.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Database Setup](#database-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js**: v20.x or higher ([Download](https://nodejs.org/))
- **PostgreSQL**: v16.x or higher ([Download](https://www.postgresql.org/download/))
- **npm**: v10.x or higher (comes with Node.js)
- **Git**: Latest version

### System Requirements
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 2GB free space
- **OS**: macOS, Linux, or Windows 10+

### Verify Installation
```bash
node --version    # Should show v20.x.x or higher
npm --version     # Should show v10.x.x or higher
psql --version    # Should show 16.x or higher
```

---

## Backend Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd mscan/mscan-server
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_USER=your_db_user
DB_HOST=localhost
DB_NAME=mscan_db
DB_PASSWORD=your_db_password
DB_PORT=5432

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=30m
REFRESH_TOKEN_SECRET=your_refresh_token_secret_change_this
REFRESH_TOKEN_EXPIRES_IN=7d

# Email Configuration (for OTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@mscan.com

# CORS Configuration
FRONTEND_URL=http://localhost:4200
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:3000

# Rate Limiting
OTP_RATE_LIMIT_WINDOW_MS=900000
OTP_RATE_LIMIT_MAX_REQUESTS=3
```

---

## Database Setup

### 1. Create PostgreSQL Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE mscan_db;

# Exit
\q
```

### 2. Run Database Setup
```bash
npm run db:setup
```

This will:
- Create all tables and schemas
- Set up indexes and constraints
- Create triggers and functions
- Insert seed data (super admin user)

### 3. Verify Database Setup
```bash
psql -U your_db_user -d mscan_db -c "\dt"
```

You should see tables like:
- tenants
- users
- verification_apps
- coupons
- coupon_batches
- products
- product_templates
- And 20+ more...

---

## Frontend Setup

### 1. Navigate to Frontend
```bash
cd ../mscan-client
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration

**For Development:**
Edit `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  defaultDomain: 'localhost',
  port: 3000
};
```

**For Production:**
Edit `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.mscan.com/api',
  defaultDomain: 'mscan.com',
  port: 443
};
```

---

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd mscan-server
npm start
# Server runs on http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd mscan-client
npm start
# App runs on http://localhost:4200
```

### Production Mode

**Backend:**
```bash
cd mscan-server
npm run build
npm run start:prod
```

**Frontend:**
```bash
cd mscan-client
npm run build
# Serve dist/mscan-client with nginx or similar
```

---

## Initial Login

### Super Admin Credentials
```
Email: superadmin@mscan.com
```

1. Navigate to `http://localhost:4200`
2. Enter email: `superadmin@mscan.com`
3. Click "Request OTP"
4. Check email for 6-digit OTP
5. Enter OTP and login

### First Time Setup
1. **Create a Tenant**
   - Go to "Tenants" → "Create Tenant"
   - Fill in company details
   - Assign subdomain (e.g., `acme`)

2. **Create Tenant Admin**
   - Go to "Tenant Admins" → "Add Admin"
   - Enter email and select tenant
   - User receives welcome email with OTP

3. **Login as Tenant Admin**
   - Navigate to `http://acme.localhost:4200`
   - Login with tenant admin email

---

## Subdomain Configuration

### Development (localhost)

Add to `/etc/hosts`:
```
127.0.0.1 acme.localhost
127.0.0.1 demo.localhost
```

### Production

Configure DNS:
```
*.mscan.com → Your Server IP
```

Configure nginx/Apache to handle subdomains.

---

## Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL is running
pg_isready

# Check connection with psql
psql -U your_db_user -d mscan_db

# Verify .env credentials match database
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 <PID>

# Or change PORT in .env
```

### Email OTP Not Received
- Check email configuration in `.env`
- For Gmail, use App-Specific Password
- Check spam folder
- View OTP in server logs (development only)

### Frontend Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Angular cache
npm run ng cache clean
```

### Database Migration Fails
```bash
# Reset database
npm run db:reset

# Re-run setup
npm run db:setup
```

---

## Next Steps

- See **[SUPER_ADMIN_FEATURES.md](SUPER_ADMIN_FEATURES.md)** for super admin guide
- See **[TENANT_ADMIN_FEATURES.md](TENANT_ADMIN_FEATURES.md)** for tenant features
- See **[API_REFERENCE.md](API_REFERENCE.md)** for API documentation
- See **[DATABASE_DESIGN.md](DATABASE_DESIGN.md)** for schema details

---

**Setup Complete!** 🎉

For support, create an issue or contact the development team.
EOF

echo "✅ Created SETUP.md"

# Create SUPER_ADMIN_FEATURES.md
cat > "$DOCS_DIR/SUPER_ADMIN_FEATURES.md" << 'EOF'
# Super Admin Features Guide

Complete guide to super administrator capabilities in the MScan platform.

## Table of Contents
- [Overview](#overview)
- [Dashboard](#dashboard)
- [Tenant Management](#tenant-management)
- [Tenant Admin Management](#tenant-admin-management)
- [Credit Management](#credit-management)
- [System Monitoring](#system-monitoring)
- [User Management](#user-management)

---

## Overview

Super Admins have full system-wide access and can:
- Manage all tenants and their data
- Create and manage tenant administrators
- Approve/reject credit requests
- Monitor system health and usage
- Access all analytics across tenants
- Configure system-wide settings

**Access**: Super admins access the platform from the root domain (e.g., `https://mscan.com` or `http://localhost:4200`)

---

## Dashboard

### Main Dashboard

The Super Admin dashboard provides a comprehensive overview of the entire platform:

**Key Metrics:**
- Total Tenants: Active and inactive tenant count
- Total Users: All users across all tenants
- Total Coupons: All coupons created system-wide
- Total Scans: Cumulative scan count
- Active Sessions (24h): Recent login activity
- System Health Status

**Recent Activity:**
- Newly created tenants
- Recent tenant admin registrations
- Credit requests pending approval
- System-wide scan activity

### Accessing Dashboard

1. Login at root domain with super admin credentials
2. Email: `superadmin@mscan.com`
3. Request OTP and verify
4. Dashboard loads automatically

---

## Tenant Management

### Viewing Tenants

**Navigation:** Dashboard → Tenants → Tenant List

**Features:**
- View all tenants with pagination
- Search by tenant name or email
- Filter by status (Active/Inactive)
- Sort by creation date, name, or status

**Tenant Information Displayed:**
- Company name
- Contact email and phone
- Subdomain slug (e.g., `acme`)
- Credit balance
- Status (Active/Inactive)
- Creation date
- User count

### Creating Tenants

**Navigation:** Tenants → Create Tenant

**Required Information:**
- **Company Name**: Official business name
- **Admin Email**: Email for tenant admin (must be unique)
- **Admin Name**: Full name of tenant administrator
- **Contact Phone**: Business phone number
- **Address**: Business address
- **Subdomain Slug**: Custom subdomain (auto-generated if omitted)

**Subdomain Rules:**
- 3-50 characters
- Lowercase alphanumeric and hyphens only
- Cannot use reserved subdomains (www, api, admin, app, mail, etc.)
- Must be unique across all tenants

**Process:**
1. Click "Create Tenant" button
2. Fill in required fields
3. Optional: Customize subdomain slug
4. Click "Submit"
5. System creates:
   - Tenant record
   - Tenant admin user
   - Initial credit balance (0)
   - Sends welcome email with OTP to admin

### Editing Tenants

**Editable Fields:**
- Company name
- Contact email
- Contact phone
- Address
- Status (Active/Inactive)

**Non-Editable:**
- Subdomain slug (cannot be changed after creation)
- Tenant ID
- Creation date

### Deactivating Tenants

**Process:**
1. Navigate to tenant details
2. Click "Deactivate Tenant"
3. Confirm action
4. Effects:
   - Tenant status set to "Inactive"
   - All tenant users cannot login
   - Verification apps become inactive
   - Coupons cannot be scanned
   - Data is preserved

**Reactivation:**
- Click "Activate Tenant" to restore access

### Deleting Tenants

**Warning:** Deletion is permanent and cannot be undone.

**What Gets Deleted:**
- Tenant record
- All users associated with tenant
- All verification apps
- All categories and products
- All coupons and batches
- All scan history
- All credit transactions

**Process:**
1. Navigate to tenant details
2. Click "Delete Tenant"
3. Type tenant name to confirm
4. System performs cascade deletion

---

## Tenant Admin Management

### Viewing Tenant Admins

**Navigation:** Dashboard → Tenant Admins

**List View Shows:**
- Admin name and email
- Associated tenant
- Account status
- Creation date
- Last login

### Creating Tenant Admins

**Navigation:** Tenant Admins → Add Admin

**Required:**
- **Email**: Unique email for admin
- **Full Name**: Admin's name
- **Tenant**: Select from existing tenants
- **Phone** (optional): Contact number

**Process:**
1. Fill in admin details
2. Select tenant from dropdown
3. Click "Create Admin"
4. System:
   - Creates TENANT_ADMIN user
   - Assigns full tenant permissions
   - Sends welcome email with OTP
   - Links user to tenant

**Permissions Assigned:**
- All tenant-scoped permissions
- Cannot access other tenants
- Cannot perform super admin actions

### Managing Tenant Admins

**Available Actions:**
- View admin details
- Edit profile information
- Reset password (send new OTP)
- Deactivate/activate account
- Delete admin (requires confirmation)
- View login history
- Change associated tenant (requires re-authentication)

---

## Credit Management

### Credit Request Workflow

Tenants request credits to create coupons. Super admins approve/reject these requests.

### Viewing Credit Requests

**Navigation:** Dashboard → Credit Management → Approval Queue

**Request Information:**
- Tenant name and contact
- Requested amount
- Justification/reason
- Request date
- Current credit balance
- Status (Pending/Approved/Rejected)

**Filters:**
- Status filter
- Date range
- Tenant search
- Sort by amount or date

### Approving Credits

**Process:**
1. Review request details
2. Check tenant's usage history
3. Verify justification
4. Click "Approve"
5. System:
   - Updates tenant credit balance
   - Creates credit transaction record
   - Sends approval notification to tenant
   - Records approver and timestamp

### Rejecting Credits

**Process:**
1. Click "Reject" on request
2. Enter rejection reason (required)
3. Confirm rejection
4. System:
   - Marks request as rejected
   - Sends rejection email with reason
   - Records rejection details

### Manual Credit Adjustment

**Use Cases:**
- Bonus credits
- Corrections
- Refunds
- Promotional grants

**Process:**
1. Navigate to tenant details
2. Click "Adjust Credits"
3. Enter amount (positive for credit, negative for debit)
4. Add description/reason
5. Confirm adjustment
6. System creates transaction record

### Viewing Credit History

**Per Tenant:**
- All credit transactions
- Requests approved/rejected
- Manual adjustments
- Coupon creation debits
- Current balance

**System-Wide:**
- Total credits issued
- Average request amount
- Approval rate
- Top credit consumers

---

## System Monitoring

### System Health

**Metrics Monitored:**
- Database connection status
- API response times
- Error rates
- Active sessions
- Server uptime
- Memory/CPU usage (if configured)

### Usage Analytics

**System-Wide Stats:**
- Total users by role
- Active tenants count
- Total coupons created
- Scan success/failure rates
- Geographic distribution
- Peak usage times

### Audit Logs

**Tracked Actions:**
- User logins/logouts
- Tenant creation/deletion
- Credit approvals/rejections
- Configuration changes
- Failed authentication attempts

**Log Details:**
- User who performed action
- Timestamp
- Action type
- Resource affected
- IP address
- User agent

---

## User Management

### Viewing All Users

**Navigation:** Dashboard → Users

**Search & Filter:**
- Search by email or name
- Filter by role (SUPER_ADMIN, TENANT_ADMIN, TENANT_USER)
- Filter by status (Active/Inactive)
- Filter by tenant

### Creating Super Admins

**Warning:** Use sparingly - full system access.

**Process:**
1. Navigate to Users → Create User
2. Select role: SUPER_ADMIN
3. Enter email and name
4. System creates user with no tenant association
5. User receives OTP email

### Managing User Sessions

**Capabilities:**
- View active sessions
- Force logout (blacklist tokens)
- View login history
- Track failed login attempts

---

## Best Practices

### Tenant Creation
- Verify business legitimacy before creating tenants
- Use descriptive subdomain slugs
- Set appropriate initial credit limits
- Document tenant onboarding process

### Credit Management
- Review credit requests promptly (24-48 hours)
- Verify usage patterns before large approvals
- Set credit limits based on business size
- Monitor for abuse or unusual patterns

### Security
- Regularly review audit logs
- Monitor failed login attempts
- Deactivate inactive tenants
- Rotate super admin passwords periodically
- Limit number of super admin accounts

### Monitoring
- Check system health daily
- Review error logs weekly
- Analyze usage trends monthly
- Plan capacity based on growth

---

## Common Tasks

### Monthly Review Checklist
- [ ] Review pending credit requests
- [ ] Check system health metrics
- [ ] Audit inactive tenants
- [ ] Review error logs
- [ ] Analyze usage trends
- [ ] Verify backup integrity
- [ ] Update system documentation

### Quarterly Tasks
- [ ] Review all tenant accounts
- [ ] Audit user access levels
- [ ] Clean up inactive users
- [ ] Review credit allocation patterns
- [ ] Plan capacity upgrades
- [ ] Update security policies

---

## Troubleshooting

### Tenant Cannot Login
1. Check tenant status (Active/Inactive)
2. Verify subdomain configuration
3. Check user account status
4. Review recent audit logs
5. Verify email delivery for OTPs

### Credit Request Not Showing
1. Refresh approval queue
2. Check status filters
3. Verify tenant has pending requests
4. Check database connectivity

### System Performance Issues
1. Check system health dashboard
2. Review error logs
3. Monitor database queries
4. Check server resources
5. Review recent changes

---

**For technical details, see:**
- [API_REFERENCE.md](API_REFERENCE.md)
- [DATABASE_DESIGN.md](DATABASE_DESIGN.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
EOF

echo "✅ Created SUPER_ADMIN_FEATURES.md"

# Create TENANT_ADMIN_FEATURES.md
cat > "$DOCS_DIR/TENANT_ADMIN_FEATURES.md" << 'EOF'
# Tenant Admin Features Guide

Complete guide to tenant administrator capabilities in the MScan platform.

## Table of Contents
- [Overview](#overview)
- [Dashboard](#dashboard)
- [Verification Apps](#verification-apps)
- [Product Catalog](#product-catalog)
- [Coupon Management](#coupon-management)
- [Batch Management](#batch-management)
- [Scan History](#scan-history)
- [Credit Management](#credit-management)
- [User Management](#user-management)
- [Settings](#settings)

---

## Overview

Tenant Admins have full control over their tenant's operations:
- Create and manage verification apps
- Build product catalogs with templates
- Generate coupon batches
- Track scan activity
- Manage tenant users and permissions
- Request credits for coupon creation

**Access**: Tenants access via their subdomain (e.g., `https://acme.mscan.com` or `http://acme.localhost:4200`)

---

## Dashboard

### Tenant Dashboard Overview

**Key Metrics:**
- Total Verification Apps
- Total Products
- Total Coupons (Active/Used/Expired)
- Total Scans (Success/Failed)
- Credit Balance
- Recent Activity

**Quick Actions:**
- Create New Coupon
- Create Batch
- View Scan History
- Request Credits

---

## Verification Apps

Verification apps are branded QR code scanning interfaces for mobile apps or web apps.

### Creating Verification Apps

**Navigation:** Dashboard → Verification Apps → Create App

**Required:**
- **App Name**: Display name (e.g., "Mobile Rewards App")
- **Description**: App purpose and usage

**Optional Branding:**
- **Logo URL**: App logo image
- **Primary Color**: Brand color (#hex)
- **Secondary Color**: Accent color
- **Welcome Message**: Greeting shown to users
- **Success Message**: Message on successful scan
- **Failure Message**: Message on failed scan
- **Post-Scan Redirect**: URL to redirect after scan

**System Generated:**
- **App Code**: URL-safe identifier (e.g., `mobile-rewards-app`)
- **API Key**: 64-character hex string for external integrations

**Process:**
1. Click "Create Verification App"
2. Fill in required fields
3. Customize branding (optional)
4. Click "Create"
5. Save API key securely (shown only once)

### Managing Apps

**Available Actions:**
- Edit app details and branding
- Regenerate API key (invalidates old key)
- Toggle app status (Active/Inactive)
- Delete app (deletes all associated data)

**App Isolation:**
- Each app has separate categories and products
- Coupons are app-specific
- Scan history is tracked per app
- Credits are shared across all tenant apps

### API Key Usage

External mobile/web apps use the API key to:
- Fetch categories and products
- Scan coupons and award points
- Check user credit balance
- Process redemptions

**Security:**
- Store API key in secure environment variables
- Use HTTPS for all API calls
- Regenerate if compromised

---

## Product Catalog

### Template System

MScan uses a JSONB-based template system for flexible product catalogs.

#### Creating Templates

**Navigation:** Dashboard → Templates → Create Template

**Basic Info:**
- Template Name
- Description
- Icon (material icon name)

**Custom Fields (Attributes):**
- Attribute Name (e.g., "Brand", "Size", "Color")
- Attribute Key (auto-generated from name)
- Data Type:
  - Text (string)
  - Number (integer/decimal)
  - Yes/No (boolean)
  - Date
  - Dropdown (select)
  - Multi-Select
  - URL
  - Email

**Validation Rules:**
- Min/Max length (for text)
- Min/Max value (for numbers)
- Allowed options (for dropdowns)
- Regex pattern (for text)
- Required/Optional

**Grouping:**
- Field Group (e.g., "Specifications", "Pricing")
- Display Order (for UI rendering)

**Example Template:**
```
Template: Electronics Product
Attributes:
  Basic Info:
    - Brand (text, required)
    - Model (text, required)
  Specifications:
    - Screen Size (number, inches)
    - RAM (select: 4GB, 8GB, 16GB)
    - Storage (select: 128GB, 256GB, 512GB, 1TB)
  Pricing:
    - MRP (number, required)
    - Discount % (number, 0-100)
```

#### Using Templates

When creating products:
1. Select template
2. Fill in required custom fields
3. Template structure ensures consistent data
4. Allows powerful filtering and search

### Categories

**Navigation:** Dashboard → Categories

**Creating Categories:**
- Category Name
- Icon (material icon)
- Description
- Associated Verification App

**Organizing Products:**
- Products belong to one category
- Categories are app-specific
- Can filter products by category

### Products

**Navigation:** Dashboard → Products → Create Product

**Required Fields:**
- Product Name
- SKU (Stock Keeping Unit)
- Category
- Verification App
- Template (optional)

**Pricing:**
- Price (decimal)
- Currency (default: INR)

**Custom Fields:**
- Filled based on selected template
- JSONB storage allows flexible schema

**Variants:**
- Size (e.g., Small, Medium, Large)
- Color
- Weight
- Custom variant types

**Additional:**
- Image URL
- Description
- Tags (for search/filter)
- Active/Inactive status

**Example:**
```
Product: iPhone 15 Pro
SKU: IPH15PRO-256-BLK
Category: Smartphones
Template: Electronics Product
Custom Fields:
  - Brand: Apple
  - Model: iPhone 15 Pro
  - Screen Size: 6.1
  - RAM: 8GB
  - Storage: 256GB
  - MRP: 129900
Price: 129900
Variants:
  - Color: Black, White, Blue
  - Storage: 128GB, 256GB, 512GB, 1TB
```

---

## Coupon Management

### Single Coupon Creation

**Navigation:** Dashboard → Coupons → Create Coupon

**Basic Info:**
- Coupon Code (auto-generated or custom)
- Verification App
- Associated Product

**Discount Configuration:**
- **Type**:
  - Percentage (e.g., 20% off)
  - Fixed Amount (e.g., ₹100 off)
  - Buy X Get Y (e.g., Buy 2 Get 1)
- **Value**: Discount amount/percentage
- **Currency**: INR, USD, etc.

**Usage Limits:**
- Total Usage Limit (max redemptions)
- Per User Limit (max per customer)
- Expiry Date

**Advanced:**
- Min Purchase Amount (threshold for discount)
- Terms & Conditions
- QR Code (auto-generated)

**Credit Cost:**
- Each coupon costs credits
- Deducted from tenant balance
- Cannot create if insufficient credits

### Batch Coupon Creation

**Navigation:** Dashboard → Batches → Create Batch

**Use Cases:**
- Dealer distribution
- Zone-based campaigns
- Serial number tracking
- Bulk QR generation

**Configuration:**
- Batch Name
- Dealer Name
- Zone/Region
- Total Coupons (e.g., 1000)
- Serial Number Range (optional)

**Coupon Settings:**
- Shared across all batch coupons
- Same discount type and value
- Same expiry date
- Same product association

**Process:**
1. Configure batch details
2. Set coupon parameters
3. Click "Generate Batch"
4. System creates all coupons
5. Debits total credits (coupon count × credit cost)

**Batch Status:**
- Draft: Created but codes not assigned
- Code Assigned: Codes generated
- Activated: Ready for scanning
- Completed: All coupons used

### Activating Batches

**Batch Activation:**
- Changes status to "Activated"
- Generates QR codes for all coupons
- Makes coupons scannable
- Records activation timestamp

**Process:**
1. Navigate to batch details
2. Click "Activate Batch"
3. Add activation note (optional)
4. Confirm activation
5. Download QR codes (ZIP file)

### Managing Coupons

**List View:**
- Search by coupon code
- Filter by status (Active/Used/Expired)
- Filter by verification app
- Filter by product
- Date range filter

**Coupon Actions:**
- View details
- Edit (if not used)
- Deactivate
- Extend expiry
- Delete (if not used)

**Coupon Status:**
- Active: Ready to scan
- Scanned: Used by customer
- Expired: Past expiry date
- Inactive: Manually deactivated

---

## Scan History

### Viewing Scans

**Navigation:** Dashboard → Scan History

**Information Displayed:**
- Scan timestamp
- Customer details (name, email, phone)
- Coupon code
- Product scanned
- Scan status (Success/Failed)
- Location (if captured)
- Device info

**Filters:**
- Date range
- Scan status
- Verification app
- Product
- Customer

**Export:**
- Download as Excel
- Filtered results only
- All scan details included

### Scan Status Types

- **Success**: Valid coupon, points awarded
- **Expired**: Coupon past expiry date
- **Exhausted**: Usage limit reached
- **Invalid**: Coupon not found
- **Inactive**: Coupon/app deactivated

---

## Credit Management

### Viewing Credit Balance

**Navigation:** Dashboard → Credits

**Information:**
- Current Balance
- Total Received
- Total Spent
- Recent Transactions

### Requesting Credits

**Process:**
1. Click "Request Credits"
2. Enter amount needed
3. Provide justification
4. Submit request
5. Wait for super admin approval

**Justification Examples:**
- "Launching new campaign for 5000 customers"
- "Expanding to 3 new zones, need 10000 coupons"
- "Seasonal promotion for festival sales"

### Credit Transactions

**Transaction Types:**
- **Credit**: Approved requests
- **Debit**: Coupon creation
- **Adjustment**: Manual corrections

**Transaction History:**
- Date and time
- Type (Credit/Debit)
- Amount
- Balance after
- Description
- Reference (request ID, coupon batch)

---

## User Management

### Creating Tenant Users

**Navigation:** Dashboard → Users → Add User

**User Types:**
- **Tenant Admin**: Full access to all features
- **Tenant User**: Limited permissions (view-only or custom)

**Required:**
- Email (unique)
- Full Name
- Phone (optional)
- Role (TENANT_ADMIN or TENANT_USER)

**Permissions (for TENANT_USER):**
- View apps
- Create/Edit/Delete apps
- View products
- Create/Edit/Delete products
- View coupons
- Create/Edit/Delete coupons
- View scans
- View credits
- Request credits
- Manage users
- Assign permissions

**Process:**
1. Fill in user details
2. Select role
3. Assign permissions (if TENANT_USER)
4. Click "Create User"
5. User receives welcome email with OTP

### Managing Users

**Actions:**
- Edit user profile
- Change permissions
- Deactivate/activate account
- Delete user
- View login history
- Reset password (send OTP)

---

## Settings

### Profile Settings

**Editable:**
- Full Name
- Phone Number

**View Only:**
- Email
- Role
- Tenant

### Tenant Settings

**Editable (Tenant Admin only):**
- Company Name
- Contact Phone
- Address

**View Only:**
- Subdomain
- Tenant ID
- Created Date

### App Selector

**Multi-App Management:**
- Switch between "All Apps" and individual apps
- Filter dashboard data by app
- App-specific product and category lists

---

## Best Practices

### Product Organization
- Create templates before products
- Use consistent SKU format
- Tag products for easy search
- Keep categories focused

### Coupon Strategy
- Set realistic expiry dates
- Use batches for distribution
- Track serial numbers for inventory
- Monitor usage patterns

### Credit Planning
- Request credits in advance
- Plan campaigns around credit availability
- Monitor credit burn rate
- Request with detailed justification

### User Access
- Grant minimum necessary permissions
- Regular permission audits
- Deactivate inactive users
- Use TENANT_USER for limited access

---

## Common Workflows

### Launching a Campaign

1. Create verification app (if new)
2. Create product catalog
3. Request credits
4. Wait for approval
5. Create coupon batch
6. Activate batch
7. Distribute QR codes
8. Monitor scan activity

### Setting Up New App

1. Create verification app
2. Configure branding
3. Save API key
4. Create categories
5. Create product templates
6. Add products
7. Test with sample coupons

### Monthly Review

1. Check scan success rate
2. Review credit usage
3. Analyze popular products
4. Deactivate expired coupons
5. Clean up inactive users
6. Request credits for next month

---

**For technical details, see:**
- [API_REFERENCE.md](API_REFERENCE.md)
- [MOBILE_API.md](MOBILE_API.md)
- [COMPONENTS_GUIDE.md](COMPONENTS_GUIDE.md)
EOF

echo "✅ Created TENANT_ADMIN_FEATURES.md"

# Create DATABASE_DESIGN.md with ERD diagrams
cat > "$DOCS_DIR/DATABASE_DESIGN.md" << 'EOF'
# Database Design Documentation

Complete database schema documentation for the MScan platform with Entity Relationship Diagrams.

## Table of Contents
- [Overview](#overview)
- [ERD Diagrams](#erd-diagrams)
- [Core Tables](#core-tables)
- [Coupon System](#coupon-system)
- [Product Catalog](#product-catalog)
- [Credit Management](#credit-management)
- [Mobile & Scanning](#mobile--scanning)
- [Indexes](#indexes)
- [Triggers & Functions](#triggers--functions)

---

## Overview

The MScan database is built on **PostgreSQL 16.x** and uses:
- **UUID** primary keys for most tables
- **JSONB** columns for flexible schema (templates, variants)
- **Triggers** for auto-updating timestamps and status validation
- **Constraints** for data integrity
- **Indexes** for query performance

**Total Tables:** 30+
**Key Features:**
- Multi-tenant data isolation
- Coupon lifecycle management
- JSONB-based product templates
- Points/credits ledger system
- Comprehensive audit logging

---

## ERD Diagrams

### Core System Architecture

```mermaid
erDiagram
    tenants ||--o{ users : has
    tenants ||--o{ verification_apps : owns
    tenants ||--o{ products : owns
    tenants ||--o{ coupons : creates
    tenants ||--|| tenant_credit_balance : has

    users ||--o{ credit_requests : submits
    users ||--o{ audit_logs : generates
    users }o--|| tenants : "belongs to (except SUPER_ADMIN)"

    tenants {
        uuid id PK
        varchar tenant_name
        varchar email UK
        varchar subdomain_slug UK
        boolean is_active
        timestamp created_at
    }

    users {
        uuid id PK
        uuid tenant_id FK
        varchar email UK
        varchar role
        boolean is_active
        timestamp created_at
    }

    verification_apps {
        uuid id PK
        uuid tenant_id FK
        varchar app_name
        varchar code
        varchar api_key
        text logo_url
        boolean is_active
    }
```

### Coupon & Batch System

```mermaid
erDiagram
    coupons }o--|| verification_apps : "scanned via"
    coupons }o--|| products : "linked to"
    coupons }o--|| coupon_batches : "part of"
    coupons }o--|| reward_campaigns : "belongs to"
    coupons ||--o{ scans : "generates"

    coupon_batches }o--|| verification_apps : "for app"
    coupon_batches ||--|| reward_campaigns : has

    coupons {
        uuid id PK
        uuid tenant_id FK
        uuid verification_app_id FK
        varchar coupon_code UK
        varchar status
        decimal discount_value
        integer coupon_points
        timestamp expiry_date
        integer current_usage_count
    }

    coupon_batches {
        uuid id PK
        uuid tenant_id FK
        varchar batch_name
        integer total_coupons
        varchar batch_status
        varchar dealer_name
        varchar zone
        timestamp activated_at
    }

    reward_campaigns {
        uuid id PK
        uuid tenant_id FK
        uuid batch_id FK
        varchar name
        varchar reward_type
        decimal common_amount
        jsonb custom_variations
        timestamp start_date
        timestamp end_date
    }
```

### Product Catalog System

```mermaid
erDiagram
    products }o--|| categories : "belongs to"
    products }o--|| product_templates : "uses template"
    products }o--|| verification_apps : "available in"
    products }o--|| tenants : "owned by"

    product_templates }o--|| tenants : "created by"
    categories }o--|| verification_apps : "scoped to"

    products {
        serial id PK
        uuid tenant_id FK
        uuid verification_app_id FK
        integer category_id FK
        varchar product_name
        varchar product_sku UK_per_tenant
        decimal price
        text image_url
        jsonb custom_fields
        boolean is_active
    }

    product_templates {
        uuid id PK
        uuid tenant_id FK
        varchar template_name
        text description
        jsonb variant_config
        jsonb custom_fields
        boolean is_active
    }

    categories {
        serial id PK
        uuid tenant_id FK
        uuid verification_app_id FK
        varchar name
        varchar icon
        boolean is_active
    }
```

### Credit Management

```mermaid
erDiagram
    tenants ||--|| tenant_credit_balance : has
    tenants ||--o{ credit_requests : submits
    tenants ||--o{ credit_transactions : records

    credit_requests }o--|| users : "processed by"

    tenant_credit_balance {
        uuid tenant_id PK_FK
        integer balance
        integer total_received
        integer total_spent
        timestamp last_updated
    }

    credit_requests {
        uuid id PK
        uuid tenant_id FK
        integer requested_amount
        varchar status
        text justification
        uuid processed_by FK
        timestamp requested_at
    }

    credit_transactions {
        uuid id PK
        uuid tenant_id FK
        varchar transaction_type
        integer amount
        integer balance_before
        integer balance_after
        varchar reference_type
        timestamp created_at
    }
```

### Mobile Scanning & Customer System

```mermaid
erDiagram
    customers }o--|| tenants : "registered with"
    customers ||--o{ customer_devices : "uses"
    customers ||--o{ scans : "performs"
    customers ||--o{ user_points : "earns"

    scan_sessions ||--o{ scan_events : "logs"
    scan_sessions }o--|| coupons : "verifies"

    scans }o--|| coupons : "scans"
    scans }o--|| customers : "by customer"

    customers {
        uuid id PK
        uuid tenant_id FK
        varchar phone_e164 UK_per_tenant
        varchar email UK_per_tenant
        varchar full_name
        boolean phone_verified
        timestamp created_at
    }

    scan_sessions {
        uuid id PK
        uuid tenant_id FK
        varchar coupon_code
        varchar mobile_e164
        varchar otp_code
        varchar status
        timestamp created_at
    }

    scans {
        uuid id PK
        uuid coupon_id FK
        uuid customer_id FK
        varchar scan_status
        timestamp scan_timestamp
        decimal location_lat
        decimal location_lng
    }

    user_points {
        uuid tenant_id PK_FK
        varchar mobile_e164 PK
        integer balance
        timestamp updated_at
    }
```

---

## Core Tables

### tenants

Primary table for multi-tenant isolation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique tenant identifier |
| tenant_name | VARCHAR(255) | NOT NULL | Company/business name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Contact email |
| phone | VARCHAR(50) | | Contact phone |
| address | TEXT | | Business address |
| subdomain_slug | VARCHAR(100) | UNIQUE, NOT NULL | URL subdomain (e.g., 'acme') |
| is_active | BOOLEAN | DEFAULT true | Active status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Constraints:**
- `check_subdomain_slug_format`: Must match `^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$`
- `tenants_status_check`: Status IN ('active', 'inactive')

**Indexes:**
- `idx_tenants_email` ON (email)
- `idx_tenants_subdomain_slug` ON (subdomain_slug)
- `idx_tenants_status` ON (status)

### users

All platform users (Super Admins, Tenant Admins, Tenant Users).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | User ID |
| tenant_id | UUID | FK → tenants(id) | Associated tenant (NULL for SUPER_ADMIN) |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| full_name | VARCHAR(255) | NOT NULL | Display name |
| phone | VARCHAR(50) | | Contact phone |
| role | VARCHAR(50) | NOT NULL | SUPER_ADMIN, TENANT_ADMIN, TENANT_USER |
| is_active | BOOLEAN | DEFAULT true | Account status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Constraints:**
- `check_super_admin_no_tenant`: Super admins have NULL tenant_id
- Role CHECK: IN ('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')

**Indexes:**
- `idx_users_email` ON (email)
- `idx_users_tenant_id` ON (tenant_id)
- `idx_users_role` ON (role)

### verification_apps

Branded verification applications for QR scanning.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | App ID |
| tenant_id | UUID | FK → tenants(id) | Owner tenant |
| app_name | VARCHAR(255) | NOT NULL | Display name |
| code | VARCHAR(100) | | URL-safe code |
| api_key | VARCHAR(255) | | External API key (64-char hex) |
| logo_url | TEXT | | Brand logo |
| primary_color | VARCHAR(7) | | Hex color code |
| secondary_color | VARCHAR(7) | | Accent color |
| welcome_message | TEXT | | User greeting |
| scan_success_message | TEXT | | Success message |
| scan_failure_message | TEXT | | Failure message |
| is_active | BOOLEAN | DEFAULT true | Status |

---

## Coupon System

### coupons

Individual coupon codes with lifecycle management.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Coupon ID |
| tenant_id | UUID | FK → tenants(id) | Owner |
| verification_app_id | UUID | FK → verification_apps(id) | Associated app |
| coupon_code | VARCHAR(50) | UNIQUE, NOT NULL | Scannable code |
| status | VARCHAR(20) | CHECK constraint | draft/printed/active/used/expired/exhausted/inactive |
| discount_type | VARCHAR(20) | CHECK | PERCENTAGE/FIXED_AMOUNT/BUY_X_GET_Y |
| discount_value | DECIMAL(10,2) | > 0 | Discount amount |
| coupon_points | INTEGER | | Points awarded on scan |
| expiry_date | TIMESTAMPTZ | NOT NULL | Expiration date |
| total_usage_limit | INTEGER | DEFAULT 1 | Max total uses |
| per_user_usage_limit | INTEGER | DEFAULT 1 | Max per customer |
| current_usage_count | INTEGER | DEFAULT 0 | Current scan count |
| serial_number | INTEGER | | Optional serial tracking |
| batch_id | UUID | | Batch grouping |
| product_id | INTEGER | FK → products(id) | Linked product |
| campaign_id | UUID | FK → reward_campaigns(id) | Campaign |
| credit_cost | INTEGER | > 0 | Credits consumed |
| printed_at | TIMESTAMPTZ | | Print timestamp |
| activated_at | TIMESTAMPTZ | | Activation timestamp |

**Triggers:**
- `trigger_validate_coupon_status_transition`: Enforces valid status transitions
- `trigger_update_coupon_status`: Auto-expires/exhausts based on date and usage

**Status Lifecycle:**
```
draft → printed → active → used/expired/exhausted
         ↓         ↓
       inactive  inactive
```

### coupon_batches

Grouping for bulk coupon generation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Batch ID |
| tenant_id | UUID | FK → tenants(id) | Owner |
| verification_app_id | UUID | FK → verification_apps(id) | Target app |
| batch_name | VARCHAR(255) | NOT NULL | Display name |
| dealer_name | VARCHAR(255) | | Distribution dealer |
| zone | VARCHAR(100) | | Geographic zone |
| total_coupons | INTEGER | > 0 | Coupon count |
| serial_number_start | INTEGER | | Starting serial |
| serial_number_end | INTEGER | | Ending serial |
| batch_status | ENUM | | draft/code_assigned/activated/live/completed |
| activated_at | TIMESTAMP | | Activation time |
| activation_note | TEXT | | Activation reason |

---

## Product Catalog

### product_templates

JSONB-based flexible product schemas.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Template ID |
| tenant_id | UUID | FK → tenants(id) | Owner |
| template_name | VARCHAR(255) | NOT NULL | Display name |
| description | TEXT | | Template purpose |
| variant_config | JSONB | | Variant options (size, color, etc.) |
| custom_fields | JSONB | | Attribute definitions with validation |
| is_active | BOOLEAN | DEFAULT true | Status |
| is_system_template | BOOLEAN | DEFAULT false | System-provided flag |

**custom_fields JSONB Structure:**
```json
[
  {
    "attribute_name": "Brand",
    "attribute_key": "brand",
    "data_type": "string",
    "is_required": true,
    "validation_rules": {
      "min_length": 2,
      "max_length": 50
    },
    "display_order": 0,
    "field_group": "Basic Info"
  }
]
```

### products

Product catalog with JSONB custom fields.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Product ID |
| tenant_id | UUID | FK → tenants(id) | Owner |
| verification_app_id | UUID | FK → verification_apps(id) | App association |
| product_name | VARCHAR(255) | NOT NULL | Display name |
| product_sku | VARCHAR(100) | UNIQUE per tenant | SKU identifier |
| category_id | INTEGER | FK → categories(id) | Category |
| template_id | UUID | FK → product_templates(id) | Template used |
| price | DECIMAL(10,2) | | Product price |
| currency | VARCHAR(3) | DEFAULT 'INR' | Currency code |
| image_url | TEXT | | Product image |
| custom_fields | JSONB | | Template-based fields |
| is_active | BOOLEAN | DEFAULT true | Status |

### categories

Product categorization (app-scoped).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Category ID |
| tenant_id | UUID | FK → tenants(id) | Owner |
| verification_app_id | UUID | FK → verification_apps(id) | App scope |
| name | VARCHAR(100) | NOT NULL | Category name |
| icon | VARCHAR(50) | | Material icon |
| description | TEXT | | Category description |
| is_active | BOOLEAN | DEFAULT true | Status |

**Unique Constraint:**
- (tenant_id, verification_app_id, name) = UNIQUE

---

## Credit Management

### tenant_credit_balance

Current credit balance per tenant.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| tenant_id | UUID | PK, FK → tenants(id) | Tenant |
| balance | INTEGER | >= 0, DEFAULT 0 | Available credits |
| total_received | INTEGER | >= 0 | Lifetime received |
| total_spent | INTEGER | >= 0 | Lifetime spent |
| last_updated | TIMESTAMPTZ | DEFAULT NOW() | Last change |

### credit_requests

Tenant credit top-up requests.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Request ID |
| tenant_id | UUID | FK → tenants(id) | Requesting tenant |
| requested_amount | INTEGER | > 0 | Credit amount |
| justification | TEXT | | Business reason |
| status | VARCHAR(20) | CHECK | pending/approved/rejected |
| requested_at | TIMESTAMPTZ | DEFAULT NOW() | Request time |
| processed_at | TIMESTAMPTZ | | Processing time |
| processed_by | UUID | FK → users(id) | Approving admin |
| rejection_reason | TEXT | | Reason if rejected |

**Constraint:**
- `chk_rejection_reason`: Rejection reason required if status='rejected'

### credit_transactions

Audit trail for all credit movements.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Transaction ID |
| tenant_id | UUID | FK → tenants(id) | Tenant |
| transaction_type | VARCHAR(20) | CHECK | CREDIT/DEBIT |
| amount | INTEGER | > 0 | Credit amount |
| balance_before | INTEGER | NOT NULL | Pre-transaction balance |
| balance_after | INTEGER | NOT NULL | Post-transaction balance |
| reference_type | VARCHAR(50) | CHECK | CREDIT_APPROVAL/COUPON_CREATION/COUPON_EDIT |
| reference_id | UUID | | Related entity ID |
| description | TEXT | | Transaction description |
| created_by | UUID | FK → users(id) | User who triggered |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Transaction time |

---

## Mobile & Scanning

### customers

End-user customers who scan coupons.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Customer ID |
| tenant_id | UUID | FK → tenants(id) | Tenant scope |
| phone_e164 | VARCHAR(20) | UNIQUE per tenant | International phone |
| email | VARCHAR(255) | UNIQUE per tenant | Email address |
| full_name | VARCHAR(120) | | Customer name |
| phone_verified | BOOLEAN | DEFAULT false | Phone verification status |
| email_verified | BOOLEAN | DEFAULT false | Email verification status |

**Constraint:**
- `chk_phone_or_email`: At least one of phone_e164 or email must be NOT NULL

### scan_sessions

OTP-based scan verification sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Session ID |
| tenant_id | UUID | FK → tenants(id) | Tenant |
| coupon_code | VARCHAR(50) | NOT NULL | Coupon being verified |
| device_id | TEXT | | Device fingerprint |
| mobile_e164 | VARCHAR(20) | | Customer phone |
| otp_code | VARCHAR(6) | | Verification OTP |
| attempts | INTEGER | DEFAULT 0 | Failed OTP attempts |
| status | VARCHAR(32) | CHECK | pending-verification/otp-sent/completed/verification-failed |

### scans

Completed scan records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Scan ID |
| coupon_id | UUID | FK → coupons(id) | Scanned coupon |
| tenant_id | UUID | FK → tenants(id) | Tenant |
| customer_id | UUID | FK → customers(id) | Customer |
| scan_status | VARCHAR(20) | CHECK | SUCCESS/EXPIRED/EXHAUSTED/INVALID/INACTIVE |
| scan_timestamp | TIMESTAMPTZ | DEFAULT NOW() | Scan time |
| location_lat | DECIMAL(10,8) | | GPS latitude |
| location_lng | DECIMAL(11,8) | | GPS longitude |
| device_info | TEXT | | Device details |
| ip_address | INET | | Client IP |

### user_points

Points ledger for customers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| tenant_id | UUID | PK, FK → tenants(id) | Tenant scope |
| mobile_e164 | VARCHAR(20) | PK | Customer phone |
| balance | INTEGER | DEFAULT 0 | Current points |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Composite Primary Key:** (tenant_id, mobile_e164)

### points_transactions

Points movement history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Transaction ID |
| tenant_id | UUID | FK → tenants(id) | Tenant |
| mobile_e164 | VARCHAR(20) | NOT NULL | Customer |
| amount | INTEGER | NOT NULL | Points (+/-) |
| reason | TEXT | NOT NULL | Description |
| session_id | UUID | | Related scan session |
| coupon_code | VARCHAR(50) | | Related coupon |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Transaction time |

---

## Indexes

### Performance Indexes

**tenant_id indexes** (data isolation):
- All multi-tenant tables have `idx_{table}_tenant ON (tenant_id)`

**Scan performance:**
- `idx_scans_coupon` ON scans(coupon_id)
- `idx_scans_timestamp` ON scans(scan_timestamp)
- `idx_scans_status` ON scans(scan_status)
- `idx_scans_customer` ON scans(customer_identifier)

**Coupon lookups:**
- `idx_coupons_code` ON coupons(coupon_code) - UNIQUE
- `idx_coupons_status` ON coupons(status)
- `idx_coupons_expiry` ON coupons(expiry_date)
- `idx_coupons_app` ON coupons(verification_app_id)

**Credit operations:**
- `idx_credit_trans_tenant` ON credit_transactions(tenant_id)
- `idx_credit_trans_created_at` ON credit_transactions(created_at)

**Full list:** 80+ indexes for query optimization

---

## Triggers & Functions

### Auto-Update Timestamps

**Function:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

**Applied to:**
- tenants, users, products, categories, coupons, coupon_batches, verification_apps
- All tables with `updated_at` column

### Coupon Status Validation

**Function:** `validate_coupon_status_transition()`
- Enforces valid status transitions (draft → printed → active → used/expired)
- Auto-sets printed_at and activated_at timestamps
- Prevents invalid state changes

**Function:** `update_coupon_status()`
- Auto-expires coupons past expiry_date
- Auto-exhausts coupons at usage limit
- Called on every coupon UPDATE

### Credit Balance Enforcement

All credit operations use transactions to ensure:
- Balance never goes negative
- Total received/spent always match sum of transactions
- Atomic credit movements

---

## Data Types

**Custom ENUM:**
- `batch_status`: draft, code_assigned, activated, live, completed

**JSONB Usage:**
- `product_templates.custom_fields`: Field definitions
- `product_templates.variant_config`: Variant options
- `products.custom_fields`: Template values
- `reward_campaigns.custom_variations`: Dynamic rewards

**Constraints:**
- CHECK constraints for status enums
- Foreign key cascades for tenant deletion
- Unique constraints for business rules

---

**For API access to this data, see:**
- [API_REFERENCE.md](API_REFERENCE.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
EOF

echo "✅ Created DATABASE_DESIGN.md"

# Create API_REFERENCE.md
cat > "$DOCS_DIR/API_REFERENCE.md" << 'EOF'
# API Reference

Complete REST API documentation for MScan platform.

## Base URLs

```
Development: http://localhost:3000/api
Production: https://api.mscan.com/api
Tenant Subdomain: https://{tenant-slug}.mscan.com/api
```

## Authentication

All authenticated endpoints require Bearer token:

```
Authorization: Bearer {accessToken}
```

**Token Lifecycle:**
- Access Token: 30 minutes
- Refresh Token: 7 days

---

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/request-otp` | Request OTP for email | Public |
| POST | `/auth/verify-otp` | Verify OTP and login | Public |
| POST | `/auth/refresh` | Refresh access token | Public |
| POST | `/auth/logout` | Logout and blacklist tokens | Required |
| GET | `/auth/context` | Get current user context | Required |

### Users (`/api/users`)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/users/profile` | Get user profile | Required | All |
| PUT | `/users/profile` | Update profile | Required | All |
| POST | `/users/customers` | Create tenant | Required | SUPER_ADMIN |
| GET | `/users/customers` | List all tenants | Required | SUPER_ADMIN |

### Tenants (`/api/tenants`)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/tenants` | List tenants | Required | SUPER_ADMIN |
| POST | `/tenants` | Create tenant | Required | SUPER_ADMIN |
| GET | `/tenants/:id` | Get tenant details | Required | SUPER_ADMIN |
| PUT | `/tenants/:id` | Update tenant | Required | SUPER_ADMIN |
| DELETE | `/tenants/:id` | Delete tenant | Required | SUPER_ADMIN |
| GET | `/tenants/check-slug/:slug` | Check subdomain availability | Required | All |
| GET | `/tenants/suggest-slugs` | Get slug suggestions | Required | All |
| GET | `/tenants/by-subdomain/:slug` | Get tenant by subdomain | Required | All |

### Tenant Users (`/api/v1/tenants`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/v1/tenants/:tenantId/users` | List tenant users | view_tenant_users |
| POST | `/v1/tenants/:tenantId/users` | Create tenant user | create_tenant_user |
| GET | `/v1/tenants/:tenantId/users/:userId` | Get user details | view_tenant_users |
| PUT | `/v1/tenants/:tenantId/users/:userId` | Update user | edit_tenant_user |
| DELETE | `/v1/tenants/:tenantId/users/:userId` | Delete user | delete_tenant_user |
| PUT | `/v1/tenants/:tenantId/users/:userId/permissions` | Update permissions | assign_permissions |

### Permissions (`/api/v1/permissions`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/v1/permissions` | List all permissions | view_permissions |
| GET | `/v1/permissions/user/:userId` | Get user permissions | view_permissions |

### Verification Apps (`/api/rewards/verification-apps`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/rewards/verification-apps` | List apps | view_apps |
| POST | `/rewards/verification-apps` | Create app | create_app |
| GET | `/rewards/verification-apps/:id` | Get app details | view_apps |
| PUT | `/rewards/verification-apps/:id` | Update app | edit_app |
| DELETE | `/rewards/verification-apps/:id` | Delete app | delete_app |
| POST | `/rewards/verification-apps/:id/regenerate-api-key` | Regenerate API key | edit_app |
| PATCH | `/rewards/verification-apps/:id/toggle-status` | Toggle active status | edit_app |

### Categories (`/api/categories`)

| Method | Endpoint | Description | Permission | Query Params |
|--------|----------|-------------|------------|--------------|
| GET | `/categories` | List categories | view_categories | ?app_id=uuid or ?app_id=all |
| POST | `/categories` | Create category | create_category | |
| GET | `/categories/:id` | Get category | view_categories | |
| PUT | `/categories/:id` | Update category | edit_category | |
| DELETE | `/categories/:id` | Delete category | delete_category | |

### Product Templates (`/api/templates`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/templates` | List templates | view_products |
| POST | `/templates` | Create template | create_product |
| GET | `/templates/:id` | Get template | view_products |
| PUT | `/templates/:id` | Update template | edit_product |
| DELETE | `/templates/:id` | Delete template | delete_product |
| POST | `/templates/:id/duplicate` | Duplicate template | create_product |

### Products (`/api/products`)

| Method | Endpoint | Description | Permission | Query Params |
|--------|----------|-------------|------------|--------------|
| GET | `/products` | List products | view_products | ?app_id=uuid or ?app_id=all |
| POST | `/products` | Create product | create_product | |
| GET | `/products/:id` | Get product | view_products | |
| PUT | `/products/:id` | Update product | edit_product | |
| DELETE | `/products/:id` | Delete product | delete_product | |

### Coupons (`/api/rewards`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/rewards/coupons` | List coupons | view_coupons |
| POST | `/rewards/coupons` | Create coupon | create_coupon |
| GET | `/rewards/coupons/:id` | Get coupon | view_coupons |
| PUT | `/rewards/coupons/:id` | Update coupon | edit_coupon |
| DELETE | `/rewards/coupons/:id` | Delete coupon | delete_coupon |
| POST | `/rewards/coupons/:id/activate` | Activate coupon | edit_coupon |
| POST | `/rewards/coupons/:id/deactivate` | Deactivate coupon | edit_coupon |

### Coupon Batches (`/api/tenant/batches`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/tenant/batches` | List batches | view_batches |
| POST | `/tenant/batches` | Create batch | create_batch |
| GET | `/tenant/batches/:id` | Get batch | view_batches |
| PUT | `/tenant/batches/:id` | Update batch | edit_batch |
| POST | `/tenant/batches/:id/activate` | Activate batch | edit_batch |
| DELETE | `/tenant/batches/:id` | Delete batch | delete_batch |

### Scans (`/api/rewards`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/rewards/scans` | List scans | view_scans |
| GET | `/rewards/scans/:id` | Get scan details | view_scans |

### Credit Management (`/api/credits`)

| Method | Endpoint | Description | Permission | Role |
|--------|----------|-------------|------------|------|
| GET | `/credits/balance` | Get tenant balance | view_credit_balance | TENANT_ADMIN |
| GET | `/credits/transactions` | Get transactions | view_credit_transactions | TENANT_ADMIN |
| POST | `/credits/requests` | Request credits | request_credits | TENANT_ADMIN |
| GET | `/credits/requests` | List all requests | N/A | SUPER_ADMIN |
| PUT | `/credits/requests/:id/approve` | Approve request | N/A | SUPER_ADMIN |
| PUT | `/credits/requests/:id/reject` | Reject request | N/A | SUPER_ADMIN |

### User Credits (`/api/user-credits`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/user-credits/:userId` | Get user balance | view_credit_balance |
| GET | `/user-credits/:userId/transactions` | Get transactions | view_credit_transactions |
| POST | `/user-credits/:userId/add` | Add credits (admin) | manage_credits |
| POST | `/user-credits/:userId/deduct` | Deduct credits (admin) | manage_credits |
| POST | `/user-credits/:userId/adjust` | Adjust credits (admin) | manage_credits |
| GET | `/user-credits/:userId/stats` | Get credit stats | view_credit_balance |

### Mobile Scan API (`/api/mobile/v1`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/mobile/v1/auth/register` | Register mobile user | Public |
| POST | `/mobile/v1/auth/login` | Login with phone/OTP | Public |
| POST | `/mobile/v1/scan` | Scan coupon | Required |

### Public Scan API (`/api/public/scan`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/public/scan/start` | Start scan session | Public |
| POST | `/public/scan/:sessionId/mobile` | Submit mobile number | Public |
| POST | `/public/scan/:sessionId/verify-otp` | Verify OTP and complete | Public |

### External App API (`/api/app`)

**Authentication:** API Key via Bearer token

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/app/:appCode/categories` | Get app categories |
| GET | `/app/:appCode/products` | Get app products |
| GET | `/app/:appCode/users/:userId/credits` | Get user balance |
| GET | `/app/:appCode/users/:userId/credit-transactions` | Transaction history |
| POST | `/app/:appCode/scans` | Scan coupon |
| POST | `/app/:appCode/redeem` | Redeem points |

### Dashboard (`/api/dashboard`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/dashboard/stats` | Get dashboard statistics | Required |

---

## Request/Response Examples

### Authentication Flow

**1. Request OTP**
```bash
POST /api/auth/request-otp
Content-Type: application/json

{
  "email": "admin@mscan.com"
}

# Response
{
  "success": true,
  "message": "OTP sent to your email",
  "expiresIn": 5
}
```

**2. Verify OTP**
```bash
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "admin@mscan.com",
  "otp": "123456"
}

# Response
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "userType": "TENANT_ADMIN",
    "subdomain": "acme"
  }
}
```

**3. Get User Context**
```bash
GET /api/auth/context
Authorization: Bearer {accessToken}

# Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@acme.com",
    "role": "TENANT_ADMIN",
    "permissions": ["create_app", "edit_app", ...],
    "tenant": {
      "id": "uuid",
      "name": "Acme Corp",
      "subdomain": "acme"
    }
  }
}
```

### Creating a Coupon

```bash
POST /api/rewards/coupons
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "verification_app_id": "uuid",
  "product_id": 1,
  "discount_type": "PERCENTAGE",
  "discount_value": 20,
  "expiry_date": "2026-12-31T23:59:59Z",
  "total_usage_limit": 1,
  "credit_cost": 1
}

# Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "coupon_code": "ABC123XYZ",
    "qr_code_url": "https://...",
    "status": "active"
  }
}
```

### Creating a Batch

```bash
POST /api/tenant/batches
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "batch_name": "New Year Campaign",
  "verification_app_id": "uuid",
  "dealer_name": "Mumbai Dealer",
  "zone": "West",
  "total_coupons": 1000,
  "coupon_config": {
    "discount_type": "FIXED_AMOUNT",
    "discount_value": 100,
    "expiry_date": "2026-12-31T23:59:59Z"
  }
}

# Response
{
  "success": true,
  "data": {
    "batch_id": "uuid",
    "status": "draft",
    "total_coupons": 1000
  }
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource (email, SKU, etc.) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |

### Permission Errors

```json
{
  "success": false,
  "message": "Insufficient permissions",
  "code": "PERMISSION_DENIED",
  "details": {
    "required": ["create_coupon"],
    "mode": "any"
  }
}
```

---

## Pagination

Paginated endpoints return:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3,
    "hasMore": true
  }
}
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)

---

## Rate Limiting

**OTP Requests:**
- 3 requests per 15 minutes per email
- 429 status with retry_after timestamp

**Public Scan API:**
- 60 requests per 10 minutes per (coupon_code, device_id, IP)
- 10 mobile submissions per 24 hours per phone number

---

## Webhooks (Future)

Coming soon: Webhook support for real-time notifications.

---

**For detailed usage guides, see:**
- [SUPER_ADMIN_FEATURES.md](SUPER_ADMIN_FEATURES.md)
- [TENANT_ADMIN_FEATURES.md](TENANT_ADMIN_FEATURES.md)
- [DATABASE_DESIGN.md](DATABASE_DESIGN.md)
EOF

echo "✅ Created API_REFERENCE.md"

# Create COMPONENTS_GUIDE.md
cat > "$DOCS_DIR/COMPONENTS_GUIDE.md" << 'EOF'
# Components Guide

Complete catalog of Angular components in the MScan platform.

## Table of Contents
- [Overview](#overview)
- [Authentication Components](#authentication-components)
- [Dashboard Components](#dashboard-components)
- [Tenant Management](#tenant-management)
- [Verification Apps](#verification-apps)
- [Product Catalog](#product-catalog)
- [Coupon Management](#coupon-management)
- [Credit Management](#credit-management)
- [User Management](#user-management)
- [Shared Components](#shared-components)

---

## Overview

**Total Components:** 40+
**Architecture:** Angular 19 Standalone Components
**State Management:** NgRx 18 with Facade pattern
**Styling:** Tailwind CSS 3.x
**Forms:** Reactive Forms with Validation

---

## Authentication Components

### LoginComponent
**Path:** `src/app/components/login/login.component.ts`

**Purpose:** OTP-based email authentication

**Features:**
- Email input with validation
- OTP request with rate limiting
- OTP verification
- Subdomain-based redirect

**Usage:**
```typescript
Route: /login
Public access
```

**State Management:**
- Uses AuthContextFacade for login actions
- Handles token storage
- Manages subdomain redirect

---

## Dashboard Components

### DashboardComponent
**Path:** `src/app/components/dashboard/dashboard.component.ts`

**Purpose:** Main landing page after login

**Features:**
- Role-based view (Super Admin vs Tenant)
- Key metrics display
- Quick action cards
- Recent activity feed

**NgRx State:**
- DashboardFacade for statistics
- Subscribes to dashboard$ observable

### SuperAdminDashboardComponent
**Path:** `src/app/components/super-admin-dashboard/super-admin-dashboard.component.ts`

**Features:**
- System-wide statistics
- Tenant overview
- Credit request queue
- User activity monitor

### TenantDashboardComponent
**Path:** `src/app/components/tenant-dashboard/tenant-dashboard.component.ts`

**Features:**
- Tenant-specific metrics
- Credit balance display
- App selector for multi-app filtering
- Recent scans widget

---

## Tenant Management

### TenantListComponent
**Path:** `src/app/components/tenant-management/tenant-list.component.ts`

**Purpose:** List all tenants (Super Admin only)

**Features:**
- Searchable/filterable list
- Pagination
- Status indicators
- Credit balance display
- Quick actions (view, edit, delete)

**NgRx:**
- TenantsFacade
- Subscribes to tenants$ observable
- Dispatches load/delete actions

### TenantFormComponent
**Path:** `src/app/components/tenant-management/tenant-form.component.ts`

**Purpose:** Create/Edit tenant

**Features:**
- Reactive form with validation
- Subdomain availability check
- Real-time slug suggestions
- Email uniqueness validation

**Form Fields:**
- Company name
- Contact email
- Phone
- Address
- Subdomain slug (auto-generated option)

### TenantDetailComponent
**Path:** `src/app/components/tenant-management/tenant-detail.component.ts`

**Purpose:** View tenant details and manage

**Features:**
- Tenant information display
- User list
- Credit history
- Deactivate/Delete actions

### Tenant Admin Components

#### TenantAdminDashboardComponent
**Path:** `src/app/components/super-admin/tenant-admins/tenant-admin-dashboard.component.ts`

**Purpose:** List all tenant administrators

#### AddTenantAdminComponent
**Path:** `src/app/components/super-admin/tenant-admins/add-tenant-admin.component.ts`

**Purpose:** Create new tenant admin

**Features:**
- Email/name input
- Tenant selection dropdown
- Role assignment (TENANT_ADMIN)
- Sends welcome email with OTP

#### TenantAdminDetailComponent
**Path:** `src/app/components/super-admin/tenant-admins/tenant-admin-detail.component.ts`

**Purpose:** View/edit tenant admin details

---

## Verification Apps

### VerificationAppListComponent
**Path:** `src/app/components/verification-app/verification-app-list.component.ts`

**Purpose:** List tenant verification apps

**Features:**
- App cards with branding preview
- Status indicators (Active/Inactive)
- API key management
- Quick actions (edit, delete, toggle)

**NgRx:**
- VerificationAppsFacade
- Observable: verificationApps$

### VerificationAppConfigureComponent
**Path:** `src/app/components/verification-app/verification-app-configure.component.ts`

**Purpose:** Create/Edit verification app

**Features:**
- App name and description
- Branding configuration:
  - Logo URL
  - Primary/secondary colors
  - Custom messages
  - Post-scan redirect
- Template selection
- API key display (create mode)

**Form Validation:**
- Required: app_name
- Optional: all branding fields
- Color validation (hex format)

### ApiConfigurationComponent
**Path:** `src/app/components/verification-app/api-configuration.component.ts`

**Purpose:** Manage API key and external integration

**Features:**
- Display API key (masked)
- Regenerate API key
- Usage documentation
- Integration examples

### AppSelectorComponent
**Path:** `src/app/components/app-selector/app-selector.component.ts`

**Purpose:** Multi-app filtering dropdown

**Features:**
- "All Apps" option
- Individual app selection
- Persists selection in state
- Emits selection change event

---

## Product Catalog

### Template Components

#### TemplateListComponent
**Path:** `src/app/components/templates/template-list.component.ts`

**Purpose:** List product templates

**Features:**
- Template cards
- Search by name
- Filter by active/inactive
- System templates indicator
- Duplicate template action

**Actions:**
- Create, View, Edit, Delete, Duplicate

#### TemplateFormComponent
**Path:** `src/app/components/templates/template-form.component.ts`

**Purpose:** Create/Edit product template

**Features:**
- Template name/description
- Custom field builder:
  - Add/remove attributes
  - Configure data types
  - Set validation rules
  - Reorder fields (drag/drop)
  - Group fields by category

**Attribute Configuration:**
- Name and key
- Data type selection
- Required flag
- Validation rules (min/max, options)
- Default value
- Help text and placeholder

#### TemplateDetailComponent
**Path:** `src/app/components/templates/template-detail.component.ts`

**Purpose:** View template details

**Features:**
- Attribute list grouped by field_group
- Validation rules display
- Data type icons
- Edit/Delete/Duplicate actions

### Category Components

#### CategoryListComponent
**Path:** `src/app/components/categories/category-list.component.ts` (implied)

**Purpose:** List categories

**Features:**
- App-filtered category list
- Icon display
- Product count per category
- CRUD actions

#### CategoryFormComponent
**Path:** `src/app/components/categories/category-form.component.ts`

**Purpose:** Create/Edit category

**Form Fields:**
- Category name
- Icon (Material Icons)
- Description
- Verification app association

### Product Components

#### ProductListComponent
**Path:** `src/app/components/products/product-list.component.ts`

**Purpose:** List products

**Features:**
- Grid/List view toggle
- App filtering
- Category filtering
- Search by name/SKU
- Product cards with image
- Price display

#### ProductFormComponent
**Path:** `src/app/components/products/product-form.component.ts`

**Purpose:** Create/Edit product

**Features:**
- Basic info (name, SKU, price)
- Category selection
- Template selection
- Dynamic custom fields (based on template)
- Variant management
- Image upload
- Tag management

**Dynamic Form:**
- Loads template custom fields
- Renders appropriate input type
- Applies validation rules
- Stores as JSONB

#### TemplateProductFormComponent
**Path:** `src/app/components/products/template-product-form.component.ts`

**Purpose:** Simplified product creation with template

**Features:**
- Template-first approach
- Pre-filled field structure
- Validation from template
- Quick product creation

### Tag Components

#### TagListComponent
**Path:** `src/app/components/tags/tag-list.component.ts`

**Purpose:** Manage product tags

#### TagFormComponent
**Path:** `src/app/components/tags/tag-form.component.ts`

**Purpose:** Create/Edit tags for product organization

---

## Coupon Management

### CouponListComponent
**Path:** `src/app/components/rewards/coupon-list.component.ts`

**Purpose:** List all coupons

**Features:**
- Status filter (Active/Used/Expired)
- App filter
- Product filter
- Date range filter
- Bulk actions
- Export functionality

**Display:**
- Coupon code
- QR code preview
- Status badge
- Discount details
- Expiry date
- Usage count

### CouponCreateComponent
**Path:** `src/app/components/rewards/coupon-create.component.ts`

**Purpose:** Create single or batch coupons

**Features:**
- Single vs batch mode toggle
- Verification app selection
- Product linking
- Discount configuration:
  - Type: Percentage/Fixed/BuyXGetY
  - Value
  - Currency
- Usage limits
- Expiry date picker
- Terms & conditions
- Credit cost calculator

**Validation:**
- Check sufficient credits
- Required fields
- Date validation (expiry > today)
- Numeric constraints

### BatchWizardComponent
**Path:** `src/app/components/batch-wizard/batch-wizard.component.ts`

**Purpose:** Multi-step batch creation wizard

**Steps:**
1. Batch Info (name, dealer, zone)
2. Coupon Configuration (discount, expiry)
3. Quantity & Serial Numbers
4. Review & Generate

**Features:**
- Step navigation
- Progress indicator
- Form validation per step
- Credit check before generation
- Bulk QR code download

---

## Credit Management

### CreditDashboardComponent
**Path:** `src/app/components/credit-management/credit-dashboard.component.ts`

**Purpose:** Tenant credit overview

**Features:**
- Current balance display
- Credit history chart
- Request credits button
- Recent transactions

### CreditRequestFormComponent
**Path:** `src/app/components/credit-management/credit-request-form.component.ts`

**Purpose:** Request credit top-up

**Features:**
- Amount input
- Justification textarea
- Credit usage calculator
- Submit request

### CreditApprovalListComponent
**Path:** `src/app/components/credit-management/credit-approval-list.component.ts`

**Purpose:** Approve/Reject credit requests (Super Admin)

**Features:**
- Pending requests queue
- Request details modal
- Approve/Reject actions
- Rejection reason input
- Tenant history view

### CreditTransactionHistoryComponent
**Path:** `src/app/components/credit-management/credit-transaction-history.component.ts`

**Purpose:** Credit transaction audit log

**Features:**
- Paginated transaction list
- Type filter (Credit/Debit)
- Date range filter
- Balance tracking
- Export to Excel

---

## User Management

### Tenant Users Components

#### TenantUsersListComponent
**Path:** `src/app/components/tenant-users/tenant-users-list.component.ts`

**Purpose:** List all users in tenant

**Features:**
- User table with roles
- Permission summary
- Active/Inactive status
- Add user button

#### TenantUserFormComponent
**Path:** `src/app/components/tenant-users/tenant-user-form.component.ts`

**Purpose:** Create/Edit tenant user

**Features:**
- Email/name input
- Role selection (TENANT_ADMIN/TENANT_USER)
- Permission assignment (if TENANT_USER)
- Multi-select permission checkboxes

#### UserPermissionsComponent
**Path:** `src/app/components/tenant-users/user-permissions.component.ts`

**Purpose:** Manage user permissions

**Features:**
- Permission groups (Apps, Products, Coupons, etc.)
- Checkbox matrix
- Select all/none toggles
- Permission descriptions

---

## Shared Components

### SharedHeaderComponent
**Path:** `src/app/components/shared-header/shared-header.component.ts`

**Purpose:** App-wide header with navigation

**Features:**
- Logo and branding
- App selector (tenant view)
- User menu dropdown
- Logout action

### SideNavComponent
**Path:** `src/app/components/side-nav/side-nav.component.ts`

**Purpose:** Sidebar navigation menu

**Features:**
- Role-based menu items
- Active route highlighting
- Expandable sections
- Material icons

**Menu Structure:**
```typescript
// Super Admin
- Dashboard
- Tenants
- Tenant Admins
- Credit Approvals
- Users
- Settings

// Tenant Admin
- Dashboard
- Verification Apps
- Products & Categories
- Templates
- Coupons & Batches
- Scan History
- Credits
- Users & Permissions
- Settings
```

### ProfileComponent
**Path:** `src/app/components/profile/profile.component.ts`

**Purpose:** User profile management

**Features:**
- View profile info
- Edit name/phone
- Change password (send OTP)

### SettingsComponent
**Path:** `src/app/components/settings/settings.component.ts`

**Purpose:** App settings and preferences

### Scan History Components

#### ScanHistoryComponent
**Path:** `src/app/components/scans/scan-history.component.ts`

**Purpose:** View all scan attempts

**Features:**
- Paginated scan list
- Status filter
- Date range filter
- Customer info display
- Location display
- Export to Excel

### Customer Components

#### CustomerRegistrationComponent
**Path:** `src/app/components/customer-registration/customer-registration.component.ts`

**Purpose:** Register new customer (mobile)

**Features:**
- Phone/email input
- OTP verification
- Name collection

### Specialized Editors

#### StructuredDescriptionEditorComponent
**Path:** `src/app/components/shared/structured-description-editor/structured-description-editor.component.ts`

**Purpose:** WYSIWYG description editor

**Features:**
- Rich text editing
- Section management
- Preview mode

#### VariantListEditorComponent
**Path:** `src/app/components/shared/variant-list-editor/variant-list-editor.component.ts`

**Purpose:** Manage product variants

**Features:**
- Add/remove variant options
- Variant type selection (size, color, weight)
- Custom variant types
- Validation

---

## NgRx Integration

Components use facades for state management:

### Facades
- `AuthContextFacade` - Authentication state
- `DashboardFacade` - Dashboard statistics
- `TenantsFacade` - Tenant management
- `VerificationAppsFacade` - Verification apps
- `CreditRequestsFacade` - Credit requests

### Pattern
```typescript
constructor(private facade: TenantsFacade) {}

ngOnInit() {
  // Load data
  this.facade.loadTenants();

  // Subscribe to state
  this.tenants$ = this.facade.tenants$;
  this.loading$ = this.facade.loading$;
  this.error$ = this.facade.error$;
}

createTenant(data: TenantCreateRequest) {
  this.facade.createTenant(data);
}
```

---

## Routing

Components mapped to routes:

```typescript
// Public routes
/login → LoginComponent

// Super Admin routes
/dashboard → SuperAdminDashboardComponent
/tenants → TenantListComponent
/tenants/create → TenantFormComponent
/tenants/:id → TenantDetailComponent

// Tenant Admin routes
/tenant/dashboard → TenantDashboardComponent
/tenant/apps → VerificationAppListComponent
/tenant/products → ProductListComponent
/tenant/coupons → CouponListComponent
/tenant/scans → ScanHistoryComponent
```

---

**For implementation details, see:**
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [API_REFERENCE.md](API_REFERENCE.md)
EOF

echo "✅ Created COMPONENTS_GUIDE.md"

# Create ARCHITECTURE.md
cat > "$DOCS_DIR/ARCHITECTURE.md" << 'EOF'
# System Architecture

Comprehensive architecture documentation for the MScan platform covering design patterns, coding standards, and technical decisions.

## Table of Contents
- [High-Level Architecture](#high-level-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [State Management](#state-management)
- [Authentication & Authorization](#authentication--authorization)
- [Multi-Tenancy](#multi-tenancy)
- [Data Flow](#data-flow)
- [Design Patterns](#design-patterns)
- [Coding Standards](#coding-standards)
- [Security](#security)
- [Performance](#performance)

---

## High-Level Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Browser   │ ◄─────► │ Angular SPA  │ ◄─────► │ Node.js API  │
│  (Client)   │   HTTPS │   (NgRx)     │   REST  │  (Express)   │
└─────────────┘         └──────────────┘         └──────────────┘
                                                         │
                                                         ▼
                                                  ┌──────────────┐
                                                  │ PostgreSQL   │
                                                  │  Database    │
                                                  └──────────────┘
```

### Technology Stack

**Frontend:**
- Angular 19 (Standalone Components)
- NgRx 18 (State Management)
- Tailwind CSS 3 (Styling)
- RxJS 7 (Reactive Programming)
- TypeScript 5

**Backend:**
- Node.js 20.x
- Express.js 4.x
- PostgreSQL 16.x
- JWT (jsonwebtoken)
- Nodemailer (Email)

**DevOps:**
- Jest (Unit Testing)
- Playwright (E2E Testing)
- Git (Version Control)
- npm (Package Management)

---

## Frontend Architecture

### Standalone Components

Angular 19 uses standalone components (no NgModule):

```typescript
@Component({
  selector: 'app-tenant-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './tenant-list.component.html',
  styleUrls: ['./tenant-list.component.css']
})
export class TenantListComponent implements OnInit {
  // Component logic
}
```

**Benefits:**
- Simplified component tree
- Better tree-shaking
- Lazy loading at component level
- No circular dependencies

### Folder Structure

```
src/app/
├── components/          # UI Components (40+)
│   ├── login/
│   ├── dashboard/
│   ├── tenant-management/
│   ├── products/
│   ├── rewards/
│   └── shared/
├── services/            # Business Logic (15+)
│   ├── auth.service.ts
│   ├── tenant.service.ts
│   ├── template.service.ts
│   └── ...
├── guards/              # Route Guards
│   ├── auth.guard.ts
│   └── permission.guard.ts
├── models/              # TypeScript Interfaces
│   ├── tenant.model.ts
│   ├── product.model.ts
│   └── ...
├── store/               # NgRx State
│   ├── auth-context/
│   ├── dashboard/
│   ├── tenants/
│   └── ...
├── app.routes.ts        # Routing Configuration
├── app.config.ts        # App Configuration
└── app.ts               # Root Component
```

---

## Backend Architecture

### Layered Architecture

```
┌─────────────────────────────────────┐
│          Routes Layer               │  ← HTTP endpoints
├─────────────────────────────────────┤
│       Middleware Layer              │  ← Auth, Validation, Logging
├─────────────────────────────────────┤
│      Controllers Layer              │  ← Request handling
├─────────────────────────────────────┤
│       Services Layer                │  ← Business logic
├─────────────────────────────────────┤
│        Database Layer               │  ← PostgreSQL queries
└─────────────────────────────────────┘
```

### Folder Structure

```
src/
├── controllers/         # Request Handlers
│   ├── auth.controller.js
│   ├── tenant.controller.js
│   ├── products.controller.js
│   └── ...
├── routes/              # Route Definitions (20+)
│   ├── auth.routes.js
│   ├── tenant.routes.js
│   └── ...
├── services/            # Business Logic
│   ├── email.service.js
│   ├── token.service.js
│   └── ...
├── middleware/          # Middleware Functions
│   ├── auth.middleware.js
│   ├── permission.middleware.js
│   ├── subdomain.middleware.js
│   └── error.middleware.js
├── config/              # Configuration
│   └── database.js
└── server.js            # Express App Entry
```

### Request Flow

```
1. HTTP Request
   ↓
2. CORS Middleware
   ↓
3. Subdomain Middleware (detects tenant)
   ↓
4. Route Handler
   ↓
5. Auth Middleware (verify JWT)
   ↓
6. Permission Middleware (check permissions)
   ↓
7. Controller (handle request)
   ↓
8. Service (business logic)
   ↓
9. Database Query
   ↓
10. Response (JSON)
```

---

## State Management

### NgRx Architecture

MScan uses NgRx with the Facade pattern for simplified state access.

#### Store Structure

```
store/
├── auth-context/
│   ├── auth-context.actions.ts
│   ├── auth-context.reducer.ts
│   ├── auth-context.effects.ts
│   ├── auth-context.selectors.ts
│   └── auth-context.facade.ts
├── dashboard/
├── tenants/
├── verification-apps/
└── credit-requests/
```

#### Facade Pattern

Facades provide a simple API for components:

```typescript
// Facade
@Injectable({ providedIn: 'root' })
export class TenantsFacade {
  // Observables
  tenants$ = this.store.select(selectAllTenants);
  loading$ = this.store.select(selectTenantsLoading);
  error$ = this.store.select(selectTenantsError);

  constructor(private store: Store) {}

  // Actions
  loadTenants() {
    this.store.dispatch(TenantsActions.loadTenants());
  }

  createTenant(data: TenantCreateRequest) {
    this.store.dispatch(TenantsActions.createTenant({ data }));
  }
}

// Component usage
export class TenantListComponent {
  tenants$ = this.tenantsFacade.tenants$;
  loading$ = this.tenantsFacade.loading$;

  constructor(private tenantsFacade: TenantsFacade) {}

  ngOnInit() {
    this.tenantsFacade.loadTenants();
  }
}
```

#### Benefits

- Centralized state
- Predictable state updates
- Time-travel debugging
- Easy testing
- Simplified component logic

---

## Authentication & Authorization

### JWT Token Strategy

**Access Token:**
- Expires: 30 minutes
- Contains: userId, role, tenantId, permissions
- Used for API calls

**Refresh Token:**
- Expires: 7 days
- Used to obtain new access tokens
- Stored securely in HTTP-only cookie (production)

### Token Payload

```json
{
  "userId": "uuid",
  "role": "TENANT_ADMIN",
  "tenantId": "uuid",
  "subdomainSlug": "acme",
  "permissions": ["create_app", "edit_app", ...],
  "jti": "unique-token-id",
  "type": "access",
  "iat": 1234567890,
  "exp": 1234569690
}
```

### Permission-Based Authorization

**Middleware:**
```javascript
// Check single permission
requirePermission('create_coupon')

// Check multiple permissions (any)
requireAnyPermission(['view_coupons', 'view_batches'])

// Check multiple permissions (all)
requireAllPermissions(['edit_coupon', 'delete_coupon'])
```

**Permission Naming:**
- Pattern: `{action}_{resource}`
- Examples: `create_product`, `view_analytics`, `edit_app`

**Role Defaults:**
- SUPER_ADMIN: Bypasses all checks (full access)
- TENANT_ADMIN: All tenant-scoped permissions
- TENANT_USER: Custom permission set

---

## Multi-Tenancy

### Subdomain-Based Routing

**Pattern:** `{tenant-slug}.mscan.com`

**Examples:**
- Super Admin: `mscan.com`
- Acme Corp: `acme.mscan.com`
- Global Transport: `global-transport.mscan.com`

### Implementation

**Subdomain Middleware:**
```javascript
function subdomainMiddleware(req, res, next) {
  const host = req.get('host');
  const subdomain = extractSubdomain(host);

  if (subdomain && subdomain !== 'www') {
    // Load tenant by subdomain
    const tenant = await getTenantBySubdomain(subdomain);
    req.tenant = tenant;
  }

  next();
}
```

### Data Isolation

**Database Level:**
- All tenant data tables have `tenant_id` column
- Foreign key to `tenants(id)` with CASCADE DELETE
- Queries always filter by `tenant_id`

**Query Pattern:**
```sql
SELECT * FROM products
WHERE tenant_id = $1
  AND verification_app_id = $2
  AND is_active = true;
```

**Index Strategy:**
- Composite indexes: `(tenant_id, other_column)`
- Fast tenant-scoped queries
- Prevents cross-tenant data leaks

---

## Data Flow

### Creating a Coupon

```
┌──────────┐
│Component │
└────┬─────┘
     │ 1. Call createCoupon()
     ▼
┌──────────┐
│ Facade   │
└────┬─────┘
     │ 2. Dispatch action
     ▼
┌──────────┐
│ Effects  │
└────┬─────┘
     │ 3. HTTP POST /api/rewards/coupons
     ▼
┌──────────┐
│  API     │  4. Auth middleware → Check permissions
└────┬─────┘
     │ 5. Controller receives request
     ▼
┌──────────┐
│Controller│  6. Validate input
└────┬─────┘
     │ 7. Check credit balance
     ▼
┌──────────┐
│ Service  │  8. Generate coupon code
└────┬─────┘     9. Create QR code
     │ 10. Deduct credits
     ▼
┌──────────┐
│ Database │  11. INSERT coupon
└────┬─────┘     12. UPDATE credit balance
     │ 13. Return created coupon
     ▼
┌──────────┐
│ Effects  │  14. Dispatch success action
└────┬─────┘
     │ 15. Update state
     ▼
┌──────────┐
│Component │  16. Display success message
└──────────┘
```

---

## Design Patterns

### 1. Facade Pattern (NgRx)

Simplifies state management access:

```typescript
// Instead of:
this.store.dispatch(action());
this.store.select(selector);

// Use:
this.facade.loadData();
this.data$ = this.facade.data$;
```

### 2. Repository Pattern (Backend)

Separates data access logic:

```javascript
// Service uses repository
class TenantService {
  async getTenant(id) {
    return await tenantRepository.findById(id);
  }
}

// Repository handles database
class TenantRepository {
  async findById(id) {
    return await db.query('SELECT * FROM tenants WHERE id = $1', [id]);
  }
}
```

### 3. Middleware Chain (Express)

Composable request processing:

```javascript
router.post('/coupons',
  requireAuth,                    // 1. Authenticate
  requirePermission('create_coupon'), // 2. Authorize
  validateCouponInput,            // 3. Validate
  couponController.create         // 4. Handle
);
```

### 4. Observer Pattern (RxJS)

Reactive data streams:

```typescript
// Observable stream
this.tenants$ = this.tenantsFacade.tenants$.pipe(
  map(tenants => tenants.filter(t => t.is_active)),
  tap(tenants => console.log('Active tenants:', tenants.length))
);

// Auto-unsubscribed by async pipe
// Template: tenants$ | async
```

### 5. Strategy Pattern (Discount Types)

Different discount strategies:

```javascript
class DiscountStrategyFactory {
  static getStrategy(type) {
    switch(type) {
      case 'PERCENTAGE':
        return new PercentageDiscount();
      case 'FIXED_AMOUNT':
        return new FixedAmountDiscount();
      case 'BUY_X_GET_Y':
        return new BuyXGetYDiscount();
    }
  }
}
```

---

## Coding Standards

### TypeScript

**Naming Conventions:**
- Classes: PascalCase (`TenantService`)
- Interfaces: PascalCase (`TenantCreateRequest`)
- Variables/Functions: camelCase (`createTenant`)
- Constants: UPPER_SNAKE_CASE (`API_URL`)
- Files: kebab-case (`tenant.service.ts`)

**Type Safety:**
```typescript
// Good: Explicit types
function createTenant(data: TenantCreateRequest): Observable<Tenant> {
  return this.http.post<Tenant>(`${API_URL}/tenants`, data);
}

// Bad: Any types
function createTenant(data: any): any {
  return this.http.post(`${API_URL}/tenants`, data);
}
```

### Angular

**Component Structure:**
```typescript
export class TenantListComponent implements OnInit, OnDestroy {
  // 1. Public properties
  tenants$: Observable<Tenant[]>;
  loading$: Observable<boolean>;

  // 2. Private properties
  private destroy$ = new Subject<void>();

  // 3. Constructor
  constructor(private facade: TenantsFacade) {}

  // 4. Lifecycle hooks
  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 5. Public methods
  loadData() {
    this.facade.loadTenants();
  }

  // 6. Private methods
  private filterActive(tenants: Tenant[]) {
    return tenants.filter(t => t.is_active);
  }
}
```

### Node.js/Express

**Controller Pattern:**
```javascript
// Good: Async/await with try-catch
exports.createTenant = async (req, res) => {
  try {
    const data = req.body;
    const tenant = await tenantService.create(data);

    res.status(201).json({
      success: true,
      data: tenant
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

**Error Handling:**
```javascript
// Custom error classes
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});
```

---

## Security

### Input Validation

**Backend:**
```javascript
const { body, param, validationResult } = require('express-validator');

router.post('/tenants',
  [
    body('tenant_name').trim().notEmpty().isLength({ min: 3, max: 255 }),
    body('email').isEmail().normalizeEmail(),
    body('subdomain_slug').matches(/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/)
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
);
```

**Frontend:**
```typescript
// Reactive form validation
this.tenantForm = this.fb.group({
  tenant_name: ['', [Validators.required, Validators.minLength(3)]],
  email: ['', [Validators.required, Validators.email]],
  subdomain_slug: ['', [
    Validators.required,
    Validators.pattern(/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/)
  ]]
});
```

### SQL Injection Prevention

**Parameterized Queries:**
```javascript
// Good: Parameterized
const result = await db.query(
  'SELECT * FROM tenants WHERE email = $1',
  [email]
);

// Bad: String concatenation
const result = await db.query(
  `SELECT * FROM tenants WHERE email = '${email}'`
);
```

### XSS Prevention

**Angular:** Built-in sanitization
**Backend:** Helmet middleware

```javascript
const helmet = require('helmet');
app.use(helmet());
```

---

## Performance

### Frontend Optimization

**Lazy Loading:**
```typescript
// Route-level code splitting
export const routes: Routes = [
  {
    path: 'tenants',
    loadComponent: () => import('./components/tenant-list.component')
      .then(m => m.TenantListComponent)
  }
];
```

**Change Detection:**
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TenantListComponent {
  // Only checks when inputs change or events fire
}
```

**TrackBy Functions:**
```typescript
trackByTenantId(index: number, tenant: Tenant): string {
  return tenant.id;
}

// Template
<div *ngFor="let tenant of tenants; trackBy: trackByTenantId">
```

### Backend Optimization

**Database Indexes:**
- 80+ indexes for common queries
- Composite indexes for multi-column WHERE clauses
- Covering indexes for SELECT-only queries

**Connection Pooling:**
```javascript
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

**Caching Strategy:**
- In-memory caching for static data (categories, templates)
- Redis for session data (future enhancement)

---

## Testing

### Unit Tests (Frontend)

```typescript
describe('TenantListComponent', () => {
  let component: TenantListComponent;
  let facade: jasmine.SpyObj<TenantsFacade>;

  beforeEach(() => {
    facade = jasmine.createSpyObj('TenantsFacade', ['loadTenants']);
    component = new TenantListComponent(facade);
  });

  it('should load tenants on init', () => {
    component.ngOnInit();
    expect(facade.loadTenants).toHaveBeenCalled();
  });
});
```

### E2E Tests (Playwright)

```typescript
test('create tenant workflow', async ({ page }) => {
  await page.goto('/tenants/create');
  await page.fill('[name="tenant_name"]', 'Test Corp');
  await page.fill('[name="email"]', 'test@corp.com');
  await page.click('button[type="submit"]');

  await expect(page.locator('.success-message')).toBeVisible();
});
```

---

**For deployment and operations, see:**
- [DEPLOYMENT.md](DEPLOYMENT.md) (future)
- [TESTING_GUIDE.md](TESTING_GUIDE.md) (future)
EOF

echo "✅ Created ARCHITECTURE.md"

echo "📚 Documentation generation complete!"
echo ""
echo "📁 Generated documentation files:"
echo "  - docs/SETUP.md"
echo "  - docs/SUPER_ADMIN_FEATURES.md"
echo "  - docs/TENANT_ADMIN_FEATURES.md"
echo "  - docs/DATABASE_DESIGN.md"
echo "  - docs/API_REFERENCE.md"
echo "  - docs/COMPONENTS_GUIDE.md"
echo "  - docs/ARCHITECTURE.md"
echo ""
echo "✅ All documentation files created successfully!"
EOF

echo "✅ Created ARCHITECTURE.md"

echo "📚 Documentation generation complete!"
echo "Generated files in $DOCS_DIR/"