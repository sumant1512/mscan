# Implementation Tasks: Mobile App API Suite

## 1. Database Schema

### 1.1 Create Customers Table
- [x] 1.1.1 Create `customers` table with all fields (id, tenant_id, phone, email, full_name, etc.)
- [x] 1.1.2 Add indexes on tenant_id, phone, email
- [x] 1.1.3 Add UNIQUE constraint on phone and email
- [x] 1.1.4 Add CHECK constraint (phone OR email must be provided)
- [ ] 1.1.5 Add trigger for auto-updating updated_at timestamp
- [x] 1.1.6 Add ON DELETE CASCADE for tenant_id foreign key

### 1.2 Create Customer Devices Table
- [x] 1.2.1 Create `customer_devices` table with all fields
- [x] 1.2.2 Add indexes on customer_id, fcm_token
- [x] 1.2.3 Add UNIQUE constraint on (customer_id, device_id)
- [x] 1.2.4 Add ON DELETE CASCADE for customer_id foreign key
- [ ] 1.2.5 Add trigger for auto-updating updated_at timestamp

### 1.3 Create Customer OTPs Table
- [x] 1.3.1 Create `customer_otps` table (separate from admin otps)
- [x] 1.3.2 Add index on expires_at for cleanup queries
- [x] 1.3.3 Add tenant_id foreign key reference

### 1.4 Create Scan Queue Table
- [ ] 1.4.1 Create `scan_queue` table for offline scanning support
- [ ] 1.4.2 Add indexes on customer_id, sync_status, synced_at
- [ ] 1.4.3 Add CHECK constraint for sync_status enum
- [ ] 1.4.4 Add foreign keys for customer_id and device_id

### 1.5 Modify Existing Tables
- [ ] 1.5.1 ALTER TABLE `scans` ADD COLUMN customer_id UUID REFERENCES customers(id)
- [ ] 1.5.2 ALTER TABLE `scans` ADD COLUMN device_id UUID REFERENCES customer_devices(id)
- [ ] 1.5.3 Create index on scans.customer_id

### 1.6 Database Migration Script
- [ ] 1.6.1 Create migration file: `add-mobile-customer-tables.sql`
- [ ] 1.6.2 Add rollback script for migration
- [x] 1.6.3 Test migration on dev database
- [ ] 1.6.4 Document migration steps in README

## 2. Backend - Mobile Authentication Module

### 2.1 Customer Registration
- [ ] 2.1.1 Create `mobile-auth.controller.js`
- [ ] 2.1.2 Implement POST /api/mobile/v1/auth/register endpoint
- [ ] 2.1.3 Validate phone OR email is provided
- [ ] 2.1.4 Check for duplicate phone/email
- [ ] 2.1.5 Generate 6-digit OTP using crypto.randomInt()
- [ ] 2.1.6 Store OTP in customer_otps table with 5-minute expiry
- [ ] 2.1.7 Send OTP via SMS (phone) or email
- [ ] 2.1.8 Return temp token (valid 10 minutes, only for OTP verification)
- [ ] 2.1.9 Add rate limiting (3 registrations per hour per IP)
- [ ] 2.1.10 Add unit tests for registration logic
- [ ] 2.1.11 Add integration tests for registration flow

### 2.2 OTP Verification & Login
- [x] 2.2.1 Implement POST /api/mobile/v1/auth/verify-otp endpoint
- [x] 2.2.2 Validate OTP code (max 3 attempts)
- [x] 2.2.3 Check OTP expiry (5 minutes)
- [x] 2.2.4 Mark OTP as used after successful verification
- [x] 2.2.5 Generate JWT access token (24-hour expiry)
- [x] 2.2.6 Generate JWT refresh token (90-day expiry)
- [x] 2.2.7 Include customer_id, tenant_id, role=CUSTOMER in JWT payload
- [x] 2.2.8 Mark phone/email as verified
- [x] 2.2.9 Return tokens + customer profile
- [ ] 2.2.10 Add unit tests for OTP verification
- [x] 2.2.11 Add integration tests for login flow

### 2.3 Customer Login (Existing Users)
- [x] 2.3.1 Implement POST /api/mobile/v1/auth/request-otp endpoint
- [ ] 2.3.2 Verify phone/email exists in customers table
- [x] 2.3.3 Generate new OTP
- [ ] 2.3.4 Send OTP via SMS/email
- [x] 2.3.5 Return success message with masked identifier
- [ ] 2.3.6 Add rate limiting (5 OTP requests per hour per identifier)
- [ ] 2.3.7 Add unit tests for OTP request

### 2.4 Token Refresh
- [x] 2.4.1 Implement POST /api/mobile/v1/auth/refresh endpoint
- [x] 2.4.2 Validate refresh token signature
- [x] 2.4.3 Check if refresh token is blacklisted
- [ ] 2.4.4 Check refresh token expiry (90 days)
- [x] 2.4.5 Generate new access token and refresh token
- [ ] 2.4.6 Blacklist old refresh token
- [x] 2.4.7 Return new tokens
- [ ] 2.4.8 Add unit tests for token refresh

### 2.5 Customer Logout
- [ ] 2.5.1 Implement POST /api/mobile/v1/auth/logout endpoint
- [ ] 2.5.2 Blacklist access token (add to token_blacklist table)
- [ ] 2.5.3 Blacklist refresh token
- [ ] 2.5.4 Support logout_all_devices parameter
- [ ] 2.5.5 If logout_all: blacklist all customer tokens
- [ ] 2.5.6 Mark device(s) as inactive
- [ ] 2.5.7 Add unit tests for logout

### 2.6 Mobile Authentication Middleware
- [ ] 2.6.1 Create `mobile-auth.middleware.js`
- [ ] 2.6.2 Implement JWT token validation for mobile
- [ ] 2.6.3 Verify role === 'CUSTOMER' in token
- [ ] 2.6.4 Check token is not blacklisted
- [ ] 2.6.5 Attach customer_id to req.customer
- [ ] 2.6.6 Add device_id validation (optional)
- [ ] 2.6.7 Add unit tests for middleware

### 2.7 Customer Profile Endpoint
- [ ] 2.7.1 Implement GET /api/mobile/v1/auth/profile
- [ ] 2.7.2 Return customer profile with statistics
- [ ] 2.7.3 Include total_scans, successful_scans, rewards_redeemed
- [ ] 2.7.4 Add unit tests

## 3. Backend - Mobile Profile Module

### 3.1 Profile Viewing
- [ ] 3.1.1 Create `mobile-profile.controller.js`
- [ ] 3.1.2 Implement GET /api/mobile/v1/profile
- [ ] 3.1.3 Return complete customer profile
- [ ] 3.1.4 Include tenant name and verification status
- [ ] 3.1.5 Add unit tests

### 3.2 Profile Editing
- [ ] 3.2.1 Implement PUT /api/mobile/v1/profile
- [ ] 3.2.2 Support partial updates (only provided fields)
- [ ] 3.2.3 Validate input (postal code format, date format)
- [ ] 3.2.4 Update customer record in database
- [ ] 3.2.5 Return updated profile
- [ ] 3.2.6 Add unit tests for profile updates

### 3.3 Phone Number Update
- [ ] 3.3.1 Implement PUT /api/mobile/v1/profile/phone
- [ ] 3.3.2 Check new phone is not already registered
- [ ] 3.3.3 Generate OTP for new phone
- [ ] 3.3.4 Send OTP via SMS
- [ ] 3.3.5 Mark phone_verified = false
- [ ] 3.3.6 Implement POST /api/mobile/v1/profile/phone/verify
- [ ] 3.3.7 Verify OTP and update phone_verified = true
- [ ] 3.3.8 Add unit tests

### 3.4 Email Update
- [ ] 3.4.1 Implement PUT /api/mobile/v1/profile/email
- [ ] 3.4.2 Check new email is not already registered
- [ ] 3.4.3 Generate OTP for new email
- [ ] 3.4.4 Send OTP via email
- [ ] 3.4.5 Mark email_verified = false
- [ ] 3.4.6 Implement POST /api/mobile/v1/profile/email/verify
- [ ] 3.4.7 Verify OTP and update email_verified = true
- [ ] 3.4.8 Add unit tests

### 3.5 Profile Picture Upload
- [ ] 3.5.1 Install multer for file uploads: `npm install multer`
- [ ] 3.5.2 Install sharp for image processing: `npm install sharp`
- [ ] 3.5.3 Create image upload service: `image-upload.service.js`
- [ ] 3.5.4 Implement POST /api/mobile/v1/profile/picture
- [ ] 3.5.5 Validate file type (JPEG, PNG only)
- [ ] 3.5.6 Validate file size (max 5MB)
- [ ] 3.5.7 Resize image to 512x512 using sharp
- [ ] 3.5.8 Upload to cloud storage (AWS S3 or similar)
- [ ] 3.5.9 Generate CDN URL
- [ ] 3.5.10 Update customer.profile_picture_url
- [ ] 3.5.11 Implement DELETE /api/mobile/v1/profile/picture
- [ ] 3.5.12 Delete image from cloud storage
- [ ] 3.5.13 Set profile_picture_url to NULL
- [ ] 3.5.14 Add unit tests for image upload

### 3.6 Device Management
- [ ] 3.6.1 Implement GET /api/mobile/v1/devices (list devices)
- [ ] 3.6.2 Implement POST /api/mobile/v1/devices (register device)
- [ ] 3.6.3 Check device limit (max 5 per customer)
- [ ] 3.6.4 Store device_id, platform, OS version, app version
- [ ] 3.6.5 Store FCM/APNS token
- [ ] 3.6.6 Implement PUT /api/mobile/v1/devices/:id (update device)
- [ ] 3.6.7 Implement DELETE /api/mobile/v1/devices/:id (unregister)
- [ ] 3.6.8 Blacklist device tokens on unregister
- [ ] 3.6.9 Add unit tests for device management

### 3.7 Notification Preferences
- [ ] 3.7.1 Add notification preferences to customer_devices or separate table
- [ ] 3.7.2 Implement GET /api/mobile/v1/profile/notifications
- [ ] 3.7.3 Implement PUT /api/mobile/v1/profile/notifications
- [ ] 3.7.4 Support granular preferences (new_coupon_alerts, scan_results, etc.)
- [ ] 3.7.5 Add unit tests

### 3.8 Session Management
- [ ] 3.8.1 Implement GET /api/mobile/v1/profile/sessions
- [ ] 3.8.2 Return all devices with active tokens
- [ ] 3.8.3 Include last_active_at, login IP, device info
- [ ] 3.8.4 Implement DELETE /api/mobile/v1/profile/sessions/:device_id
- [ ] 3.8.5 Blacklist tokens for specific device
- [ ] 3.8.6 Send security alert to customer
- [ ] 3.8.7 Add unit tests

### 3.9 Account Deletion
- [ ] 3.9.1 Implement DELETE /api/mobile/v1/profile
- [ ] 3.9.2 Require confirmation: "DELETE" string in request body
- [ ] 3.9.3 Soft delete: Mark account as deleted
- [ ] 3.9.4 Anonymize personal data (hash phone, email)
- [ ] 3.9.5 Set full_name to "Deleted User"
- [ ] 3.9.6 Blacklist all tokens
- [ ] 3.9.7 Unregister all devices
- [ ] 3.9.8 Delete profile picture from cloud storage
- [ ] 3.9.9 Send confirmation email/SMS
- [ ] 3.9.10 Schedule hard delete after 30 days (cron job)
- [ ] 3.9.11 Add unit tests

### 3.10 Data Export
- [ ] 3.10.1 Implement POST /api/mobile/v1/profile/export
- [ ] 3.10.2 Generate JSON file with all customer data
- [ ] 3.10.3 Include profile, scans, devices, preferences
- [ ] 3.10.4 Upload to temporary cloud storage
- [ ] 3.10.5 Return signed download URL (24-hour expiry)
- [ ] 3.10.6 Log export event
- [ ] 3.10.7 Add unit tests

## 4. Backend - Mobile Scanner Module

### 4.1 Real-time Scan Verification
- [ ] 4.1.1 Create `mobile-scan.controller.js`
- [ ] 4.1.2 Implement POST /api/mobile/v1/scan/verify
- [ ] 4.1.3 Validate coupon_code
- [ ] 4.1.4 Check coupon status (active, not expired, not exhausted)
- [ ] 4.1.5 Check usage limits (total and per-user)
- [ ] 4.1.6 Increment coupon usage count
- [ ] 4.1.7 Log scan in scans table with customer_id and device_id
- [ ] 4.1.8 Update customer statistics (total_scans, successful_scans)
- [ ] 4.1.9 Return success with discount details
- [ ] 4.1.10 Handle failed scans (expired, inactive, exhausted)
- [ ] 4.1.11 Store GPS location if provided (optional)
- [ ] 4.1.12 Add rate limiting (100 scans per hour per customer)
- [ ] 4.1.13 Add unit tests for scan verification
- [ ] 4.1.14 Add integration tests for various scan scenarios

### 4.2 Offline Scan Queue
- [ ] 4.2.1 Implement POST /api/mobile/v1/scan/queue
- [ ] 4.2.2 Accept array of queued scans
- [ ] 4.2.3 Create scan_queue entries with status = 'pending'
- [ ] 4.2.4 Validate scanned_at timestamp (not more than 24 hours old)
- [ ] 4.2.5 Check queue limit (max 1000 queued scans per customer)
- [ ] 4.2.6 Return queue_ids for tracking
- [ ] 4.2.7 Add unit tests

### 4.3 Queue Processing Service
- [ ] 4.3.1 Create `queue-processor.service.js`
- [ ] 4.3.2 Implement background worker (runs every 30 seconds)
- [ ] 4.3.3 Fetch pending scan_queue entries (FIFO order)
- [ ] 4.3.4 Verify coupon at time of scanned_at timestamp
- [ ] 4.3.5 Check if coupon was active at that time
- [ ] 4.3.6 Create scan record with correct timestamp
- [ ] 4.3.7 Update scan_queue status (completed/failed)
- [ ] 4.3.8 Store verification result in scan_queue.verification_result
- [ ] 4.3.9 Mark scans older than 24 hours as 'expired'
- [ ] 4.3.10 Add retry logic (3 attempts with exponential backoff)
- [ ] 4.3.11 Add unit tests for queue processor

### 4.4 Queue Status Checking
- [ ] 4.4.1 Implement GET /api/mobile/v1/scan/queue/status
- [ ] 4.4.2 Accept comma-separated queue_ids
- [ ] 4.4.3 Return status and verification_result for each
- [ ] 4.4.4 Add unit tests

### 4.5 Scan History
- [ ] 4.5.1 Implement GET /api/mobile/v1/scan/history
- [ ] 4.5.2 Filter by customer_id (from JWT token)
- [ ] 4.5.3 Support pagination (page, limit)
- [ ] 4.5.4 Support filtering by status (success, failed, expired)
- [ ] 4.5.5 Support date range filtering (from_date, to_date)
- [ ] 4.5.6 Return scan details with coupon info
- [ ] 4.5.7 Sort by scanned_at DESC (most recent first)
- [ ] 4.5.8 Add unit tests

### 4.6 Scan Statistics
- [ ] 4.6.1 Implement GET /api/mobile/v1/scan/stats
- [ ] 4.6.2 Calculate total_scans, successful_scans, failed_scans
- [ ] 4.6.3 Calculate total_rewards_redeemed (sum of discount values)
- [ ] 4.6.4 Generate monthly breakdown
- [ ] 4.6.5 Return last_scan_at timestamp
- [ ] 4.6.6 Add unit tests

### 4.7 Available Coupons Discovery
- [ ] 4.7.1 Implement GET /api/mobile/v1/coupons/available
- [ ] 4.7.2 Filter by tenant_id (from JWT token)
- [ ] 4.7.3 Filter by status = 'active'
- [ ] 4.7.4 Exclude expired coupons (expiry_date > NOW)
- [ ] 4.7.5 Exclude exhausted coupons
- [ ] 4.7.6 Support pagination
- [ ] 4.7.7 Support filtering (expiring_soon, high_value)
- [ ] 4.7.8 Sort by expiry_date ASC (expiring soon first)
- [ ] 4.7.9 Exclude coupon_code and QR code (prevent sharing)
- [ ] 4.7.10 Add unit tests

### 4.8 Verification App Config
- [ ] 4.8.1 Implement GET /api/mobile/v1/config/:tenant_slug (public)
- [ ] 4.8.2 Fetch verification_apps for tenant
- [ ] 4.8.3 Return branding configuration (logo, colors, messages)
- [ ] 4.8.4 Return support contact info
- [ ] 4.8.5 Cache response for 24 hours
- [ ] 4.8.6 Add unit tests

### 4.9 Scan Data Export
- [ ] 4.9.1 Implement POST /api/mobile/v1/scan/export
- [ ] 4.9.2 Generate CSV file with scan history
- [ ] 4.9.3 Include date, time, coupon_code, discount, status, location
- [ ] 4.9.4 Upload to temporary cloud storage
- [ ] 4.9.5 Return signed download URL (24-hour expiry)
- [ ] 4.9.6 Add unit tests

## 5. Push Notification Service

### 5.1 FCM Integration
- [ ] 5.1.1 Install Firebase Admin SDK: `npm install firebase-admin`
- [ ] 5.1.2 Create `push-notification.service.js`
- [ ] 5.1.3 Initialize Firebase Admin with service account
- [ ] 5.1.4 Implement sendNotification(device_tokens, payload)
- [ ] 5.1.5 Handle invalid/expired FCM tokens
- [ ] 5.1.6 Remove invalid tokens from customer_devices
- [ ] 5.1.7 Add retry logic for failed notifications
- [ ] 5.1.8 Add unit tests

### 5.2 Notification Triggers
- [ ] 5.2.1 Send notification on queued scan completion
- [ ] 5.2.2 Send notification for new coupon (optional feature)
- [ ] 5.2.3 Send notification for coupon expiry reminder
- [ ] 5.2.4 Send notification for account security alerts
- [ ] 5.2.5 Check customer notification preferences before sending
- [ ] 5.2.6 Add unit tests

### 5.3 Notification Templates
- [ ] 5.3.1 Create notification templates for each type
- [ ] 5.3.2 Scan verified: "Your {discount} has been applied!"
- [ ] 5.3.3 Scan failed: "Coupon verification failed: {reason}"
- [ ] 5.3.4 New coupon: "New {discount} coupon available!"
- [ ] 5.3.5 Expiry reminder: "Your coupon expires in {days} days"
- [ ] 5.3.6 Security alert: "New login detected on {device}"

## 6. API Routes & Middleware

### 6.1 Mobile Routes File
- [x] 6.1.1 Create `mobile.routes.js`
- [x] 6.1.2 Define all mobile API routes with /api/mobile/v1 prefix
- [ ] 6.1.3 Apply mobile authentication middleware to protected routes
- [ ] 6.1.4 Apply rate limiting middleware
- [ ] 6.1.5 Add request validation middleware
- [x] 6.1.6 Register routes in main server.js

### 6.2 Rate Limiting
- [ ] 6.2.1 Install express-rate-limit: `npm install express-rate-limit`
- [ ] 6.2.2 Create mobile-specific rate limiters
- [ ] 6.2.3 Registration: 3 per hour per IP
- [ ] 6.2.4 OTP request: 5 per hour per identifier
- [ ] 6.2.5 Scan verification: 100 per hour per customer
- [ ] 6.2.6 General API calls: 1000 per hour per device

### 6.3 Request Validation
- [ ] 6.3.1 Install express-validator: `npm install express-validator`
- [ ] 6.3.2 Create validation schemas for each endpoint
- [ ] 6.3.3 Validate phone number format (E.164)
- [ ] 6.3.4 Validate email format
- [ ] 6.3.5 Validate UUID formats
- [ ] 6.3.6 Validate date formats (ISO 8601)
- [ ] 6.3.7 Add custom validation for OTP (6 digits)

### 6.4 Error Handling
- [ ] 6.4.1 Create mobile-specific error responses
- [ ] 6.4.2 Standardize error format: {success: false, error, message}
- [ ] 6.4.3 Add error codes for mobile app handling
- [ ] 6.4.4 Log errors with context (customer_id, device_id)

## 7. Background Jobs & Cron Tasks

### 7.1 Queue Processor Cron
- [ ] 7.1.1 Install node-cron: `npm install node-cron`
- [ ] 7.1.2 Create cron job to run queue processor every 30 seconds
- [ ] 7.1.3 Add job monitoring and logging
- [ ] 7.1.4 Add error handling and recovery

### 7.2 OTP Cleanup Cron
- [ ] 7.2.1 Create cron job to delete expired OTPs (runs daily)
- [ ] 7.2.2 Delete customer_otps where expires_at < NOW() - 1 day

### 7.3 Token Cleanup Cron
- [ ] 7.3.1 Create cron job to remove expired blacklisted tokens (runs daily)
- [ ] 7.3.2 Delete from token_blacklist where expires_at < NOW()

### 7.4 Hard Delete Cron
- [ ] 7.4.1 Create cron job to hard delete customers (runs daily)
- [ ] 7.4.2 Permanently delete customers marked deleted > 30 days ago

### 7.5 Expiry Reminder Cron
- [ ] 7.5.1 Create cron job to send coupon expiry reminders (runs daily)
- [ ] 7.5.2 Find active coupons expiring in 3 days
- [ ] 7.5.3 Send push notifications to customers with preferences enabled

## 8. Testing

### 8.1 Unit Tests
- [ ] 8.1.1 Write unit tests for mobile-auth.controller.js
- [ ] 8.1.2 Write unit tests for mobile-profile.controller.js
- [ ] 8.1.3 Write unit tests for mobile-scan.controller.js
- [ ] 8.1.4 Write unit tests for queue-processor.service.js
- [ ] 8.1.5 Write unit tests for push-notification.service.js
- [ ] 8.1.6 Write unit tests for mobile-auth.middleware.js
- [ ] 8.1.7 Achieve 80%+ code coverage

### 8.2 Integration Tests
- [ ] 8.2.1 Test complete registration → OTP → login flow
- [ ] 8.2.2 Test profile update flows (phone, email, picture)
- [ ] 8.2.3 Test real-time scan verification
- [ ] 8.2.4 Test offline queue processing
- [ ] 8.2.5 Test device registration and management
- [ ] 8.2.6 Test token refresh flow
- [ ] 8.2.7 Test account deletion flow

### 8.3 E2E Tests (Mobile API)
- [ ] 8.3.1 Create E2E test suite for mobile APIs
- [ ] 8.3.2 Test customer registration journey
- [ ] 8.3.3 Test coupon scanning (online mode)
- [ ] 8.3.4 Test offline scan queue and sync
- [ ] 8.3.5 Test scan history retrieval
- [ ] 8.3.6 Test profile management
- [ ] 8.3.7 Test device management
- [ ] 8.3.8 Test data export and account deletion

### 8.4 Load Testing
- [ ] 8.4.1 Test 10,000 concurrent scan requests
- [ ] 8.4.2 Test queue processing under load (10,000 queued scans)
- [ ] 8.4.3 Test token refresh at scale
- [ ] 8.4.4 Verify response times under load (< 500ms)

## 9. Documentation

### 9.1 API Documentation
- [ ] 9.1.1 Create OpenAPI/Swagger spec for mobile APIs
- [ ] 9.1.2 Document all endpoints with request/response examples
- [ ] 9.1.3 Document authentication flow
- [ ] 9.1.4 Document error codes and messages
- [ ] 9.1.5 Host API docs on Swagger UI

### 9.2 Mobile SDK Documentation
- [ ] 9.2.1 Create mobile integration guide
- [ ] 9.2.2 Document JWT token handling
- [ ] 9.2.3 Document offline scanning implementation
- [ ] 9.2.4 Document push notification setup (FCM)
- [ ] 9.2.5 Provide code samples (Swift, Kotlin)

### 9.3 Database Documentation
- [ ] 9.3.1 Update DATABASE_SCHEMA.md with new tables
- [ ] 9.3.2 Document customer, customer_devices, customer_otps, scan_queue
- [ ] 9.3.3 Create ERD diagram including mobile tables

### 9.4 Deployment Guide
- [ ] 9.4.1 Document environment variables for mobile APIs
- [ ] 9.4.2 Document FCM setup (Firebase project, service account)
- [ ] 9.4.3 Document cloud storage setup (AWS S3 for profile pictures)
- [ ] 9.4.4 Document cron job setup

## 10. Security Hardening

### 10.1 Security Audit
- [ ] 10.1.1 Review JWT token security (HS256, 256-bit secret)
- [ ] 10.1.2 Review rate limiting effectiveness
- [ ] 10.1.3 Review OTP generation (cryptographically secure)
- [ ] 10.1.4 Review SQL injection prevention (parameterized queries)
- [ ] 10.1.5 Review XSS prevention
- [ ] 10.1.6 Review CORS configuration for mobile

### 10.2 GDPR Compliance
- [ ] 10.2.1 Verify data export functionality
- [ ] 10.2.2 Verify account deletion (right to erasure)
- [ ] 10.2.3 Verify data anonymization on deletion
- [ ] 10.2.4 Add privacy policy endpoint
- [ ] 10.2.5 Add terms of service endpoint
- [ ] 10.2.6 Add consent tracking for location data

### 10.3 PII Protection
- [ ] 10.3.1 Encrypt customer phone/email at rest (optional)
- [ ] 10.3.2 Mask sensitive data in logs
- [ ] 10.3.3 Use HTTPS for all mobile API endpoints
- [ ] 10.3.4 Implement token rotation on refresh

## 11. Deployment

### 11.1 Environment Configuration
- [ ] 11.1.1 Add mobile API env variables to .env.example
- [ ] 11.1.2 Configure FCM_SERVICE_ACCOUNT_PATH
- [ ] 11.1.3 Configure AWS_S3_BUCKET for profile pictures
- [ ] 11.1.4 Configure SMS_PROVIDER credentials
- [ ] 11.1.5 Configure JWT_SECRET for mobile tokens

### 11.2 Database Deployment
- [ ] 11.2.1 Run migration on staging database
- [ ] 11.2.2 Test migration rollback
- [ ] 11.2.3 Run migration on production database
- [ ] 11.2.4 Verify indexes created successfully

### 11.3 Service Deployment
- [ ] 11.3.1 Deploy mobile APIs to staging
- [ ] 11.3.2 Test mobile APIs on staging
- [ ] 11.3.3 Deploy queue processor background job
- [ ] 11.3.4 Deploy cron jobs
- [ ] 11.3.5 Deploy push notification service
- [ ] 11.3.6 Deploy to production

### 11.4 Monitoring Setup
- [ ] 11.4.1 Add health check endpoint for mobile APIs
- [ ] 11.4.2 Set up monitoring for queue processing
- [ ] 11.4.3 Set up alerts for queue backlog (> 1000 pending)
- [ ] 11.4.4 Set up alerts for failed notifications
- [ ] 11.4.5 Monitor API response times
- [ ] 11.4.6 Monitor error rates

## 12. Mobile App Development (Optional - If In Scope)

### 12.1 iOS App
- [ ] 12.1.1 Create iOS project in Xcode
- [ ] 12.1.2 Implement registration UI
- [ ] 12.1.3 Implement login with OTP
- [ ] 12.1.4 Implement QR code scanner (AVFoundation)
- [ ] 12.1.5 Implement offline scanning with local queue
- [ ] 12.1.6 Implement profile management
- [ ] 12.1.7 Integrate Firebase Cloud Messaging
- [ ] 12.1.8 Test on iOS devices
- [ ] 12.1.9 Submit to App Store

### 12.2 Android App
- [ ] 12.2.1 Create Android project in Android Studio
- [ ] 12.2.2 Implement registration UI
- [ ] 12.2.3 Implement login with OTP
- [ ] 12.2.4 Implement QR code scanner (CameraX)
- [ ] 12.2.5 Implement offline scanning with Room database
- [ ] 12.2.6 Implement profile management
- [ ] 12.2.7 Integrate Firebase Cloud Messaging
- [ ] 12.2.8 Test on Android devices
- [ ] 12.2.9 Submit to Google Play Store

## 13. Launch Readiness

### 13.1 Beta Testing
- [ ] 13.1.1 Recruit 50 beta testers
- [ ] 13.1.2 Distribute TestFlight (iOS) and Play Console (Android) builds
- [ ] 13.1.3 Collect feedback on UX and bugs
- [ ] 13.1.4 Fix critical bugs
- [ ] 13.1.5 Conduct second beta round

### 13.2 Performance Validation
- [ ] 13.2.1 Verify scan verification < 300ms
- [ ] 13.2.2 Verify queue processing time < 60 seconds
- [ ] 13.2.3 Verify API uptime > 99.9%
- [ ] 13.2.4 Verify push notification delivery > 95%

### 13.3 Launch
- [ ] 13.3.1 Release mobile apps to production
- [ ] 13.3.2 Announce mobile app availability to tenants
- [ ] 13.3.3 Create onboarding materials for tenants
- [ ] 13.3.4 Monitor error rates and performance
- [ ] 13.3.5 Collect user feedback
