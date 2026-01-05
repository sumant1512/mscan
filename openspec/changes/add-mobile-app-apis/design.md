# Design Document: Mobile App API Suite

## Context

The MScan platform needs a complete mobile API layer to support native iOS/Android scanner applications. These apps will be used by end customers to:

1. Register and manage their profiles
2. Scan QR codes to redeem coupons
3. View their redemption history
4. Receive push notifications about new coupons

**Key Constraints**:

- Mobile apps may have intermittent connectivity (offline support needed)
- Multiple tenants will have custom-branded scanner apps
- API must be versioned for gradual app rollouts
- Security: customers should only access their own data
- Performance: optimize for mobile networks (3G/4G)

**Stakeholders**:

- Mobile app developers (iOS/Android teams)
- End customers (coupon scanners)
- Tenant admins (need analytics on mobile usage)
- Backend team (API maintenance)

## Goals / Non-Goals

**Goals**:

- Complete mobile-first API for customer operations
- Offline scanning with sync queue
- Device-specific authentication (FCM tokens)
- Mobile-optimized payloads (minimal JSON)
- Support for tenant-specific branding
- Push notification infrastructure

**Non-Goals**:

- Admin operations on mobile (use web portal)
- Tenant configuration via mobile API
- Real-time WebSocket connections (not needed)
- Video/image upload for profile pictures (Phase 2)
- In-app purchases or payments (rewards only)

## Architecture

### API Versioning Strategy

All mobile APIs use versioned paths:

```
/api/mobile/v1/*  - Version 1 (initial release)
/api/mobile/v2/*  - Future versions
```

**Versioning Policy**:

- Breaking changes require new version
- Non-breaking additions can be added to current version
- Old versions supported for 12 months minimum

### Authentication Flow

**Customer Registration & Login**:

```
1. Customer opens app → POST /api/mobile/v1/auth/register
   - Provide: phone, email, name, tenant_id
   - Returns: customer_id, temp token

2. OTP Verification → POST /api/mobile/v1/auth/verify-otp
   - Provide: phone/email, otp_code
   - Returns: access_token (JWT), refresh_token

3. Device Registration → POST /api/mobile/v1/devices
   - Provide: device_id, fcm_token, platform, model
   - Links device to customer account

4. Subsequent logins → POST /api/mobile/v1/auth/login
   - Provide: phone/email
   - Send OTP, verify, return tokens
```

**JWT Token Structure** (Mobile):

```json
{
  "customer_id": "uuid",
  "tenant_id": "uuid",
  "role": "CUSTOMER",
  "device_id": "uuid",
  "jti": "unique-token-id",
  "type": "access",
  "iat": 1234567890,
  "exp": 1234569690
}
```

**Token Lifetime**:

- Access token: 24 hours (longer than web admin)
- Refresh token: 90 days
- Refresh on app open if token expires in < 24 hours

### Database Schema

#### New Table: `customers`

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone VARCHAR(50) UNIQUE,
  email VARCHAR(255) UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  postal_code VARCHAR(20),
  profile_picture_url TEXT,
  total_scans INTEGER DEFAULT 0,
  successful_scans INTEGER DEFAULT 0,
  total_rewards_redeemed NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  last_scan_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_phone_or_email CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
```

#### New Table: `customer_devices`

```sql
CREATE TABLE customer_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL, -- UUID from mobile OS
  device_name VARCHAR(255), -- "iPhone 14 Pro", "Samsung Galaxy S23"
  platform VARCHAR(50) NOT NULL, -- 'iOS', 'Android'
  os_version VARCHAR(50),
  app_version VARCHAR(50),
  fcm_token TEXT, -- Firebase Cloud Messaging token
  apns_token TEXT, -- Apple Push Notification token
  is_active BOOLEAN DEFAULT true,
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, device_id)
);

CREATE INDEX idx_customer_devices_customer_id ON customer_devices(customer_id);
CREATE INDEX idx_customer_devices_fcm_token ON customer_devices(fcm_token);
```

#### New Table: `customer_otps`

```sql
CREATE TABLE customer_otps (
  identifier VARCHAR(255) PRIMARY KEY, -- phone or email
  otp_code VARCHAR(6) NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_otps_expires_at ON customer_otps(expires_at);
```

#### New Table: `scan_queue` (Offline Support)

```sql
CREATE TABLE scan_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES customer_devices(id) ON DELETE CASCADE,
  coupon_code VARCHAR(255) NOT NULL,
  location_lat NUMERIC(10, 8),
  location_lng NUMERIC(11, 8),
  scanned_at TIMESTAMP NOT NULL, -- When customer scanned (may be offline)
  synced_at TIMESTAMP, -- When synced to server
  sync_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  verification_result JSONB, -- Store result after verification
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_sync_status CHECK (sync_status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_scan_queue_customer_id ON scan_queue(customer_id);
CREATE INDEX idx_scan_queue_sync_status ON scan_queue(sync_status);
CREATE INDEX idx_scan_queue_synced_at ON scan_queue(synced_at);
```

#### Modified Table: `scans`

Add customer tracking:

```sql
ALTER TABLE scans ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE scans ADD COLUMN device_id UUID REFERENCES customer_devices(id) ON DELETE SET NULL;
CREATE INDEX idx_scans_customer_id ON scans(customer_id);
```

### API Endpoints

#### Authentication & Registration

```
POST   /api/mobile/v1/auth/register           - Register new tenant
POST   /api/mobile/v1/auth/request-otp        - Request OTP for login
POST   /api/mobile/v1/auth/verify-otp         - Verify OTP and login
POST   /api/mobile/v1/auth/refresh            - Refresh access token
POST   /api/mobile/v1/auth/logout             - Logout (blacklist token)
GET    /api/mobile/v1/auth/profile            - Get logged-in customer profile
```

#### Device Management

```
POST   /api/mobile/v1/devices                 - Register device
PUT    /api/mobile/v1/devices/:id             - Update device info (FCM token)
GET    /api/mobile/v1/devices                 - List customer's devices
DELETE /api/mobile/v1/devices/:id             - Unregister device
```

#### Profile Management

```
GET    /api/mobile/v1/profile                 - Get customer profile
PUT    /api/mobile/v1/profile                 - Update profile
PUT    /api/mobile/v1/profile/picture         - Update profile picture
DELETE /api/mobile/v1/profile                 - Delete account
```

#### Coupon Scanning & Redemption

```
POST   /api/mobile/v1/scan/verify             - Verify and redeem coupon (online)
POST   /api/mobile/v1/scan/queue              - Queue scan for offline processing
POST   /api/mobile/v1/scan/sync               - Sync queued scans
GET    /api/mobile/v1/scan/history            - Get customer's scan history
GET    /api/mobile/v1/scan/stats              - Get customer's redemption stats
```

#### Verification App Configuration (For Branded Apps)

```
GET    /api/mobile/v1/config/:tenant_slug     - Get tenant's verification app config
                                               - Returns branding, messages, colors
```

#### Rewards & Coupons

```
GET    /api/mobile/v1/coupons/available       - Get active coupons for tenant
GET    /api/mobile/v1/coupons/:code/details   - Get coupon details (before scanning)
```

### Offline Scanning Flow

**Problem**: Customers may scan coupons in areas with poor connectivity (warehouses, remote locations).

**Solution**: Queue-based offline scanning

```
1. Customer scans QR code while offline
   ↓
2. Mobile app stores scan locally with timestamp
   ↓
3. App attempts to call POST /api/mobile/v1/scan/queue
   - If online: Queue entry created, status = 'pending'
   - If offline: Retry on reconnect
   ↓
4. Background worker processes queue:
   - Verify coupon validity
   - Check usage limits
   - Log scan in scans table
   - Update scan_queue status
   ↓
5. App polls GET /api/mobile/v1/scan/queue/status
   or receives push notification
   ↓
6. Display result to customer
```

**Queue Processing**:

- Background job runs every 30 seconds
- Processes scans in FIFO order
- Max 1000 queued scans per customer (prevent abuse)
- Scans older than 24 hours marked as 'expired'

### Push Notifications

**Use Cases**:

- Scan verification complete (offline mode)
- New coupon available
- Coupon expiring soon
- Account security alerts

**Implementation**:

- Use Firebase Cloud Messaging (FCM) for both iOS and Android
- Store FCM tokens in `customer_devices` table
- Send notifications via `push-notification.service.js`

**Notification Payload**:

```json
{
  "notification": {
    "title": "Scan Verified!",
    "body": "Your 20% discount has been applied successfully."
  },
  "data": {
    "type": "scan_verified",
    "scan_id": "uuid",
    "coupon_code": "ABC-123",
    "discount_value": "20"
  }
}
```

### Security Considerations

**Mobile-Specific Threats**:

1. **Device Cloning**: Limit 5 devices per customer
2. **Token Theft**: Short token lifetime, device binding
3. **Replay Attacks**: Timestamp validation on scans
4. **Fake GPS**: Optional server-side location validation
5. **Root/Jailbreak**: Optional device integrity checks

**Rate Limiting** (Mobile):

- Registration: 3 attempts per hour per IP
- OTP request: 5 per hour per customer
- Scan verification: 100 per hour per customer
- API calls: 1000 per hour per device

**Data Privacy**:

- Customers can only access their own data
- Location data optional (customer consent)
- Right to delete account (GDPR compliance)
- Data export endpoint for customer data

### Performance Optimization

**Mobile Network Optimization**:

- Gzip compression for all responses
- Minimal JSON payloads (no unnecessary fields)
- Pagination for history (max 50 items)
- Image URLs instead of base64
- CDN for verification app assets

**Caching Strategy**:

- Verification app config: Cache for 24 hours
- Customer profile: Cache for 1 hour
- Active coupons list: Cache for 5 minutes

**Response Time Targets**:

- Authentication: < 500ms
- Scan verification: < 300ms (critical path)
- Profile fetch: < 200ms
- History: < 400ms

## Decisions

### Decision 1: Separate Customer Authentication from Admin Authentication

**Rationale**:

- Customers and admins have different requirements
- Customers need mobile-optimized flows (phone-first)
- Separate JWT token structure prevents privilege escalation
- Easier to scale customer base independently

**Alternatives Considered**:

- Single authentication system: Rejected due to security concerns
- OAuth2 with separate client IDs: Too complex for MVP

### Decision 2: Offline Queue Instead of Local SQLite Storage

**Rationale**:

- Server-side queue provides audit trail
- Prevents data loss if app uninstalled
- Easier to implement push notifications
- Server-side validation prevents tampering

**Alternatives Considered**:

- Full local SQLite with sync: Overengineered for MVP
- No offline support: Poor UX in low-connectivity areas

### Decision 3: Phone OR Email for Registration

**Rationale**:

- India/Asia markets prefer phone-based auth
- Western markets prefer email
- Allow both for maximum flexibility
- At least one must be provided

**Alternatives Considered**:

- Phone only: Excludes users without phone
- Email only: Poor UX in mobile-first markets

### Decision 4: API Versioning in URL Path

**Rationale**:

- Clear and explicit for mobile developers
- Easy to route to different backend versions
- Industry standard for mobile APIs
- Simplifies documentation

**Alternatives Considered**:

- Header-based versioning: Hidden from developers
- No versioning: Breaking changes impossible

## Risks / Trade-offs

### Risk 1: Offline Queue Processing Delays

**Impact**: Customers may wait for scan verification results

**Mitigation**:

- Display "Processing..." state in app
- Send push notification when complete
- Process queue every 30 seconds
- Fallback to online scanning if connection available

### Risk 2: Device Cloning/Token Sharing

**Impact**: One account used on multiple devices for fraud

**Mitigation**:

- Limit to 5 active devices per customer
- Log device changes in audit trail
- Optional device fingerprinting
- Disable token if suspicious activity detected

### Risk 3: OTP Delivery Failures

**Impact**: Customers cannot log in

**Mitigation**:

- Support both SMS and email OTP
- Retry mechanism for failed deliveries
- Admin portal to manually verify customers
- Phone support for edge cases

### Risk 4: GPS Spoofing for Location-Based Coupons

**Impact**: Customers fake location to redeem restricted coupons

**Mitigation**:

- Optional location validation (not required)
- Log location but don't block scans
- Flag suspicious patterns for tenant review
- Future: Server-side location verification

## Migration Plan

### Phase 1: API Development (Week 1-2)

1. Create database tables (customers, customer_devices, customer_otps, scan_queue)
2. Implement authentication endpoints
3. Implement device management
4. Implement scanning endpoints
5. Add unit tests

### Phase 2: Integration (Week 3)

1. Integrate FCM for push notifications
2. Implement offline queue processor
3. Add rate limiting middleware
4. API documentation (OpenAPI/Swagger)
5. Integration tests

### Phase 3: Mobile App Development (Week 4-6)

1. iOS app development
2. Android app development
3. E2E testing
4. Beta testing with sample tenants

### Phase 4: Rollout (Week 7)

1. Deploy APIs to production
2. Release mobile apps to app stores
3. Monitor performance and errors
4. Collect customer feedback

### Rollback Plan

- Keep old `/api/scans/verify` endpoint unchanged
- If critical issues, disable mobile auth temporarily
- Mobile apps can fallback to web-based scanning
- Database migrations are reversible

## Open Questions

- [ ] Should we support social login (Google, Apple)?
- [ ] Do we need biometric authentication (Face ID, fingerprint)?
- [ ] Should customers see coupons before scanning? (Discovery feature)
- [ ] Do we need customer-to-customer referral system?
- [ ] Should we support multiple languages in mobile API responses?
- [ ] Do we need customer support chat in mobile apps?
- [ ] Should we implement app-level analytics (Firebase Analytics)?

## Testing Strategy

### Unit Tests

- All controller methods
- Authentication middleware
- Offline queue processor
- Push notification service

### Integration Tests

- Registration → OTP → Login flow
- Device registration and token refresh
- Online scan verification
- Offline scan queue processing
- Profile CRUD operations

### E2E Tests (Mobile)

- Customer registration journey
- QR code scanning (simulated)
- Offline mode with sync
- Push notification delivery
- Profile management

### Performance Tests

- 1000 concurrent scan requests
- Queue processing under load
- Token refresh at scale
- API response time under 500ms

## Success Metrics

- **Adoption**: 80% of tenants enable mobile app within 3 months
- **Performance**: 99% of scans verified in < 300ms
- **Reliability**: 99.9% API uptime
- **Offline**: 95% of queued scans processed within 60 seconds
- **User Satisfaction**: 4.5+ star rating on app stores
