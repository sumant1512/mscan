# Change: Add Complete Mobile App API Suite

## Why

The MScan system currently has web-based admin interfaces for tenant management and coupon operations. However, there is no dedicated mobile API suite for end-user scanner applications. Mobile apps need a complete set of APIs for:
- Customer registration and profile management
- QR code scanning and coupon redemption
- Scan history and rewards tracking
- Device management and push notifications
- Offline mode support

This change creates a comprehensive mobile-first API layer to power native iOS/Android scanner applications that customers will use to redeem coupons.

## What Changes

- **NEW**: Mobile customer registration and authentication flow
- **NEW**: Mobile-optimized profile management APIs
- **NEW**: Enhanced coupon scanning with mobile features (GPS, camera, offline queue)
- **NEW**: Customer scan history and rewards dashboard
- **NEW**: Device registration and push notification support
- **NEW**: API versioning for mobile app updates
- **MODIFIED**: Existing `/api/scans/verify` endpoint enhanced for mobile use cases
- **NEW**: Mobile app configuration endpoint for tenant customization

## Impact

- **Affected specs**: 
  - NEW: `mobile-authentication` (customer-facing authentication)
  - NEW: `mobile-scanner` (scanning and redemption operations)
  - NEW: `mobile-profile` (customer profile management)
  - MODIFIED: `rewards-system` (enhanced scan verification)

- **Affected code**:
  - Backend: New `mobile.routes.js`, `mobile-auth.controller.js`, `mobile-scan.controller.js`, `mobile-profile.controller.js`
  - Database: New `customers` table, `customer_devices` table, `scan_queue` table
  - Services: New `push-notification.service.js`, `offline-sync.service.js`
  - Middleware: New `mobile-auth.middleware.js` for mobile-specific JWT validation

- **API Changes**: All new endpoints under `/api/mobile/v1/*` namespace

- **Breaking Changes**: None (all new endpoints)

## Success Criteria

- [ ] Mobile apps can register customers and manage profiles
- [ ] Scanner apps can scan QR codes and redeem coupons offline
- [ ] Customers can view their scan history and rewards
- [ ] Push notifications work for coupon updates
- [ ] API supports versioning for backward compatibility
