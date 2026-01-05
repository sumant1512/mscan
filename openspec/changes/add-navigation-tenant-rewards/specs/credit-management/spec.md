## ADDED Requirements

### Requirement: Tenant Credit Request
The system SHALL allow tenants to request credits from Super Admins to enable coupon creation.

#### Scenario: Submit credit request successfully
- **WHEN** a tenant submits a credit request
- **WITH** valid amount (positive integer) and business justification
- **THEN** the system SHALL create a credit request record
- **AND** SHALL set the status to "pending"
- **AND** SHALL associate the request with the tenant's account
- **AND** SHALL timestamp the request
- **AND** SHALL notify Super Admins of the new request
- **AND** SHALL return a confirmation with request ID

#### Scenario: Prevent negative or zero credit requests
- **WHEN** a tenant attempts to request credits
- **WITH** zero or negative amount
- **THEN** the system SHALL reject the request
- **AND** SHALL return a validation error
- **AND** SHALL indicate minimum credit amount (e.g., minimum 100 credits)

#### Scenario: View own credit request history
- **WHEN** a tenant views their credit request page
- **THEN** the system SHALL display all their credit requests
- **AND** SHALL show status (pending, approved, rejected) for each
- **AND** SHALL show requested amount, approval date, and approver
- **AND** SHALL display rejection reason if applicable
- **AND** SHALL sort by most recent first

#### Scenario: Prevent multiple pending requests
- **WHEN** a tenant attempts to submit a new credit request
- **WHILE** they have an existing pending request
- **THEN** the system SHALL reject the new request
- **AND** SHALL return an error message
- **AND** SHALL indicate they must wait for current request resolution

### Requirement: Super Admin Credit Approval
The system SHALL allow Super Admins to approve or reject tenant credit requests.

#### Scenario: Approve credit request
- **WHEN** a Super Admin approves a pending credit request
- **THEN** the system SHALL update the request status to "approved"
- **AND** SHALL add the requested credits to the tenant's balance
- **AND** SHALL record the approval timestamp and approving admin
- **AND** SHALL send notification email to the tenant
- **AND** SHALL create a credit transaction record for audit
- **AND** SHALL display success confirmation

#### Scenario: Reject credit request
- **WHEN** a Super Admin rejects a pending credit request
- **WITH** a rejection reason
- **THEN** the system SHALL update the request status to "rejected"
- **AND** SHALL NOT modify the tenant's credit balance
- **AND** SHALL record the rejection timestamp, admin, and reason
- **AND** SHALL send notification email to tenant with reason
- **AND** SHALL display success confirmation

#### Scenario: Reject credit request without reason
- **WHEN** a Super Admin attempts to reject a request
- **WITHOUT** providing a rejection reason
- **THEN** the system SHALL require a reason
- **AND** SHALL prompt the admin to enter a reason
- **AND** SHALL NOT process rejection until reason is provided

#### Scenario: View all pending credit requests
- **WHEN** a Super Admin accesses the credit requests page
- **THEN** the system SHALL display all pending requests from all tenants
- **AND** SHALL show tenant name, requested amount, date, and justification
- **AND** SHALL provide quick action buttons (Approve, Reject) for each
- **AND** SHALL sort by oldest first (FIFO)
- **AND** SHALL highlight requests older than 48 hours

#### Scenario: View credit request history
- **WHEN** a Super Admin views the credit history tab
- **THEN** the system SHALL display all approved and rejected requests
- **AND** SHALL show tenant, amount, status, date, and admin who processed
- **AND** SHALL allow filtering by status, tenant, and date range
- **AND** SHALL provide export functionality for reporting

### Requirement: Credit Balance Management
The system SHALL track and display tenant credit balances accurately.

#### Scenario: View current credit balance (Tenant)
- **WHEN** a tenant views their dashboard or credits page
- **THEN** the system SHALL display their current credit balance prominently
- **AND** SHALL show total credits received
- **AND** SHALL show total credits spent
- **AND** SHALL show available balance (received - spent)
- **AND** SHALL update in real-time when credits are used or added

#### Scenario: Deduct credits on coupon creation
- **WHEN** a tenant creates a new coupon
- **THEN** the system SHALL calculate the credit cost based on coupon parameters
- **AND** SHALL deduct the calculated credits from tenant's balance
- **AND** SHALL create a debit transaction record
- **AND** SHALL update the balance immediately
- **AND** SHALL prevent creation if insufficient credits

#### Scenario: Prevent coupon creation with insufficient credits
- **WHEN** a tenant attempts to create a coupon
- **WITH** credit cost exceeding their available balance
- **THEN** the system SHALL reject the creation
- **AND** SHALL display the required credits vs available balance
- **AND** SHALL prompt the tenant to request more credits
- **AND** SHALL NOT create the coupon or deduct any credits

### Requirement: Credit Transaction Audit Trail
The system SHALL maintain a complete audit trail of all credit transactions.

#### Scenario: Record credit addition transaction
- **WHEN** credits are added to a tenant's account (approval)
- **THEN** the system SHALL create a transaction record
- **AND** SHALL log transaction type as "CREDIT"
- **AND** SHALL record amount, timestamp, related request ID
- **AND** SHALL record the approving Super Admin
- **AND** SHALL capture tenant's balance before and after

#### Scenario: Record credit deduction transaction
- **WHEN** credits are deducted from a tenant's account (coupon creation)
- **THEN** the system SHALL create a transaction record
- **AND** SHALL log transaction type as "DEBIT"
- **AND** SHALL record amount, timestamp, related coupon ID
- **AND** SHALL record the credit cost calculation basis
- **AND** SHALL capture tenant's balance before and after

#### Scenario: View transaction history (Tenant)
- **WHEN** a tenant views their transaction history
- **THEN** the system SHALL display all credit transactions
- **AND** SHALL show transaction type (credit/debit)
- **AND** SHALL show amount, date, description, and balance after transaction
- **AND** SHALL allow filtering by date range and transaction type
- **AND** SHALL paginate results for performance

#### Scenario: View transaction history (Super Admin)
- **WHEN** a Super Admin views a tenant's transaction history
- **THEN** the system SHALL display all transactions for that tenant
- **AND** SHALL include admin actions (who approved credits)
- **AND** SHALL show complete audit trail
- **AND** SHALL allow export for reporting

### Requirement: Credit Cost Calculation
The system SHALL calculate credit costs for coupon creation based on configurable rules.

#### Scenario: Calculate cost for percentage discount coupon
- **WHEN** a tenant creates a percentage discount coupon
- **THEN** the system SHALL calculate credits as: base_cost × discount_percentage × quantity
- **AND** SHALL apply higher multiplier for larger discounts (e.g., 50%+ discount costs 2x)
- **AND** SHALL display the calculated cost before confirmation

#### Scenario: Calculate cost for fixed amount discount coupon
- **WHEN** a tenant creates a fixed amount discount coupon
- **THEN** the system SHALL calculate credits as: (discount_amount × quantity) / 10
- **AND** SHALL apply minimum cost threshold (e.g., minimum 50 credits)
- **AND** SHALL display the calculated cost before confirmation

#### Scenario: Factor expiry date into cost
- **WHEN** calculating coupon credit cost
- **THEN** the system SHALL apply a time-based multiplier
- **AND** SHALL cost less for shorter validity periods (< 30 days: 0.8x)
- **AND** SHALL cost more for longer validity periods (> 90 days: 1.2x)
- **AND** SHALL display the time-based adjustment in cost breakdown

#### Scenario: Display cost breakdown
- **WHEN** a tenant creates a coupon
- **BEFORE** final confirmation
- **THEN** the system SHALL display a detailed cost breakdown
- **AND** SHALL show base cost, quantity multiplier, discount multiplier, time multiplier
- **AND** SHALL show total cost and available balance
- **AND** SHALL allow the tenant to modify parameters if cost is too high

### Requirement: Credit System Authorization
The system SHALL enforce role-based access for credit management operations.

#### Scenario: Tenant can request and view own credits
- **WHEN** a tenant accesses credit features
- **THEN** the system SHALL allow requesting credits
- **AND** SHALL allow viewing own balance and transactions
- **AND** SHALL allow viewing own request history
- **AND** SHALL NOT allow viewing other tenants' credit information

#### Scenario: Super Admin can manage all credit requests
- **WHEN** a Super Admin accesses credit management
- **THEN** the system SHALL allow viewing all pending requests
- **AND** SHALL allow approving/rejecting any request
- **AND** SHALL allow viewing all tenants' balances and transactions
- **AND** SHALL provide system-wide credit analytics

#### Scenario: Prevent unauthorized credit modifications
- **WHEN** a user attempts to directly modify credit balance via API
- **THEN** the system SHALL reject the request
- **AND** SHALL only allow modifications through approved workflows (approval, deduction)
- **AND** SHALL log the unauthorized attempt
