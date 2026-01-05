# Change: Add Navigation, Tenant Management, and Rewards System

## Why
Enhance the MSCAN platform with role-based navigation, tenant management capabilities, and a comprehensive rewards system. This enables Super Admins to manage tenants effectively, and provides tenants with tools to create verification apps, scan functionality, and manage reward coupons through a credit-based system.

## What Changes
- Add side navigation component with role-based menu items for all user types
- Implement tenant management for Super Admins (add, edit, list tenants)
- Create credit management system where tenants request credits and Super Admins approve
- Build rewards system with scan verification and coupon generation capabilities
- Enable tenants to create and configure their verification apps with various options
- Establish credit-based coupon creation with configurable parameters (discount type, value, expiry, limits)

## Impact
- Affected specs:
  - `navigation` (new) - Role-based side navigation component
  - `tenant-management` (new) - Super Admin tenant CRUD operations
  - `credit-management` (new) - Credit request/approval workflow
  - `rewards-system` (new) - Scan verification and coupon management
  - `verification-app` (new) - Tenant app configuration
  - `user-management` (modified) - Add tenant relationship
  - `dashboard` (modified) - Integrate navigation and new features
- Affected code:
  - `mscan-client/src/app/components/` - New components for navigation, tenant management, rewards
  - `mscan-client/src/app/services/` - New services for tenant, credit, rewards APIs
  - `mscan-server/src/controllers/` - New controllers for tenant, credit, rewards
  - `mscan-server/src/routes/` - New API routes
  - Database schema additions for tenants, credits, rewards, coupons, scans
  - `mscan-client/src/app/app.html` - Layout structure with side navigation

## Dependencies
- Requires completion of `add-tms-foundation` change (user authentication and basic dashboard)
- QR code generation library for scan functionality
- Coupon code generation utility

## Implementation Notes
- Credit system prevents tenants from creating coupons beyond their approved credits
- Each coupon creation deducts credits based on coupon value/type
- Scan verification validates QR codes and tracks usage
- Navigation menu dynamically updates based on user role (SUPER_ADMIN, TENANT)
- Tenant management includes status tracking (active/inactive)
