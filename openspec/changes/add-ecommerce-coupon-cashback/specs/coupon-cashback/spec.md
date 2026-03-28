# Coupon Cashback System

## Purpose
The coupon cashback system enables two reward models for coupon scanning: dealer credit points (in-app currency) and customer direct cashback (UPI payout). The mode is configurable per tenant via feature flags. Dealer scanning inherently requires the mobile app (JWT auth). Open scanning inherently uses UPI payout as the cashback mechanism.

---

## ADDED Requirements

### Requirement: Cashback Transaction Lifecycle
The system SHALL track cashback transactions through a defined status lifecycle.

#### Scenario: Cashback status transitions
- **WHEN** a cashback transaction is created
- **THEN** it SHALL follow the lifecycle: PENDING → PROCESSING → COMPLETED or FAILED
- **AND** COMPLETED transactions MAY be REVERSED
- **AND** transitions SHALL be recorded with timestamps

#### Scenario: Cashback transaction creation on scan
- **WHEN** a coupon is scanned and cashback is applicable
- **THEN** the system SHALL create a `cashback_transactions` record with:
  - customer_id, tenant_id, coupon_code, amount, upi_id, status=PENDING
  - Reference to scan_session_id

#### Scenario: Failed cashback handling
- **WHEN** a UPI payout fails
- **THEN** the system SHALL:
  - Update cashback_transactions status to FAILED
  - Store failure_reason
  - Keep the cashback amount available for retry

### Requirement: Customer UPI Management
The system SHALL allow customers to store and manage their UPI IDs for cashback payouts.

#### Scenario: Save UPI ID
- **WHEN** a CUSTOMER sends POST `/api/mobile/v1/cashback/upi` with `{ upi_id: "user@upi" }`
- **THEN** the system SHALL store the UPI ID in `customer_upi_details`
- **AND** set it as the primary UPI ID
- **AND** return `{ upi_id, is_primary: true }`

#### Scenario: Get saved UPI details
- **WHEN** a CUSTOMER sends GET `/api/mobile/v1/cashback/upi`
- **THEN** the system SHALL return all saved UPI IDs for the customer in the current tenant
- **AND** indicate which is primary

#### Scenario: UPI ID format validation
- **WHEN** a customer submits an invalid UPI ID format
- **THEN** the system SHALL reject with 400 Bad Request
- **AND** return `{ error: "Invalid UPI ID format. Expected format: username@bankname" }`

### Requirement: Cashback History and Balance
The system SHALL provide customers visibility into their cashback transactions.

#### Scenario: View cashback history
- **WHEN** a CUSTOMER sends GET `/api/mobile/v1/cashback/history`
- **THEN** the system SHALL return paginated cashback transactions with:
  - id, coupon_code, amount, upi_id, status, created_at
  - Support for status filtering and date range
  - Default sort: newest first

#### Scenario: View pending cashback balance
- **WHEN** a CUSTOMER sends GET `/api/mobile/v1/cashback/balance`
- **THEN** the system SHALL return:
  - total_earned: sum of all COMPLETED cashback amounts
  - pending: sum of all PENDING cashback amounts
  - processing: sum of all PROCESSING cashback amounts

### Requirement: Dealer Points System
The system SHALL maintain a credit points system for dealers that is separate from real-money cashback.

#### Scenario: Dealer views own points via mobile
- **WHEN** a DEALER sends GET `/api/mobile/v1/dealer/points`
- **THEN** the system SHALL return `{ balance: 1500, currency: "points" }`

#### Scenario: Dealer views point history via mobile
- **WHEN** a DEALER sends GET `/api/mobile/v1/dealer/points/history`
- **THEN** the system SHALL return paginated transaction history with:
  - id, amount, type (CREDIT/DEBIT), reason, coupon_code, created_at
  - Default sort: newest first

### Requirement: Cashback Amount Configuration
The system SHALL determine cashback amounts from coupon configuration.

#### Scenario: Fixed cashback amount
- **WHEN** a coupon has `cashback_amount` field set to 50.00
- **THEN** the system SHALL award exactly 50.00 as cashback

#### Scenario: Coupon points used as cashback
- **WHEN** a coupon has `coupon_points` field set to 100 and no explicit `cashback_amount`
- **THEN** the system SHALL use `coupon_points` value as the cashback amount
- **AND** log a warning if the value seems unusually high (>1000)

---

## Database Schema

**Tables:**
- `cashback_transactions` — Tracks UPI cashback payouts
  - `id`, `customer_id`, `tenant_id`, `scan_session_id`, `coupon_code`, `amount`, `upi_id`, `status`, `payout_reference`, `failure_reason`, `metadata` (JSONB)
  - Status ENUM: PENDING, PROCESSING, COMPLETED, FAILED, REVERSED
- `customer_upi_details` — Customer UPI IDs
  - `id`, `customer_id`, `tenant_id`, `upi_id`, `is_verified`, `is_primary`
  - UNIQUE(customer_id, tenant_id, upi_id)
- `dealer_points` — Dealer credit point balances
  - `id`, `dealer_id`, `tenant_id`, `balance`
  - UNIQUE(dealer_id, tenant_id)
- `dealer_point_transactions` — Dealer point transaction history
  - `id`, `dealer_id`, `tenant_id`, `amount`, `type`, `reason`, `reference_id`, `reference_type`, `metadata` (JSONB)

---

## API Endpoints

### Customer Cashback (Mobile App)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/mobile/v1/cashback/scan` | JWT (CUSTOMER) | Scan and earn cashback |
| POST | `/api/mobile/v1/cashback/upi` | JWT (CUSTOMER) | Save UPI ID |
| GET | `/api/mobile/v1/cashback/upi` | JWT (CUSTOMER) | Get UPI details |
| POST | `/api/mobile/v1/cashback/claim` | JWT (CUSTOMER) | Claim pending cashback |
| GET | `/api/mobile/v1/cashback/history` | JWT (CUSTOMER) | Cashback history |
| GET | `/api/mobile/v1/cashback/balance` | JWT (CUSTOMER) | Cashback balance |

### Customer Cashback (Public - No App)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/public/cashback/start` | None | Start session |
| POST | `/api/public/cashback/:sessionId/mobile` | None | Submit mobile + OTP |
| POST | `/api/public/cashback/:sessionId/verify-otp` | None | Verify OTP |
| POST | `/api/public/cashback/:sessionId/upi` | None | Submit UPI ID |
| POST | `/api/public/cashback/:sessionId/confirm` | None | Confirm cashback |

### Dealer Points (Mobile App)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/mobile/v1/dealer/scan` | JWT (DEALER) | Scan and earn points |
| GET | `/api/mobile/v1/dealer/points` | JWT (DEALER) | View balance |
| GET | `/api/mobile/v1/dealer/points/history` | JWT (DEALER) | Point history |
| GET | `/api/mobile/v1/dealer/profile` | JWT (DEALER) | View profile |

---

## Feature Flags

| Flag Code | Description | Default |
|-----------|-------------|---------|
| `coupon_cashback` | Parent flag for entire cashback module | disabled |
| `coupon_cashback.dealer_scanning` | Enable dealer-only QR scanning (app required is implicit) | disabled |
| `coupon_cashback.open_scanning` | Enable open scanning for all users (UPI payout is implicit) | disabled |

---

## Security Considerations

1. **UPI ID Validation**: UPI IDs MUST be validated against format `username@bankhandle`
2. **Cashback Limits**: Tenants SHOULD configure daily/monthly cashback limits
3. **Duplicate Scan Prevention**: Each coupon MUST only be redeemable once
4. **Rate Limiting**: Public cashback endpoints MUST have strict rate limits
5. **Session Expiry**: Public cashback sessions MUST expire after 10 minutes
6. **Dealer Verification**: Only pre-registered dealers MUST be able to access dealer scan endpoints
