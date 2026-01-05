# Implementation Tasks

## 1. Database Setup
- [x] 1.1 Create PostgreSQL database schema for tenants, users, OTPs, and sessions
- [x] 1.2 Add migration scripts for database initialization
- [x] 1.3 Create seed data for initial Super Admin user
- [x] 1.4 Add indexes for OTP lookup and expiry

## 2. Backend (mscan-server) - Node.js Setup
- [x] 2.1 Initialize Node.js project with TypeScript configuration
- [x] 2.2 Set up Express.js server with basic middleware (CORS, body-parser, helmet)
- [x] 2.3 Configure PostgreSQL connection with connection pooling
- [x] 2.4 Set up environment configuration (.env) for database and JWT secrets
- [x] 2.5 Create project structure (controllers, services, models, middleware, routes)

## 3. Backend - Authentication Module
- [x] 3.1 Implement JWT token generation and validation service (access + refresh tokens)
- [x] 3.2 Create authentication middleware for protected routes
- [x] 3.3 Implement email service integration (NodeMailer or SendGrid)
- [x] 3.4 Implement OTP generation service (6-digit, 5-minute expiry)
- [x] 3.5 Implement request OTP endpoint (validates email, generates and sends OTP)
- [x] 3.6 Implement verify OTP endpoint (validates OTP and returns tokens + user type)
- [x] 3.7 Add OTP rate limiting (max 3 requests per 15 minutes per email)
- [x] 3.8 Implement token refresh endpoint that validates refresh token and issues new tokens
- [x] 3.9 Implement user context endpoint to retrieve full user information with token
- [x] 3.10 Implement logout endpoint with token invalidation (blacklist both tokens)
- [x] 3.11 Create authorization middleware for role-based access control
- [x] 3.12 Set up token blacklist mechanism (Redis or database table)

## 4. Backend - User Management Module
- [x] 4.1 Create user model with CRUD operations
- [x] 4.2 Implement customer registration endpoint (Super Admin only)
- [x] 4.3 Add email validation and duplicate check
- [x] 4.4 Implement welcome email notification for new customers
- [x] 4.5 Create user profile endpoints (GET, PUT)
- [x] 4.6 Implement tenant data isolation in database queries
- [x] 4.7 Add authorization check to restrict registration to Super Admin

## 5. Backend - Dashboard Module
- [x] 5.1 Create dashboard stats endpoint for Super Admin (tenant count, user count)
- [x] 5.2 Create dashboard stats endpoint for Tenant users (tenant-specific data)
- [x] 5.3 Implement role-based data filtering

## 6. Frontend (mscan-client) - Angular Setup
- [x] 6.1 Initialize Angular project with routing and HttpClient
- [x] 6.2 Set up Angular Material or Bootstrap for UI components
- [x] 6.3 Configure environment files for API base URL
- [x] 6.4 Create project structure (components, services, guards, interceptors, models)

## 7. Frontend - Authentication Module
- [x] 7.1 Create OTP request component with email input and validation
- [x] 7.2 Create OTP verification component with 6-digit OTP input
- [x] 7.3 Implement authentication service with OTP request and verification
- [x] 7.4 Add OTP resend functionality with rate limit display
- [x] 7.5 Implement token storage service (access + refresh tokens)
- [x] 7.6 Implement token refresh logic (automatic refresh before expiry)
- [x] 7.7 Implement user context service to fetch full user context after login
- [x] 7.8 Create HTTP interceptor to add JWT token to requests and handle 401 errors
- [x] 7.9 Implement auth guard for protected routes
- [x] 7.10 Add logout functionality and context cleanup (clear both tokens)

## 8. Frontend - Customer Registration Module (Super Admin Only)
- [x] 8.1 Create customer registration component with form (admin-protected route)
- [x] 8.2 Implement form validation for registration fields
- [x] 8.3 Create registration service to call backend API
- [x] 8.4 Add success/error notifications
- [x] 8.5 Show only in Super Admin navigation menu

## 9. Frontend - Dashboard Module
- [x] 9.1 Create Super Admin dashboard component with system-wide stats
- [x] 9.2 Create Tenant dashboard component with tenant-specific stats
- [x] 9.3 Implement dashboard service to fetch stats from backend
- [x] 9.4 Create navigation component with role-based menu items
- [x] 9.5 Display user context (name, role, tenant) in header

## 10. Frontend - Routing and Navigation
- [x] 10.1 Configure routes for OTP login, customer registration (admin only), and dashboards
- [x] 10.2 Implement role-based routing (redirect to appropriate dashboard)
- [x] 10.3 Add route guards to protect authenticated routes and admin routes
- [x] 10.4 Handle unauthorized access and token expiration

## 11. Testing
- [x] 11.1 Write unit tests for backend OTP generation and validation service
- [x] 11.2 Write unit tests for backend user management service
- [x] 11.3 Write integration tests for API endpoints (OTP request, verify, refresh)
- [x] 11.4 Test email delivery (use test email service in dev environment)
- [x] 11.5 Write unit tests for Angular authentication service
- [x] 11.6 Write unit tests for Angular components
- [x] 11.7 Perform end-to-end testing for complete OTP login flow

## 12. Documentation
- [x] 12.1 Document API endpoints (OpenAPI/Swagger)
- [x] 12.2 Create database schema diagram
- [x] 12.3 Write README for mscan-server with setup instructions
- [x] 12.4 Write README for mscan-client with setup instructions
- [x] 12.5 Document environment variables and configuration
