# Mobile App API Suite - OpenSpec Summary

## 📱 Overview

This OpenSpec defines a **complete mobile-first API suite** for native iOS/Android scanner applications. The APIs enable end customers to register, authenticate, scan QR codes, manage profiles, and redeem coupons through mobile apps.

## 📂 Structure

- **[proposal.md](./proposal.md)** - Change proposal (why, what, impact)
- **[design.md](./design.md)** - Technical design decisions and architecture
- **[tasks.md](./tasks.md)** - Complete implementation checklist (280+ tasks)
- **specs/** - Capability specifications with requirements and scenarios

## 🎯 Key Features

### 1. Mobile Authentication (`specs/mobile-authentication/spec.md`)
- Customer registration with phone OR email
- OTP-based login (SMS/Email)
- JWT token management (24h access, 90d refresh)
- Multi-device support (max 5 devices)
- Logout and session management

**API Endpoints**: 7 endpoints
- POST /api/mobile/v1/auth/register
- POST /api/mobile/v1/auth/request-otp
- POST /api/mobile/v1/auth/verify-otp
- POST /api/mobile/v1/auth/refresh
- POST /api/mobile/v1/auth/logout
- GET /api/mobile/v1/auth/profile

### 2. Mobile Scanner (`specs/mobile-scanner/spec.md`)
- Real-time QR code scanning and redemption
- Offline scanning with queue-based sync
- Scan history with pagination and filters
- Redemption statistics and analytics
- Available coupons discovery
- Tenant-specific branding configuration

**API Endpoints**: 9 endpoints
- POST /api/mobile/v1/scan/verify (online)
- POST /api/mobile/v1/scan/queue (offline)
- GET /api/mobile/v1/scan/queue/status
- GET /api/mobile/v1/scan/history
- GET /api/mobile/v1/scan/stats
- GET /api/mobile/v1/coupons/available
- GET /api/mobile/v1/config/:tenant_slug
- POST /api/mobile/v1/scan/export

### 3. Mobile Profile (`specs/mobile-profile/spec.md`)
- Complete profile management (view/edit)
- Phone/email update with OTP verification
- Profile picture upload (max 5MB, resize to 512x512)
- Device management (register/unregister)
- Push notification preferences
- Session management (view/logout by device)
- Account deletion (GDPR compliance)
- Data export (GDPR compliance)

**API Endpoints**: 15 endpoints
- GET/PUT /api/mobile/v1/profile
- PUT /api/mobile/v1/profile/phone (+ verify)
- PUT /api/mobile/v1/profile/email (+ verify)
- POST/DELETE /api/mobile/v1/profile/picture
- GET/POST/PUT/DELETE /api/mobile/v1/devices
- GET/PUT /api/mobile/v1/profile/notifications
- GET /api/mobile/v1/profile/sessions
- POST /api/mobile/v1/profile/export
- DELETE /api/mobile/v1/profile

## 🗄️ Database Changes

### New Tables:
1. **`customers`** - Customer accounts (phone, email, profile, stats)
2. **`customer_devices`** - Registered devices (FCM tokens, device info)
3. **`customer_otps`** - Customer OTP codes (separate from admin)
4. **`scan_queue`** - Offline scan queue for sync

### Modified Tables:
- **`scans`** - Added customer_id and device_id columns

## 🏗️ Architecture Highlights

- **API Versioning**: `/api/mobile/v1/*` (supports future versions)
- **Offline Support**: Queue-based scanning with background processing
- **Push Notifications**: Firebase Cloud Messaging integration
- **Security**: JWT tokens with device binding, rate limiting
- **GDPR**: Data export and account deletion (right to erasure)
- **Multi-tenant**: Tenant-specific branding and isolation

## 📊 API Statistics

- **Total Endpoints**: 31 REST APIs
- **Authentication**: OTP-based (no passwords)
- **Token Lifetime**: 24h access, 90d refresh
- **Rate Limits**: 
  - Registration: 3/hour per IP
  - OTP requests: 5/hour per identifier
  - Scans: 100/hour per customer
  - API calls: 1000/hour per device

## 🔒 Security Features

- Cryptographically secure OTP generation
- JWT tokens with device binding
- Rate limiting on all endpoints
- Token blacklisting on logout
- Device limit enforcement (max 5)
- CORS configuration for mobile
- HTTPS required for all APIs

## 📦 Dependencies

### New NPM Packages:
- `firebase-admin` - Push notifications (FCM)
- `multer` - File uploads
- `sharp` - Image processing/resizing
- `express-rate-limit` - Rate limiting
- `express-validator` - Request validation
- `node-cron` - Background jobs

### External Services:
- **Firebase Cloud Messaging** - Push notifications
- **AWS S3 (or similar)** - Profile picture storage
- **SMS Provider** - OTP delivery via SMS

## 📅 Implementation Phases

### Phase 1: Core APIs (Week 1-2)
- Database migrations
- Authentication endpoints
- Profile management
- Device management

### Phase 2: Scanning (Week 2-3)
- Real-time scan verification
- Offline queue system
- Queue processor
- Push notifications

### Phase 3: Testing & Docs (Week 3-4)
- Unit tests (80%+ coverage)
- Integration tests
- E2E tests
- API documentation (OpenAPI/Swagger)
- Mobile SDK documentation

### Phase 4: Mobile Apps (Week 4-6)
- iOS app development
- Android app development
- Beta testing

### Phase 5: Launch (Week 7)
- Production deployment
- App store releases
- Monitoring setup

## ✅ Success Criteria

- [ ] Mobile apps can register and authenticate customers
- [ ] Scanner apps work offline with queue sync
- [ ] Customers can view scan history and stats
- [ ] Push notifications work reliably (95%+ delivery)
- [ ] API response times < 300ms for scans
- [ ] 99.9% API uptime
- [ ] GDPR compliance (export & deletion)

## 📖 Related Documentation

- **Design Document**: [design.md](./design.md) - Architecture, decisions, risks
- **Implementation Tasks**: [tasks.md](./tasks.md) - 280+ checklist items
- **API Specifications**:
  - [mobile-authentication/spec.md](./specs/mobile-authentication/spec.md)
  - [mobile-scanner/spec.md](./specs/mobile-scanner/spec.md)
  - [mobile-profile/spec.md](./specs/mobile-profile/spec.md)

## 🚀 Getting Started

1. **Review Proposal**: Read [proposal.md](./proposal.md) for overview
2. **Review Design**: Read [design.md](./design.md) for technical details
3. **Review Specs**: Read all spec files for detailed requirements
4. **Start Implementation**: Follow [tasks.md](./tasks.md) checklist
5. **Test**: Write tests as you implement each module
6. **Deploy**: Follow deployment guide in design.md

## 📝 Notes

- All APIs use JSON request/response format
- Mobile-optimized payloads (minimal data)
- Gzip compression enabled
- Response time targets: < 300ms for scans, < 500ms for others
- Offline queue processing: Every 30 seconds
- OTP expiry: 5 minutes
- Max devices per customer: 5
- Max queued scans: 1000 per customer
- Profile picture max size: 5MB
- Supported image formats: JPEG, PNG

## 🤝 API Contract Examples

### Registration Flow:
```
1. POST /api/mobile/v1/auth/register
   → Returns: temp_token + "OTP sent"
   
2. POST /api/mobile/v1/auth/verify-otp
   → Returns: access_token + refresh_token + customer profile
   
3. POST /api/mobile/v1/devices
   → Register device for push notifications
```

### Scanning Flow (Online):
```
1. POST /api/mobile/v1/scan/verify
   → Returns: scan_id + coupon details + discount
```

### Scanning Flow (Offline):
```
1. Scan QR code (store locally)
2. POST /api/mobile/v1/scan/queue (when online)
   → Returns: queue_ids
3. Background processor verifies queued scans
4. Customer receives push notification with result
```

## 🐛 Known Limitations

- Max 5 devices per customer (can be increased)
- Max 1000 queued scans per customer (prevent abuse)
- Scans older than 24 hours marked as expired
- Profile pictures limited to 5MB
- No video uploads (Phase 2)
- No social login (Phase 2)
- No biometric auth (Phase 2)

## 📞 Support

For questions or issues with this OpenSpec:
1. Review the design document for architecture decisions
2. Check the specification files for requirements
3. Refer to the tasks checklist for implementation order
4. Contact the backend team for API development
5. Contact the mobile team for iOS/Android development

---

**Created**: January 3, 2026  
**Status**: Proposal Ready for Review  
**Total Implementation Time**: ~7 weeks (backend + mobile apps)
