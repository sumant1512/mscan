# Change: Add TMS Foundation - Multi-tenant Customer Management and OTP Authentication

## Why
Build the foundational layer for a Transport Management System (TMS) that supports multi-tenant architecture with OTP-based authentication. This establishes secure, passwordless login via email OTP and admin-controlled customer registration for better security and user management.

## What Changes
- Add customer registration capability for Super Admin only (not self-service)
- Implement OTP-based email authentication (no passwords) for all user types
- Create multi-role authentication system supporting Super Admin and Tenant users
- Create role-based dashboards displaying user-type-specific information
- Establish initial codebase structure with mscan-server (Node.js + PostgreSQL) and mscan-client (Angular)
- Set up database schema for users, tenants, OTPs, and authentication tokens
- Integrate email service for OTP delivery

## Impact
- Affected specs: 
  - `user-management` (new) - Admin-only customer registration
  - `authentication` (new) - OTP-based email authentication
  - `dashboard` (new) - Role-based dashboards
- Affected code:
  - `mscan-server/` - New Node.js backend with PostgreSQL
  - `mscan-client/` - New Angular frontend application
  - Database schema for users, tenants, and OTP storage
  - Email service integration (NodeMailer/SendGrid)
