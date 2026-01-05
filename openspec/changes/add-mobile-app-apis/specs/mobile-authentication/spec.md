# Mobile Authentication Specification

## ADDED Requirements

### Requirement: Customer Registration
The system SHALL provide a mobile-optimized registration flow for end customers to create accounts using phone number OR email address.

#### Scenario: Customer registers with phone number
- **GIVEN** a customer opens the mobile scanner app for the first time
- **AND** the customer belongs to a specific tenant
- **WHEN** the customer provides phone number, full name, and tenant information
- **THEN** the system SHALL create a customer account with status "unverified"
- **AND** send a 6-digit OTP to the phone number via SMS
- **AND** return a temporary registration token

#### Scenario: Customer registers with email address
- **GIVEN** a customer prefers email-based authentication
- **WHEN** the customer provides email, full name, and tenant information
- **THEN** the system SHALL create a customer account with status "unverified"
- **AND** send a 6-digit OTP to the email address
- **AND** return a temporary registration token

#### Scenario: Registration with duplicate phone number
- **GIVEN** a phone number is already registered
- **WHEN** a customer attempts to register with the same phone number
- **THEN** the system SHALL reject the registration
- **AND** return error "Phone number already registered. Please log in."

#### Scenario: Registration with duplicate email
- **GIVEN** an email address is already registered
- **WHEN** a customer attempts to register with the same email
- **THEN** the system SHALL reject the registration
- **AND** return error "Email already registered. Please log in."

### Requirement: OTP Verification for Customer Login
The system SHALL verify customer OTP codes and issue mobile-specific JWT tokens upon successful verification.

#### Scenario: Successful OTP verification
- **GIVEN** a customer has received a valid OTP
- **AND** the OTP has not expired (5 minutes)
- **WHEN** the customer submits the correct OTP code
- **THEN** the system SHALL verify the customer account
- **AND** issue an access token (JWT) valid for 24 hours
- **AND** issue a refresh token valid for 90 days
- **AND** mark the phone/email as verified
- **AND** return customer profile information

#### Scenario: Invalid OTP code
- **GIVEN** a customer has received an OTP
- **WHEN** the customer submits an incorrect OTP code
- **THEN** the system SHALL reject the verification
- **AND** increment the attempt counter
- **AND** return error "Invalid OTP code. X attempts remaining."

#### Scenario: Expired OTP
- **GIVEN** an OTP was sent more than 5 minutes ago
- **WHEN** the customer attempts to verify the OTP
- **THEN** the system SHALL reject the verification
- **AND** return error "OTP has expired. Please request a new one."

#### Scenario: Too many failed OTP attempts
- **GIVEN** a customer has failed 3 OTP verification attempts
- **WHEN** the customer attempts a 4th verification
- **THEN** the system SHALL block further attempts
- **AND** invalidate the OTP
- **AND** return error "Too many failed attempts. Please request a new OTP."

### Requirement: Customer Login Flow
The system SHALL provide a streamlined login flow for returning customers using phone or email.

#### Scenario: Customer login with phone number
- **GIVEN** a customer has a registered account
- **WHEN** the customer provides their phone number to log in
- **THEN** the system SHALL verify the phone number exists
- **AND** generate a new 6-digit OTP
- **AND** send the OTP via SMS
- **AND** return message "OTP sent to your phone"

#### Scenario: Customer login with email
- **GIVEN** a customer has a registered account
- **WHEN** the customer provides their email address to log in
- **THEN** the system SHALL verify the email exists
- **AND** generate a new 6-digit OTP
- **AND** send the OTP via email
- **AND** return message "OTP sent to your email"

#### Scenario: Login with unregistered identifier
- **GIVEN** a phone/email is not registered in the system
- **WHEN** a customer attempts to log in
- **THEN** the system SHALL reject the request
- **AND** return error "Account not found. Please register first."

### Requirement: Mobile Token Refresh
The system SHALL allow mobile apps to refresh access tokens using valid refresh tokens without re-authentication.

#### Scenario: Successful token refresh
- **GIVEN** a customer has a valid refresh token
- **AND** the access token has expired or will expire soon
- **WHEN** the mobile app requests token refresh
- **THEN** the system SHALL validate the refresh token
- **AND** issue a new access token (24 hours validity)
- **AND** issue a new refresh token (90 days validity)
- **AND** blacklist the old refresh token

#### Scenario: Invalid refresh token
- **GIVEN** a refresh token has been blacklisted or is invalid
- **WHEN** the mobile app attempts to refresh
- **THEN** the system SHALL reject the request
- **AND** return 401 Unauthorized error
- **AND** require the customer to log in again

#### Scenario: Expired refresh token
- **GIVEN** a refresh token is older than 90 days
- **WHEN** the mobile app attempts to refresh
- **THEN** the system SHALL reject the request
- **AND** return error "Session expired. Please log in again."

### Requirement: Mobile Customer Logout
The system SHALL allow customers to log out from mobile devices and invalidate their authentication tokens.

#### Scenario: Customer logout
- **GIVEN** a customer is logged in on a mobile device
- **WHEN** the customer initiates logout
- **THEN** the system SHALL blacklist the access token
- **AND** blacklist the refresh token
- **AND** mark the device as inactive (optional)
- **AND** return success message

#### Scenario: Logout from all devices
- **GIVEN** a customer is logged in on multiple devices
- **WHEN** the customer requests "logout from all devices"
- **THEN** the system SHALL blacklist all access tokens for the customer
- **AND** blacklist all refresh tokens
- **AND** mark all customer devices as inactive
- **AND** return success message

### Requirement: Customer Profile Retrieval
The system SHALL provide mobile-optimized customer profile information upon authentication.

#### Scenario: Get customer profile
- **GIVEN** a customer is authenticated
- **WHEN** the mobile app requests the customer profile
- **THEN** the system SHALL return:
  - Customer ID, name, phone, email
  - Verification status (phone_verified, email_verified)
  - Total scans, successful scans
  - Total rewards redeemed
  - Last scan timestamp
  - Account creation date

### Requirement: Mobile Authentication Security
The system SHALL enforce mobile-specific security measures to prevent unauthorized access and abuse.

#### Scenario: Rate limit OTP requests
- **GIVEN** a customer has requested 5 OTPs in 1 hour
- **WHEN** the customer requests another OTP
- **THEN** the system SHALL block the request
- **AND** return error "Too many OTP requests. Please try again in 1 hour."

#### Scenario: Rate limit registration attempts
- **GIVEN** an IP address has attempted 3 registrations in 1 hour
- **WHEN** another registration is attempted from the same IP
- **THEN** the system SHALL block the request
- **AND** return error "Too many registration attempts. Please try again later."

#### Scenario: Device binding in JWT token
- **GIVEN** a customer logs in on a specific device
- **WHEN** the system issues JWT tokens
- **THEN** the access token SHALL include device_id claim
- **AND** API requests SHALL validate device_id matches the registered device

### Requirement: Multi-Tenant Customer Isolation
The system SHALL ensure customers can only access data within their tenant's scope.

#### Scenario: Customer accesses own tenant data
- **GIVEN** a customer belongs to Tenant A
- **WHEN** the customer makes an API request
- **THEN** the system SHALL automatically filter data by tenant_id
- **AND** return only data belonging to Tenant A

#### Scenario: Customer attempts cross-tenant access
- **GIVEN** a customer belongs to Tenant A
- **WHEN** the customer attempts to access Tenant B's data
- **THEN** the system SHALL reject the request
- **AND** return 403 Forbidden error

### Requirement: Account Deletion
The system SHALL allow customers to permanently delete their accounts and personal data (GDPR compliance).

#### Scenario: Customer deletes account
- **GIVEN** a customer wants to delete their account
- **WHEN** the customer confirms account deletion
- **THEN** the system SHALL:
  - Mark the customer account as deleted (soft delete)
  - Anonymize personal information (name, phone, email)
  - Blacklist all active tokens
  - Unregister all devices
  - Retain scan history for audit purposes (anonymized)
  - Send confirmation email/SMS

## API Endpoints

### POST /api/mobile/v1/auth/register
Register a new customer account.

**Request Body**:
```json
{
  "tenant_id": "uuid",
  "phone": "+919876543210",  // Optional (phone OR email required)
  "email": "customer@example.com",  // Optional
  "full_name": "Rajesh Kumar",
  "date_of_birth": "1990-05-15",  // Optional
  "gender": "male"  // Optional
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Registration successful. Please verify OTP.",
  "data": {
    "customer_id": "uuid",
    "temp_token": "jwt-token",  // Valid for 10 minutes, only for OTP verification
    "otp_sent_to": "+91****3210",
    "expires_in": 300  // seconds
  }
}
```

### POST /api/mobile/v1/auth/request-otp
Request OTP for login (existing customers).

**Request Body**:
```json
{
  "phone": "+919876543210",  // OR email
  "email": "customer@example.com"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "OTP sent to your phone/email",
  "data": {
    "otp_sent_to": "+91****3210",
    "expires_in": 300
  }
}
```

### POST /api/mobile/v1/auth/verify-otp
Verify OTP and complete login.

**Request Body**:
```json
{
  "phone": "+919876543210",  // OR email (must match OTP request)
  "email": "customer@example.com",
  "otp": "123456"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci...",
    "token_type": "Bearer",
    "expires_in": 86400,  // 24 hours
    "customer": {
      "id": "uuid",
      "tenant_id": "uuid",
      "full_name": "Rajesh Kumar",
      "phone": "+919876543210",
      "email": "customer@example.com",
      "phone_verified": true,
      "email_verified": false,
      "total_scans": 15,
      "successful_scans": 12,
      "total_rewards_redeemed": 1200.50,
      "created_at": "2025-01-01T10:00:00Z"
    }
  }
}
```

### POST /api/mobile/v1/auth/refresh
Refresh access token.

**Request Body**:
```json
{
  "refresh_token": "eyJhbGci..."
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci...",
    "expires_in": 86400
  }
}
```

### POST /api/mobile/v1/auth/logout
Logout and invalidate tokens.

**Headers**: `Authorization: Bearer {access_token}`

**Request Body**:
```json
{
  "refresh_token": "eyJhbGci...",
  "logout_all_devices": false  // Optional, default false
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /api/mobile/v1/auth/profile
Get current customer profile.

**Headers**: `Authorization: Bearer {access_token}`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenant_id": "uuid",
    "tenant_name": "ACME Logistics",
    "full_name": "Rajesh Kumar",
    "phone": "+919876543210",
    "email": "customer@example.com",
    "phone_verified": true,
    "email_verified": false,
    "date_of_birth": "1990-05-15",
    "gender": "male",
    "profile_picture_url": "https://cdn.mscan.com/profiles/uuid.jpg",
    "total_scans": 15,
    "successful_scans": 12,
    "total_rewards_redeemed": 1200.50,
    "last_scan_at": "2025-01-02T15:30:00Z",
    "created_at": "2025-01-01T10:00:00Z"
  }
}
```

## Non-Functional Requirements

### Performance
- OTP delivery: < 3 seconds
- Registration: < 500ms response time
- Login verification: < 300ms response time
- Token refresh: < 200ms response time

### Security
- OTP codes: Cryptographically random 6 digits
- JWT tokens: HS256 algorithm with 256-bit secret
- Password: Not used (OTP-based authentication)
- Rate limiting: 5 OTP requests per hour per identifier
- Token rotation: Mandatory on refresh

### Scalability
- Support 100,000 customer registrations per day
- Handle 1 million concurrent mobile sessions
- OTP generation: 10,000 requests per second

### Availability
- 99.9% uptime for authentication APIs
- Fallback to email if SMS fails (and vice versa)
- Graceful degradation if OTP service unavailable
