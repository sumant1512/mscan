# Implementation Tasks

## Frontend (Angular)

### Navigation Component
- [x] Create side navigation component with responsive design
- [x] Implement role-based menu rendering (Super Admin vs Tenant)
- [x] Add navigation icons and labels for all features
- [x] Integrate navigation with Angular routing
- [x] Add active route highlighting
- [x] Implement collapsible/expandable navigation with submenu support

### Tenant Management (Super Admin)
- [x] Create tenant list component with table view
- [x] Create add tenant form component with validation
- [x] Create edit tenant component (reuse form)
- [x] Implement tenant status toggle (active/inactive)
- [x] Add search and filter capabilities for tenant list
- [x] Create tenant service for API calls
- [x] Add success/error notifications for tenant operations

### Credit Management
- [x] Create credit request form for tenants
- [x] Create credit request list for Super Admin approval
- [x] Implement approval/rejection workflow UI
- [x] Create credit balance display component for tenants
- [x] Create credit history view for both roles
- [x] Create credit service for API calls
- [x] Add real-time credit balance updates

### Rewards System
- [x] Create verification app configuration form for tenants
- [x] Create coupon generation form with all parameters
- [x] Create coupon list/management component
- [x] Implement QR code generation for coupons
- [x] Create scan interface for verification
- [x] Create scan history/analytics view
- [x] Create rewards service for API calls
- [x] Add coupon validation before creation (check credits)

### Dashboard Integration
- [x] Update Super Admin dashboard with new features
- [x] Update Tenant dashboard with rewards widgets
- [x] Add credit balance widget to tenant dashboard
- [x] Add recent activity feeds

## Backend (Node.js + PostgreSQL)

### Database Schema
- [x] Create tenants table with status tracking
- [x] Create credit_requests table with approval workflow
- [x] Create credit_transactions table for audit trail
- [x] Create verification_apps table for tenant app configs
- [x] Create coupons table with all parameters
- [x] Create scans table for tracking usage
- [x] Add foreign keys and indexes
- [x] Create database migration script

### Tenant Management API
- [x] Create POST /api/tenants endpoint (Super Admin only)
- [x] Create GET /api/tenants endpoint with pagination
- [x] Create GET /api/tenants/:id endpoint
- [x] Create PUT /api/tenants/:id endpoint
- [x] Create PATCH /api/tenants/:id/status endpoint
- [x] Add role-based authorization middleware
- [x] Add validation for tenant data

### Credit Management API
- [x] Create POST /api/credits/request endpoint (Tenant)
- [x] Create GET /api/credits/requests endpoint (Super Admin)
- [x] Create GET /api/credits/requests/my endpoint (Tenant)
- [x] Create POST /api/credits/approve/:id endpoint (Super Admin)
- [x] Create POST /api/credits/reject/:id endpoint (Super Admin)
- [x] Create GET /api/credits/balance endpoint (Tenant)
- [x] Create GET /api/credits/transactions endpoint
- [x] Add credit deduction logic for coupon creation
- [x] Add validation for credit amounts

### Rewards System API
- [x] Create POST /api/verification-apps endpoint (Tenant)
- [x] Create GET /api/verification-apps endpoint (Tenant)
- [x] Create PUT /api/verification-apps/:id endpoint (Tenant)
- [x] Create POST /api/coupons endpoint with credit validation
- [x] Create GET /api/coupons endpoint with filters
- [x] Create GET /api/coupons/:id endpoint
- [x] ~~Create PUT /api/coupons/:id endpoint (status, etc.)~~ - REMOVED: Edit coupon feature removed
- [x] Create POST /api/scans/verify endpoint
- [x] Create GET /api/scans/history endpoint
- [x] Add QR code generation utility
- [x] Add coupon code generation utility
- [x] Add credit balance checking before coupon creation

### Middleware & Utilities
- [x] Update auth middleware for new endpoints
- [x] Add role-specific guards (isSuperAdmin, isTenant)
- [x] Create credit calculation utilities
- [x] Create coupon validation utilities
- [x] Add error handling for all new endpoints

## Testing

### Unit Tests
- [x] Test navigation component rendering
- [x] Test tenant service methods
- [x] Test credit service methods
- [x] Test rewards service methods
- [x] Test all backend controllers
- [x] Test credit calculation logic
- [x] Test coupon validation logic

### Integration Tests
- [x] Test tenant CRUD flow
- [x] Test credit request/approval workflow
- [x] Test coupon creation with credit deduction
- [ ] Test scan verification flow (CRITICAL: Missing single-use code validation)
- [x] Test authorization for role-specific endpoints

### E2E Tests
- [x] Test Super Admin tenant management flow
- [x] Test tenant credit request and approval flow
- [x] Test coupon creation and usage flow
- [x] Test navigation between features
- [x] Test role-based access restrictions

## Documentation
- [x] Update API documentation with new endpoints
- [x] Create user guide for Super Admin features
- [x] Create user guide for Tenant features
- [x] Document credit system rules and calculations
- [x] Document coupon parameter options
- [x] Update database schema documentation
