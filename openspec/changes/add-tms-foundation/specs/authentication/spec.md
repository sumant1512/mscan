## ADDED Requirements

### Requirement: OTP-Based Email Authentication
The system SHALL support OTP (One-Time Password) based authentication via email for multiple user types including Super Admin and Tenant users.

#### Scenario: Request OTP for login
- **WHEN** a user provides their email address to login
- **THEN** the system SHALL validate the email exists in the system
- **AND** generate a 6-digit OTP with 5-minute expiry
- **AND** send the OTP to the user's email
- **AND** return a confirmation that OTP has been sent

#### Scenario: Verify OTP for Super Admin
- **WHEN** a Super Admin provides their email and valid OTP
- **THEN** the system SHALL authenticate the user
- **AND** return a JWT access token and refresh token
- **AND** return the user type as "SUPER_ADMIN"

#### Scenario: Verify OTP for Tenant user
- **WHEN** a Tenant user provides their email and valid OTP
- **THEN** the system SHALL authenticate the user
- **AND** return a JWT access token and refresh token
- **AND** return the user type as "TENANT"

#### Scenario: Invalid or expired OTP
- **WHEN** a user provides an invalid or expired OTP
- **THEN** the system SHALL reject the authentication attempt
- **AND** return an appropriate error message
- **AND** NOT allow login

#### Scenario: Email not found
- **WHEN** a user provides an email that does not exist in the system
- **THEN** the system SHALL reject the OTP request
- **AND** return a generic error message for security

#### Scenario: OTP rate limiting
- **WHEN** a user requests multiple OTPs within a short time period
- **THEN** the system SHALL enforce rate limiting (max 3 requests per 15 minutes)
- **AND** return an error if limit is exceeded

### Requirement: User Context Retrieval
The system SHALL provide a separate API to retrieve full user context information using a valid authentication token.

#### Scenario: Retrieve Super Admin context
- **WHEN** a Super Admin requests user context with a valid token
- **THEN** the system SHALL return complete user information (user ID, name, email, role)
- **AND** return Super Admin privileges and permissions
- **AND** NOT include tenant information

#### Scenario: Retrieve Tenant user context
- **WHEN** a Tenant user requests user context with a valid token
- **THEN** the system SHALL return complete user information (user ID, name, email, role)
- **AND** return associated tenant information (tenant ID, company name)
- **AND** return tenant-specific permissions

#### Scenario: Invalid or expired token for context
- **WHEN** a request is made with an invalid or expired token
- **THEN** the system SHALL reject the request
- **AND** return an authentication error requiring re-login

### Requirement: Email Delivery
The system SHALL integrate with an email service to deliver OTPs securely.

#### Scenario: Send OTP email
- **WHEN** an OTP is generated for a user
- **THEN** the system SHALL send an email containing the OTP
- **AND** the email SHALL include the OTP code clearly displayed
- **AND** the email SHALL indicate the 5-minute expiry time
- **AND** the email SHALL be sent from a verified domain

#### Scenario: Email delivery failure
- **WHEN** the email service fails to deliver an OTP
- **THEN** the system SHALL log the error
- **AND** return an error message to the user
- **AND** allow the user to retry

### Requirement: Session Management
The system SHALL manage user sessions securely with token-based authentication.

#### Scenario: Token generation
- **WHEN** a user successfully authenticates with valid OTP
- **THEN** the system SHALL generate a JWT access token and refresh token
- **AND** the tokens SHALL include user ID and role
- **AND** the access token SHALL have 30-minute expiration
- **AND** the refresh token SHALL have 7-day expiration

#### Scenario: Token validation
- **WHEN** a user makes an authenticated request
- **THEN** the system SHALL validate the JWT access token
- **AND** verify the token has not expired
- **AND** extract user ID and role from the token

#### Scenario: Token expiration
- **WHEN** a user's access token expires
- **THEN** the system SHALL reject further requests with that token
- **AND** require token refresh or re-authentication

### Requirement: Token Refresh
The system SHALL provide a mechanism to refresh expired access tokens for active users without requiring re-authentication.

#### Scenario: Generate refresh token on login
- **WHEN** a user successfully authenticates
- **THEN** the system SHALL generate both an access token (30 min expiry)
- **AND** a refresh token (7 days expiry)
- **AND** return both tokens to the client

#### Scenario: Successful token refresh
- **WHEN** a user's access token expires and they provide a valid refresh token
- **THEN** the system SHALL generate a new access token
- **AND** generate a new refresh token
- **AND** return both new tokens to the client

#### Scenario: Expired refresh token
- **WHEN** a user attempts to refresh with an expired refresh token
- **THEN** the system SHALL reject the refresh request
- **AND** require the user to re-authenticate with credentials

#### Scenario: Invalid refresh token
- **WHEN** a user provides an invalid or revoked refresh token
- **THEN** the system SHALL reject the refresh request
- **AND** return an authentication error

### Requirement: Logout Functionality
The system SHALL allow users to securely logout and invalidate their session.

#### Scenario: User logout
- **WHEN** an authenticated user initiates logout
- **THEN** the system SHALL invalidate both the access token and refresh token
- **AND** clear client-side session data
- **AND** redirect to the login page

### Requirement: Role-Based Authorization
The system SHALL enforce authorization rules based on user roles.

#### Scenario: Super Admin access
- **WHEN** a Super Admin accesses system resources
- **THEN** they SHALL have access to all tenant data and system administration functions

#### Scenario: Tenant user access
- **WHEN** a Tenant user accesses system resources
- **THEN** they SHALL only have access to their tenant's data
- **AND** they SHALL NOT have access to system administration functions
