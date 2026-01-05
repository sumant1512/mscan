# Requirements: Coupon Lifecycle & Range Activation

**Change ID**: `coupon-lifecycle-activation`

## Functional Requirements

### FR-1: Coupon Status Lifecycle

**Priority**: MUST HAVE

#### FR-1.1: New Status Values
- System SHALL support the following coupon statuses:
  - `draft` - Default state on creation
  - `printed` - Marked when printed
  - `active` - Activated and scannable
  - `used` - Redeemed by customer
  - `inactive` - Manually deactivated
  - `expired` - Past expiry date

#### FR-1.2: Status Transitions
- Valid transitions:
  - `draft` → `printed` (on print action)
  - `draft` → `inactive` (manual deactivation)
  - `printed` → `active` (on activation)
  - `printed` → `inactive` (for lost coupons)
  - `active` → `used` (on redemption)
  - `active` → `inactive` (manual deactivation)
  - Any status → `expired` (automatic on expiry date)

#### FR-1.3: Scan Validation
- System SHALL only allow scanning of coupons with status `active`
- System SHALL return appropriate error messages for non-active coupons

**Acceptance Criteria:**
```gherkin
Scenario: Draft coupon cannot be scanned
  Given a coupon with status "draft"
  When a customer attempts to scan the coupon QR code
  Then the system returns error "Coupon is not active"
  And the coupon status remains "draft"

Scenario: Printed coupon cannot be scanned
  Given a coupon with status "printed"
  When a customer attempts to scan the coupon QR code
  Then the system returns error "Coupon has not been activated"
  And the coupon status remains "printed"

Scenario: Active coupon can be scanned
  Given a coupon with status "active"
  When a customer scans the coupon QR code
  Then the system processes the redemption
  And the coupon status changes to "used"
```

---

### FR-2: Range Activation

**Priority**: MUST HAVE

#### FR-2.1: Range Selection UI
- System SHALL provide a modal/form with:
  - "From" coupon code input field
  - "To" coupon code input field
  - Status filter dropdown (default: printed)
  - Activation note text area (optional)
  - Preview count of coupons to be activated
  - Validation warnings

#### FR-2.2: Range Validation
- System SHALL validate that:
  - Both "From" and "To" codes exist
  - "From" code is less than or equal to "To" code
  - All coupons in range belong to the current tenant
  - All coupons in range have the selected status
  - Maximum range limit is 1000 coupons

#### FR-2.3: Activation Execution
- System SHALL activate all coupons in the specified range
- System SHALL set `activated_at` timestamp
- System SHALL save optional activation note
- System SHALL perform activation in a single database transaction
- System SHALL rollback if any coupon fails validation

**Acceptance Criteria:**
```gherkin
Scenario: Successfully activate coupon range
  Given 50 coupons with codes from "COUP-001" to "COUP-050"
  And all coupons have status "printed"
  When tenant activates range from "COUP-001" to "COUP-050"
  Then all 50 coupons change status to "active"
  And all coupons have "activated_at" timestamp set
  And system displays "50 coupons activated successfully"

Scenario: Validate range boundaries
  Given coupons "COUP-001", "COUP-002", "COUP-005"
  And coupon "COUP-003" does not exist
  When tenant activates range from "COUP-001" to "COUP-005"
  Then system shows warning "Some coupons in range do not exist"
  And activation proceeds for existing coupons only

Scenario: Prevent invalid status activation
  Given coupons "COUP-001" to "COUP-010" with status "printed"
  And coupons "COUP-011" to "COUP-020" with status "active"
  When tenant activates range from "COUP-001" to "COUP-020" with filter "printed"
  Then only coupons "COUP-001" to "COUP-010" are activated
  And system displays "10 coupons activated (10 skipped due to status)"
```

---

### FR-3: Batch Activation

**Priority**: SHOULD HAVE

#### FR-3.1: Batch Activation Button
- System SHALL provide "Activate Batch" button on batch detail view
- Button SHALL only be enabled if batch contains coupons with status `printed`
- System SHALL show count of activatable coupons

#### FR-3.2: Batch Activation Execution
- System SHALL activate all printed coupons in the batch
- System SHALL set `activated_at` timestamp
- System SHALL record batch ID in activation note
- System SHALL skip coupons that are already active

**Acceptance Criteria:**
```gherkin
Scenario: Activate entire batch
  Given a batch with 100 coupons
  And 80 coupons have status "printed"
  And 20 coupons have status "active"
  When tenant clicks "Activate Batch"
  Then 80 coupons change to "active" status
  And 20 coupons remain "active"
  And system displays "80 coupons activated"
```

---

### FR-4: Print Tracking

**Priority**: MUST HAVE

#### FR-4.1: Mark as Printed
- System SHALL update coupon status from `draft` to `printed` when printed
- System SHALL set `printed_at` timestamp
- System SHALL increment `printed_count` counter
- System SHALL allow re-printing (increments count)

#### FR-4.2: Print Prevention
- System SHALL warn if attempting to print already-active coupons
- System SHALL allow printing regardless (for backup copies)

**Acceptance Criteria:**
```gherkin
Scenario: First time printing
  Given a coupon with status "draft"
  When tenant prints the coupon
  Then coupon status changes to "printed"
  And "printed_at" is set to current timestamp
  And "printed_count" is set to 1

Scenario: Re-printing coupon
  Given a coupon with status "printed" and "printed_count" = 1
  When tenant prints the coupon again
  Then coupon status remains "printed"
  And "printed_count" is incremented to 2
  And "printed_at" is updated to current timestamp
```

---

### FR-5: Status Filtering

**Priority**: MUST HAVE

#### FR-5.1: Filter Options
- System SHALL provide filter dropdown with options:
  - All Statuses
  - Draft
  - Printed
  - Active
  - Used
  - Inactive
  - Expired

#### FR-5.2: Filter Persistence
- System SHALL remember last selected filter per user session
- System SHALL update coupon count badges in real-time

**Acceptance Criteria:**
```gherkin
Scenario: Filter by printed status
  Given 100 total coupons
  And 30 have status "printed"
  When tenant selects "Printed" filter
  Then coupon list displays only 30 coupons
  And all displayed coupons have status "printed"
```

---

### FR-6: Bulk Deactivation

**Priority**: SHOULD HAVE

#### FR-6.1: Deactivation UI
- System SHALL provide range-based deactivation
- System SHALL require deactivation reason
- System SHALL show confirmation dialog

#### FR-6.2: Deactivation Execution
- System SHALL change status to `inactive`
- System SHALL store deactivation reason
- System SHALL prevent scanning of deactivated coupons

**Acceptance Criteria:**
```gherkin
Scenario: Deactivate lost coupons
  Given coupons "COUP-010" to "COUP-020" with status "printed"
  When tenant deactivates range with reason "Lost before attachment"
  Then all 11 coupons change to "inactive" status
  And deactivation reason is stored
  And coupons cannot be scanned
```

---

## Non-Functional Requirements

### NFR-1: Performance
- Range activation of 100 coupons SHALL complete within 2 seconds
- Range activation of 1000 coupons SHALL complete within 10 seconds
- Status filtering SHALL return results within 500ms

### NFR-2: Scalability
- System SHALL support activation of up to 1000 coupons per operation
- System SHALL handle 100 concurrent activation requests

### NFR-3: Reliability
- Activation transactions SHALL be atomic (all-or-nothing)
- Failed activations SHALL rollback completely
- System SHALL log all activation events for audit

### NFR-4: Usability
- Range activation form SHALL validate in real-time
- System SHALL provide clear error messages
- Confirmation dialogs SHALL show exact count affected

### NFR-5: Security
- Only tenant users SHALL activate their own coupons
- Activation SHALL require authentication
- Audit trail SHALL record user who performed activation

---

## Data Requirements

### DR-1: Database Schema Changes

```sql
-- Add new status values
ALTER TYPE coupon_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE coupon_status ADD VALUE IF NOT EXISTS 'printed';
ALTER TYPE coupon_status ADD VALUE IF NOT EXISTS 'used';

-- Add new columns
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS printed_at TIMESTAMP;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS printed_count INTEGER DEFAULT 0;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS activation_note TEXT;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status);
CREATE INDEX IF NOT EXISTS idx_coupons_printed_at ON coupons(printed_at);
CREATE INDEX IF NOT EXISTS idx_coupons_activated_at ON coupons(activated_at);

-- Update default status for new coupons
ALTER TABLE coupons ALTER COLUMN status SET DEFAULT 'draft';
```

### DR-2: Migration Strategy
- Existing coupons with status `active` SHALL remain `active`
- Existing coupons with status `inactive` SHALL remain `inactive`
- Existing coupons SHALL have `activated_at` set to their creation date
- `printed_count` SHALL default to 1 for existing coupons

---

## API Requirements

### API-1: Activate Range Endpoint

```typescript
POST /api/rewards/coupons/activate-range

Request:
{
  "from_code": "COUP-001",
  "to_code": "COUP-050",
  "status_filter": "printed",  // Optional, defaults to "printed"
  "activation_note": "Store A - Shelf 3"  // Optional
}

Response (Success):
{
  "success": true,
  "activated_count": 50,
  "skipped_count": 0,
  "message": "50 coupons activated successfully"
}

Response (Partial Success):
{
  "success": true,
  "activated_count": 45,
  "skipped_count": 5,
  "message": "45 coupons activated (5 skipped due to status)",
  "skipped_details": [
    {"code": "COUP-010", "reason": "Already active"},
    {"code": "COUP-015", "reason": "Already active"}
  ]
}

Response (Error):
{
  "success": false,
  "error": "Invalid range: from_code > to_code"
}
```

### API-2: Activate Batch Endpoint

```typescript
POST /api/rewards/coupons/activate-batch

Request:
{
  "batch_id": "uuid",
  "activation_note": "Batch deployment to Store A"  // Optional
}

Response:
{
  "success": true,
  "batch_id": "uuid",
  "activated_count": 80,
  "skipped_count": 20,
  "message": "80 coupons activated"
}
```

### API-3: Mark as Printed Endpoint

```typescript
PATCH /api/rewards/coupons/:id/print

Response:
{
  "success": true,
  "coupon_id": "uuid",
  "status": "printed",
  "printed_at": "2025-12-31T10:30:00Z",
  "printed_count": 1
}
```

---

## Validation Rules

### VR-1: Status Transition Validation
- Cannot activate a coupon that is `used` or `expired`
- Cannot deactivate a coupon that is `used`
- Cannot print a coupon that is `inactive` (must reactivate first)

### VR-2: Range Validation
- Coupon codes must follow pattern: PREFIX-NUMBER
- From code must be ≤ To code
- Range must not exceed 1000 coupons
- All coupons must belong to same tenant

### VR-3: Permission Validation
- Only tenant admins can activate coupons
- Only tenant admins can deactivate coupons
- Activation must be authenticated

---

## Testing Requirements

### TR-1: Unit Tests
- Test all status transitions
- Test range validation logic
- Test activation atomicity

### TR-2: Integration Tests
- Test range activation with database
- Test batch activation
- Test concurrent activations

### TR-3: E2E Tests
- Test complete print-to-activation workflow
- Test range activation UI
- Test status filtering

---

## Documentation Requirements

### DOC-1: User Guide
- Document coupon lifecycle workflow
- Provide step-by-step activation instructions
- Include screenshots of range activation UI

### DOC-2: API Documentation
- Document all new endpoints
- Provide request/response examples
- Document error codes

### DOC-3: Migration Guide
- Document existing coupon migration process
- Provide rollback procedures
