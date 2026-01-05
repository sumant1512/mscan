## ADDED Requirements

### Requirement: Points Ledger and Balance
The system SHALL maintain a points ledger per user (keyed by mobile number) and compute current balance.

- Tables: `user_points` (current balance per mobile+tenant), `points_transactions` (immutable ledger)
- Award value: Taken from `coupon_points` on the scanned coupon (no default configuration)

#### Scenario: Award points on scan success
- **WHEN** a scan session completes with OTP verification
- **THEN** system creates a `points_transactions` entry with reason `scan` and amount = `coupon_points`
- **AND** updates `user_points.balance`

#### Scenario: Idempotent award for duplicate verification
- **WHEN** the same session is verified twice
- **THEN** only one transaction exists
- **AND** balance reflects a single award

### Requirement: Points Retrieval API (Public)
The system SHALL provide an endpoint to fetch a user's current points by mobile number.

- Endpoint: `GET /api/public/users/{mobile_e164}/points`
- Output: `{ mobile_e164, balance, last_updated }`

#### Scenario: Fetch user points
- **WHEN** client requests points for a known mobile
- **THEN** system returns current balance scoped to tenant

### Requirement: Tenant Admin Adjustments (Optional)
The system SHALL allow tenant admins to adjust points with audit logging.

- Endpoint: `POST /api/tenant/points/adjust`
- Inputs: `mobile_e164`, `delta_points`, `reason`
- Output: `{ new_balance }`

#### Scenario: Positive adjustment
- **WHEN** admin adds 50 points
- **THEN** system appends transaction and updates balance

#### Scenario: Negative adjustment with floor
- **WHEN** admin subtracts 20 points from balance 10
- **THEN** system sets balance to 0
- **AND** records bounded adjustment

### Requirement: Tenant Isolation and Validation
The system MUST enforce tenant-only access and validate inputs.

#### Scenario: Cross-tenant access blocked
- **WHEN** Tenant A requests points for Tenant B mobile
- **THEN** system returns `404 not found`

#### Scenario: Validate mobile format
- **WHEN** invalid `mobile_e164` is provided
- **THEN** system returns `400 invalid_mobile`
