## ADDED Requirements

### Requirement: Public QR Scan Landing
The system SHALL provide a public browser landing route for scanned QR codes that prompts the user to login to get the award.

- Route: `GET /scan/{coupon_code}`
- Behavior: Validates coupon existence and unredeemed status; serves minimal page or JSON with message "Login to get award" and session bootstrap data
- Tenant scope: Derived from Host subdomain (e.g., `tenant.localhost`) or `verification_app_id` in headers

#### Scenario: Landing with active coupon
- **WHEN** a user scans a QR and opens `/scan/ABC123`
- **THEN** system renders/returns landing content indicating login required
- **AND** associates session context with tenant and coupon

#### Scenario: Landing with invalid or redeemed coupon
- **WHEN** a user opens a QR URL for an unknown or redeemed coupon
- **THEN** system returns `400` with error `invalid_or_redeemed_coupon`

### Requirement: Start Scan Session
The system SHALL create a scan session for the coupon to track OTP verification and awarding flow.

- Endpoint: `POST /api/public/scan/start`
- Inputs: `coupon_code` (string), `device_id` (string, optional)
- Output: `{ session_id, coupon_code, status: "pending-verification" }`

#### Scenario: Start session for active coupon
- **WHEN** client posts `coupon_code` for an active, unredeemed coupon
- **THEN** system creates `pending-verification` session and returns `session_id`

#### Scenario: Reject invalid or redeemed coupon
- **WHEN** client posts `coupon_code` for unknown or redeemed coupon
- **THEN** system returns `400` `invalid_or_redeemed_coupon`

### Requirement: Collect Mobile Number and Send OTP
The system SHALL collect a user's mobile number for verification and trigger an OTP challenge bound to the scan session.

- Endpoint: `POST /api/public/scan/{session_id}/mobile`
- Inputs: `mobile_e164` (e.g., +919876543210), `consent_acceptance` (boolean)
- Output: `{ challenge_id, mobile_masked }`
- Behavior: Bind OTP challenge to session; enforce rate limits; reuse existing auth OTP infrastructure

#### Scenario: Trigger OTP challenge
- **WHEN** client submits a valid mobile number for an existing `pending-verification` session
- **THEN** system sends OTP to the mobile number and returns `challenge_id`

#### Scenario: Rate limit OTP requests
- **WHEN** the same session requests OTP multiple times within 60 seconds
- **THEN** system returns `429` `otp_rate_limited`

### Requirement: Verify OTP and Award Points (Per QR)
The system MUST verify the OTP for the session and, on success, award the points defined on the QR/coupon to the user's account and mark the coupon as redeemed.

- Endpoint: `POST /api/public/scan/{session_id}/verify-otp`
- Inputs: `otp_code` (string)
- Output: `{ awarded_points, user_balance, coupon_status }`
- Behavior: Verify OTP; award points using `coupon_points` stored with the coupon; create ledger transaction; mark coupon redeemed; ensure idempotency

#### Scenario: OTP success awards per-QR points
- **WHEN** client submits the correct OTP for the session
- **THEN** system awards `coupon_points` to the user
- **AND** updates coupon to `redeemed`
- **AND** returns new balance

#### Scenario: OTP failure does not award points
- **WHEN** client submits incorrect OTP three times
- **THEN** system locks the session with status `verification-failed`
- **AND** returns `403` `otp_failed`
- **AND** coupon remains unredeemed

#### Scenario: Idempotent verification
- **WHEN** `verify-otp` is called again for a completed session
- **THEN** system returns the same result without duplicating points

### Requirement: Security, Tenant Isolation, and Abuse Controls
The system MUST enforce tenant isolation, input validation, OTP abuse controls, and idempotency.

#### Scenario: Tenant isolation via Host
- **WHEN** requests include Host `tenant.localhost`
- **THEN** system scopes coupon and points to that tenant only

#### Scenario: OTP request throttling
- **WHEN** same mobile requests more than 5 OTPs in 24 hours
- **THEN** system returns `429` `daily_limit_exceeded`

#### Scenario: Idempotency per coupon/session
- **WHEN** `coupon_code` is already redeemed
- **THEN** system rejects new scan sessions with `invalid_or_redeemed_coupon`

### Requirement: Observability Events
The system SHALL emit telemetry events for scan lifecycle.

#### Scenario: Emit events
- **WHEN** scan starts, OTP is sent, OTP is verified, points are awarded, coupon is redeemed
- **THEN** system records `scan_started`, `otp_sent`, `otp_verified`, `points_awarded`, `coupon_redeemed` with correlation IDs
