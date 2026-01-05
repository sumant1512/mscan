# Design Document: Navigation, Tenant Management, and Rewards System

## Overview
This document provides technical design decisions and implementation guidance for the navigation, tenant management, credit system, and rewards features.

## Architecture

### Frontend (Angular)
```
src/app/
├── components/
│   ├── navigation/
│   │   ├── side-nav.component.ts
│   │   ├── side-nav.component.html
│   │   └── side-nav.component.css
│   ├── tenant-management/
│   │   ├── tenant-list/
│   │   ├── tenant-form/
│   │   └── tenant-detail/
│   ├── credit-management/
│   │   ├── credit-request-form/
│   │   ├── credit-approval/
│   │   ├── credit-history/
│   │   └── credit-balance/
│   └── rewards/
│       ├── verification-app-config/
│       ├── coupon-create/
│       ├── coupon-list/
│       ├── scan-interface/
│       └── scan-analytics/
├── services/
│   ├── tenant.service.ts
│   ├── credit.service.ts
│   └── rewards.service.ts
└── models/
    ├── tenant.model.ts
    ├── credit.model.ts
    └── coupon.model.ts
```

### Backend (Node.js + PostgreSQL)
```
src/
├── controllers/
│   ├── tenant.controller.js
│   ├── credit.controller.js
│   └── rewards.controller.js
├── routes/
│   ├── tenant.routes.js
│   ├── credit.routes.js
│   └── rewards.routes.js
├── services/
│   ├── credit-calculator.service.js
│   ├── coupon-generator.service.js
│   └── qr-code.service.js
└── middleware/
    └── role-authorization.middleware.js
```

## Database Schema

### Tables

#### tenants
```sql
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    status VARCHAR(20) DEFAULT 'active', -- active, inactive
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_email ON tenants(contact_email);
```

#### credit_requests
```sql
CREATE TABLE credit_requests (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    requested_amount INTEGER NOT NULL,
    justification TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    processed_by INTEGER REFERENCES users(id),
    rejection_reason TEXT,
    CONSTRAINT chk_amount_positive CHECK (requested_amount > 0)
);

CREATE INDEX idx_credit_requests_tenant ON credit_requests(tenant_id);
CREATE INDEX idx_credit_requests_status ON credit_requests(status);
```

#### credit_transactions
```sql
CREATE TABLE credit_transactions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    transaction_type VARCHAR(20) NOT NULL, -- CREDIT, DEBIT
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reference_id INTEGER, -- credit_request_id or coupon_id
    reference_type VARCHAR(50), -- CREDIT_APPROVAL, COUPON_CREATION
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_credit_trans_tenant ON credit_transactions(tenant_id);
CREATE INDEX idx_credit_trans_type ON credit_transactions(transaction_type);
```

#### tenant_credit_balance
```sql
CREATE TABLE tenant_credit_balance (
    tenant_id INTEGER PRIMARY KEY REFERENCES tenants(id),
    balance INTEGER DEFAULT 0,
    total_received INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_balance_non_negative CHECK (balance >= 0)
);
```

#### verification_apps
```sql
CREATE TABLE verification_apps (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    app_name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url TEXT,
    primary_color VARCHAR(7), -- hex color
    secondary_color VARCHAR(7),
    welcome_message TEXT,
    scan_success_message TEXT,
    scan_failure_message TEXT,
    post_scan_redirect_url TEXT,
    enable_analytics BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verification_apps_tenant ON verification_apps(tenant_id);
```

#### coupons
```sql
CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    verification_app_id INTEGER REFERENCES verification_apps(id),
    coupon_code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL, -- PERCENTAGE, FIXED_AMOUNT, BUY_X_GET_Y
    discount_value DECIMAL(10,2) NOT NULL,
    discount_currency VARCHAR(3) DEFAULT 'USD',
    buy_quantity INTEGER, -- for BUY_X_GET_Y
    get_quantity INTEGER, -- for BUY_X_GET_Y
    min_purchase_amount DECIMAL(10,2),
    expiry_date TIMESTAMP NOT NULL,
    total_usage_limit INTEGER,
    per_user_usage_limit INTEGER DEFAULT 1,
    current_usage_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, expired, exhausted, inactive
    qr_code_url TEXT,
    description TEXT,
    terms TEXT,
    credit_cost INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_discount_positive CHECK (discount_value > 0),
    CONSTRAINT chk_expiry_future CHECK (expiry_date > created_at)
);

CREATE INDEX idx_coupons_tenant ON coupons(tenant_id);
CREATE INDEX idx_coupons_code ON coupons(coupon_code);
CREATE INDEX idx_coupons_status ON coupons(status);
CREATE INDEX idx_coupons_expiry ON coupons(expiry_date);
```

#### scans
```sql
CREATE TABLE scans (
    id SERIAL PRIMARY KEY,
    coupon_id INTEGER NOT NULL REFERENCES coupons(id),
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    scan_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scan_status VARCHAR(20) NOT NULL, -- SUCCESS, EXPIRED, EXHAUSTED, INVALID
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    device_info TEXT,
    user_agent TEXT,
    ip_address INET
);

CREATE INDEX idx_scans_coupon ON scans(coupon_id);
CREATE INDEX idx_scans_tenant ON scans(tenant_id);
CREATE INDEX idx_scans_timestamp ON scans(scan_timestamp);
CREATE INDEX idx_scans_status ON scans(scan_status);
```

## API Endpoints

### Tenant Management
```
POST   /api/tenants                    - Create tenant (Super Admin)
GET    /api/tenants                    - List tenants (Super Admin)
GET    /api/tenants/:id                - Get tenant details (Super Admin)
PUT    /api/tenants/:id                - Update tenant (Super Admin)
PATCH  /api/tenants/:id/status         - Toggle tenant status (Super Admin)
```

### Credit Management
```
POST   /api/credits/request            - Request credits (Tenant)
GET    /api/credits/requests           - List all requests (Super Admin)
GET    /api/credits/requests/my        - My requests (Tenant)
POST   /api/credits/approve/:id        - Approve request (Super Admin)
POST   /api/credits/reject/:id         - Reject request (Super Admin)
GET    /api/credits/balance            - Get balance (Tenant)
GET    /api/credits/transactions       - Transaction history
```

### Rewards System
```
POST   /api/verification-apps          - Create app config (Tenant)
GET    /api/verification-apps          - List apps (Tenant)
PUT    /api/verification-apps/:id      - Update app (Tenant)

POST   /api/coupons                    - Create coupon (Tenant)
GET    /api/coupons                    - List coupons (Tenant)
GET    /api/coupons/:id                - Get coupon details
PUT    /api/coupons/:id                - Update coupon (Tenant)
PATCH  /api/coupons/:id/status         - Deactivate/reactivate (Tenant)

POST   /api/scans/verify               - Verify coupon (Public)
GET    /api/scans/history              - Scan history (Tenant)
GET    /api/scans/analytics            - Analytics (Tenant)
```

## Technical Decisions

### Credit Cost Calculation Algorithm
```javascript
function calculateCouponCreditCost(coupon) {
  let baseCost = 100; // Base cost
  
  // Discount type multiplier
  if (coupon.discount_type === 'PERCENTAGE') {
    baseCost *= coupon.discount_value / 100;
    if (coupon.discount_value >= 50) baseCost *= 2; // High discount penalty
  } else if (coupon.discount_type === 'FIXED_AMOUNT') {
    baseCost = (coupon.discount_value * (coupon.total_usage_limit || 100)) / 10;
  }
  
  // Quantity multiplier
  if (coupon.total_usage_limit) {
    baseCost *= Math.log10(coupon.total_usage_limit + 1);
  }
  
  // Time-based multiplier
  const daysValid = Math.ceil((coupon.expiry_date - new Date()) / (1000 * 60 * 60 * 24));
  if (daysValid < 30) baseCost *= 0.8;
  else if (daysValid > 90) baseCost *= 1.2;
  
  return Math.ceil(baseCost);
}
```

### QR Code Generation
- Library: `qrcode` npm package
- Format: PNG, 300x300px minimum
- Storage: Cloud storage (AWS S3 or similar)
- Data encoded: `{couponCode: "ABC123", tenantId: 1, verifyUrl: "https://app.com/verify"}`

### Coupon Code Generation
- Length: 8-12 characters
- Character set: Uppercase alphanumeric excluding confusing characters (O, 0, I, l, 1)
- Pattern: `PREFIX-XXXX-XXXX` where PREFIX is tenant identifier
- Uniqueness: Checked against existing codes before insertion

### Role-Based Authorization Middleware
```javascript
// middleware/role-authorization.middleware.js
const requireSuperAdmin = (req, res, next) => {
  if (req.user.user_type !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super Admin access required' });
  }
  next();
};

const requireTenant = (req, res, next) => {
  if (req.user.user_type !== 'TENANT') {
    return res.status(403).json({ error: 'Tenant access required' });
  }
  next();
};
```

## Security Considerations

1. **Credit Balance Integrity**: Use database transactions for all credit operations
2. **Coupon Code Security**: Generate cryptographically random codes
3. **QR Code Tampering**: Include verification signature in QR data
4. **Rate Limiting**: Apply rate limits on scan verification endpoints (10 requests/minute)
5. **Role Enforcement**: Middleware on every protected route
6. **Tenant Isolation**: Always filter by tenant_id for tenant users
7. **Input Validation**: Validate all inputs, especially credit amounts and dates

## Performance Considerations

1. **Indexing**: Indexes on foreign keys and frequently queried columns
2. **Pagination**: Default 20 items per page, maximum 100
3. **Caching**: Cache credit balances with 5-minute TTL
4. **Batch Operations**: Support bulk QR code downloads
5. **Analytics Queries**: Use materialized views for complex aggregations

## Testing Strategy

1. **Unit Tests**: All services and utilities (80%+ coverage)
2. **Integration Tests**: API endpoints with database
3. **E2E Tests**: Complete user workflows for both roles
4. **Load Tests**: Scan verification endpoint (target: 100 req/sec)
5. **Security Tests**: Authorization checks, input validation

## Migration Plan

1. Run database migration script to create new tables
2. Deploy backend API with new endpoints
3. Deploy frontend with navigation and new components
4. Create initial Super Admin user if not exists
5. Test tenant creation and credit workflow
6. Test coupon creation and scan verification
7. Monitor for errors and performance issues

## Rollback Plan

If issues occur:
1. Disable new navigation routes
2. Revert database to previous snapshot
3. Deploy previous backend version
4. Notify affected users
5. Investigate and fix issues
6. Redeploy with fixes
