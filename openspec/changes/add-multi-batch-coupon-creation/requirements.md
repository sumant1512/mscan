# Requirements Specification: Multi-Batch Coupon Creation

**Change ID**: `add-multi-batch-coupon-creation`  
**Capability**: Coupon Creation UI  
**Status**: ADDED

## ADDED Requirements

### Requirement: Mode Toggle Between Single and Multi-Batch
**ID**: MBCC-001  
**Priority**: High  
**Type**: Functional

The coupon creation interface shall provide a toggle to switch between Single Mode (current behavior) and Multiple Batches Mode (new feature).

#### Scenario: Toggle to Multi-Batch Mode
```gherkin
Given the tenant admin is on the coupon creation page
And the interface is in Single Mode by default
When the admin clicks the "Multiple Batches Mode" button
Then the interface switches to multi-batch mode
And a batch list section appears
And single discount/quantity inputs are hidden
And an info banner explains multi-batch mode
And the button text changes to "Single Mode"
```

#### Scenario: Toggle Back to Single Mode
```gherkin
Given the tenant admin is in Multiple Batches Mode
And has configured 2 batches
When the admin clicks the "Single Mode" button
Then the interface switches to single mode
And the batch list is cleared
And single discount/quantity inputs reappear
And any configured batches are discarded
And the button text changes to "Multiple Batches Mode"
```

---

### Requirement: Dynamic Batch Configuration Management
**ID**: MBCC-002  
**Priority**: High  
**Type**: Functional

In Multiple Batches Mode, the system shall allow users to add and remove batch configurations dynamically. Each batch shall specify the number of coupons and discount amount for that batch.

#### Scenario: Add New Batch
```gherkin
Given the tenant admin is in Multiple Batches Mode
And has 1 batch configured
When the admin clicks the "Add Batch" button
Then a new batch configuration row is added
And the new batch is labeled "Batch 2"
And the batch has empty quantity and discount inputs
And the batch has a remove button
And the total cost recalculates to include the new batch
```

#### Scenario: Remove Middle Batch
```gherkin
Given the tenant admin has 3 batches configured
  | Batch | Quantity | Discount |
  |   1   |    10    |   $5.00  |
  |   2   |    20    |  $10.00  |
  |   3   |    50    |   $2.50  |
When the admin clicks remove on Batch 2
Then Batch 2 is removed from the list
And the former Batch 3 becomes Batch 2
And batches are renumbered sequentially
And the total cost recalculates without Batch 2
```

#### Scenario: Cannot Remove Last Batch
```gherkin
Given the tenant admin has exactly 1 batch configured
When the admin views the batch row
Then the remove button is disabled
And hovering shows "At least one batch required"
```

---

### Requirement: Real-Time Cost Calculation Across Batches
**ID**: MBCC-003  
**Priority**: High  
**Type**: Functional

The system shall calculate and display the total credit cost across all configured batches in real-time as the user enters or modifies batch configurations.

#### Scenario: Cost Updates When Batch Values Change
```gherkin
Given the tenant admin has 2 batches configured
And Batch 1: 10 coupons × $5.00 = $50.00
And Batch 2: 20 coupons × $10.00 = $200.00
And total cost shows $250.00
When the admin changes Batch 1 quantity to 15
Then Batch 1 cost updates to $75.00 (15 × $5.00)
And total cost updates to $275.00 ($75 + $200)
```

#### Scenario: Individual Batch Cost Display
```gherkin
Given the tenant admin has 3 batches configured
When the admin views the batch list
Then each batch row displays its individual cost
And Batch 1 shows "Cost: 50 credits" (10 × $5)
And Batch 2 shows "Cost: 200 credits" (20 × $10)
And Batch 3 shows "Cost: 125 credits" (50 × $2.50)
And total cost section shows "375 credits"
```

---

### Requirement: Per-Batch Expiry Date Configuration
**ID**: MBCC-004a  
**Priority**: High  
**Type**: Functional

Each batch in Multiple Batches Mode shall have its own expiry date configuration. When a new batch is added, the expiry date shall auto-populate with a default value of 1 year from the current date. Users can modify this date for each batch independently.

#### Scenario: New Batch Auto-Populates Expiry Date
```gherkin
Given the tenant admin is in Multiple Batches Mode
And today's date is 2024-01-15
When the admin clicks "Add Batch"
Then a new batch is added
And the expiry date field is pre-filled with "2025-01-15T23:59:59"
And the admin can modify the expiry date if needed
```

#### Scenario: Different Expiry Dates for Different Batches
```gherkin
Given the tenant admin has 3 batches configured
When admin sets Batch 1 expiry to "2025-12-31"
And sets Batch 2 expiry to "2026-06-30"
And sets Batch 3 expiry to "2025-09-15"
And submits the form
Then Batch 1 coupons expire on 2025-12-31
And Batch 2 coupons expire on 2026-06-30
And Batch 3 coupons expire on 2025-09-15
```

#### Scenario: Expiry Date Validation
```gherkin
Given the tenant admin is configuring a batch
When admin sets expiry date to a past date
And attempts to submit
Then validation shows "Expiry date must be in the future"

When admin sets expiry date to today
Then validation shows "Expiry date must be at least 1 day in the future"
```

---

### Requirement: Shared Configuration Fields
**ID**: MBCC-004  
**Priority**: High  
**Type**: Functional

In Multiple Batches Mode, all batches shall share common configuration fields: Verification App and Description. These fields shall be entered once and apply to all batches. Each batch has its own expiry date configuration.

#### Scenario: Common Fields Apply to All Batches
```gherkin
Given the tenant admin is in Multiple Batches Mode
When the admin selects "App A" as verification app
And enters "Holiday Sale" as description
And configures 3 batches with different discount amounts and expiry dates
And submits the form
Then all generated coupons use "App A"
And all generated coupons have description "Holiday Sale"
And each batch's coupons have their respective expiry dates
```

---

### Requirement: Multi-Batch Form Validation
**ID**: MBCC-005  
**Priority**: High  
**Type**: Functional

The system shall validate that all required fields and all batch configurations are complete before allowing form submission in Multiple Batches Mode.

#### Scenario: Incomplete Batch Prevents Submission
```gherkin
Given the tenant admin is in Multiple Batches Mode
And has configured Batch 1 completely
And has added Batch 2 with quantity but no discount
When the admin attempts to submit the form
Then validation fails
And Batch 2 discount field is highlighted in red
And error message shows "Please fill in all batch fields correctly"
And the submit button remains enabled (allows correction)
```

#### Scenario: Missing Common Fields Prevents Submission
```gherkin
Given the tenant admin is in Multiple Batches Mode
And has configured 2 valid batches
But has not selected a verification app
When the admin attempts to submit the form
Then validation fails
And verification app field is highlighted
And error message shows "Please fill in verification app, description, and expiry date"
```

#### Scenario: Batch Quantity Validation
```gherkin
Given the tenant admin is in Multiple Batches Mode
When the admin enters quantity "0" in Batch 1
And attempts to submit
Then validation shows "Minimum value is 1"

When the admin enters quantity "600" in Batch 1
And attempts to submit
Then validation shows "Maximum value is 500"
```

---

### Requirement: Insufficient Credits Prevention
**ID**: MBCC-006  
**Priority**: High  
**Type**: Functional

The system shall prevent form submission if the total cost of all batches exceeds the tenant's available credit balance, and shall display a clear warning message.

#### Scenario: Warning for Insufficient Credits
```gherkin
Given the tenant has 200 credits available
And the tenant admin is in Multiple Batches Mode
When the admin configures batches totaling 375 credits
Then a warning message appears: "⚠️ Insufficient credits! Need 175 more credits."
And the submit button is disabled
And the warning is prominently displayed in red
```

#### Scenario: Submit Enabled When Credits Sufficient
```gherkin
Given the tenant has 500 credits available
And the tenant admin configures batches totaling 375 credits
Then no insufficient credits warning appears
And the submit button is enabled
```

---

### Requirement: Single API Call Multi-Batch Creation
**ID**: MBCC-007  
**Priority**: High  
**Type**: Functional

The system shall create all configured batches by making a single API call to a new multi-batch endpoint, passing all batch configurations including their individual expiry dates in one request.

#### Scenario: Successful Multi-Batch Creation via Single API Call
```gherkin
Given the tenant admin has configured 3 batches:
  | Batch | Quantity | Discount | Expiry Date  |
  |   1   |    10    |   $5.00  | 2025-12-31   |
  |   2   |    20    |  $10.00  | 2026-06-30   |
  |   3   |    50    |   $2.50  | 2025-09-15   |
And all common fields are filled (App, Description)
When the admin clicks "Generate All Batches"
Then the system makes 1 API call to POST /api/rewards/coupons/multi-batch
And request body contains:
  {
    "verificationAppId": "uuid",
    "description": "Holiday Sale",
    "batches": [
      {"quantity": 10, "discountAmount": 5.00, "expiryDate": "2025-12-31T23:59:59Z"},
      {"quantity": 20, "discountAmount": 10.00, "expiryDate": "2026-06-30T23:59:59Z"},
      {"quantity": 50, "discountAmount": 2.50, "expiryDate": "2025-09-15T23:59:59Z"}
    ]
  }
And shows progress bar: "Creating 3 batches..."
And waits for single response
Then shows success: "80 coupons created successfully across 3 batches!"
And displays all 80 generated coupon codes
And shows total cost: "Total cost: 375 credits"
And shows new balance
```

---

### Requirement: Aggregated Results Display
**ID**: MBCC-008  
**Priority**: Medium  
**Type**: Functional

After successful multi-batch creation, the system shall display all generated coupons from all batches in a single results view with summary statistics and provide both CSV download and print options.

#### Scenario: Display All Generated Coupons
```gherkin
Given the tenant admin submitted a multi-batch form with 3 batches
And Batch 1 generated 10 coupons expiring 2025-12-31
And Batch 2 generated 20 coupons expiring 2026-06-30
And Batch 3 generated 50 coupons expiring 2025-09-15
When API call completes successfully
Then the results page shows all 80 coupon codes
And shows summary: "Generated 80 coupons across 3 batches"
And shows total cost: "Total cost: 375 credits. New balance: 125"
And provides "Download CSV" button
And provides "Print Coupons" button
And provides "View All Coupons" button to navigate to coupon list
```

#### Scenario: CSV Export Includes All Batches
```gherkin
Given the tenant admin created coupons using multi-batch mode
And generated 80 coupons across 3 batches with different expiry dates
When the admin clicks "Download CSV"
Then a CSV file downloads
And the CSV contains all 80 coupon codes
And each row has: coupon_code, discount_value, expiry_date, qr_code_url
And coupons from different batches are identifiable by discount_value and expiry_date
```

#### Scenario: Print View for All Coupons
```gherkin
Given the tenant admin created coupons using multi-batch mode
And generated 80 coupons across 3 batches
When the admin clicks "Print Coupons"
Then a print-friendly view opens
And displays all 80 coupons with QR codes
And each coupon shows: QR code, coupon code, discount value, expiry date
And coupons are formatted for easy printing (e.g., grid layout)
And browser print dialog appears
```

---

### Requirement: Atomic Batch Creation
**ID**: MBCC-009  
**Priority**: High  
**Type**: Functional

The system shall create all batches atomically via a single API call. If any validation fails or insufficient credits exist, the entire operation shall fail without creating any coupons (all-or-nothing behavior).

#### Scenario: Insufficient Credits Prevents All Batch Creation
```gherkin
Given the tenant has 220 credits available
And the tenant admin configures 3 batches totaling 375 credits:
  | Batch | Quantity | Discount | Cost |
  |   1   |    10    |   $5.00  | $50  |
  |   2   |    20    |  $10.00  | $200 |
  |   3   |    50    |   $2.50  | $125 |
When the admin submits the form
Then frontend shows warning: "Insufficient credits! Need 155 more credits."
And submit button is disabled
And no API call is made
```

#### Scenario: Backend Validation Failure Prevents Creation
```gherkin
Given the tenant admin configures 2 batches
And Batch 1 has valid configuration
And Batch 2 has invalid expiry date (in the past)
When the admin submits the form
Then backend returns 400 error
And no coupons are created (not even Batch 1)
And error message shows "Batch 2: Expiry date must be in the future"
```

---

### Requirement: Real-Time Progress Feedback During Creation
**ID**: MBCC-009a  
**Priority**: High  
**Type**: Functional

The system shall display a real-time progress indicator when submitting the multi-batch creation form to provide feedback during the API call.

#### Scenario: Progress Bar Shown During Creation
```gherkin
Given the tenant admin has configured 3 batches
When the admin clicks "Generate All Batches"
Then a progress bar appears immediately
And displays message "Creating 3 batches..."
And submit button becomes disabled
And progress bar shows indeterminate animation
And waits for API response
```

#### Scenario: Progress Bar Updates on Success
```gherkin
Given batch creation is in progress
And progress bar is showing
When the API call completes successfully
Then progress bar changes to success state briefly
And displays "✓ Created 80 coupons across 3 batches!"
And progress bar disappears after 1-2 seconds
And results view appears with all coupons
```

#### Scenario: Progress Bar Shows Error State
```gherkin
Given batch creation is in progress
When the API call fails (e.g., insufficient credits)
Then progress bar changes to error state
And displays "✗ Failed to create coupons"
And error details shown below progress bar
And submit button re-enables for retry
```

---

### Requirement: UI/UX Design Requirements
**ID**: MBCC-010  
**Priority**: Medium  
**Type**: Non-Functional

The multi-batch interface shall be intuitive, visually clear, and accessible, following modern web design standards.

#### Visual Requirements
- Toggle button: Prominent position in header, clear icon/text
- Batch cards: White background, bordered, with clear separation
- Add Batch button: Green background, "+" icon, clear call-to-action
- Remove button: Red/pink, trash icon, aligned to right of batch row
- Cost displays: Blue highlight boxes, clear numeric formatting
- Info banner: Blue background, info icon, dismissible

#### Responsive Design
- Desktop: Batch inputs display horizontally in rows
- Tablet: Batch inputs may wrap based on width
- Mobile: Batch inputs stack vertically within cards
- Batch list scrollable if exceeds viewport height

#### Accessibility
- All inputs have associated `<label>` elements
- Remove buttons have descriptive aria-labels ("Remove Batch 1")
- Error messages use `aria-live` regions
- Keyboard navigation works for all interactive elements
- Focus indicators visible on all focusable elements
- Color contrast meets WCAG AA standards

#### Scenario: Keyboard Navigation
```gherkin
Given the tenant admin is in Multiple Batches Mode
When the admin navigates using Tab key
Then focus moves through inputs in logical order:
  - Verification app dropdown
  - Description input
  - Expiry date input
  - Batch 1 quantity
  - Batch 1 discount
  - Batch 1 remove button
  - Add Batch button
  - Submit button
And each focused element shows visible focus ring
```

---

### Requirement: Performance Requirements
**ID**: MBCC-011  
**Priority**: Low  
**Type**: Non-Functional

The multi-batch creation process shall complete within acceptable time limits and handle reasonable batch sizes efficiently.

#### Performance Targets
- Adding/removing batches: Instant (<100ms UI response)
- Cost recalculation: Real-time (<50ms per change)
- API calls: Complete within 60 seconds for 10 batches
- CSV generation: Complete within 5 seconds for 5,000 coupons
- UI remains responsive during batch creation

#### Scenario: Maximum Load Test
```gherkin
Given the tenant admin configures 10 batches
And each batch has 500 coupons (5,000 total)
When the admin submits the form
Then all 10 API calls execute in parallel
And the operation completes within 60 seconds
And no browser timeout occurs
And results page loads within 2 seconds
And CSV download completes within 5 seconds
```

---

## System Behavior Changes

### Changed: Cost Estimation Display
**From**: Shows cost for single batch only  
**To**: Shows individual batch costs + total cost across all batches in multi-batch mode

### Changed: Form Submission Logic
**From**: Single API call to create one batch  
**To**: Multiple parallel API calls (one per batch) in multi-batch mode; single call in single mode

### Changed: Results Display
**From**: Shows coupons from single batch  
**To**: Shows aggregated coupons from all batches with summary statistics

---

## Dependencies

- **Existing Backend API**: POST /api/rewards/coupons (no changes needed)
- **Angular FormArray**: Required for dynamic batch list management
- **RxJS forkJoin**: Required for parallel API call orchestration
- **Existing Credit System**: Balance checks and deductions per batch

---

## Testing Requirements

### Unit Tests
- Form state management (mode switching, batch add/remove)
- Cost calculation logic (single batch, multiple batches)
- Form validation (common fields, batch fields, credit checks)
- API integration mocks (forkJoin behavior)

### Integration Tests
- Complete multi-batch creation flow
- Partial failure scenarios
- Credit balance updates
- CSV export with multiple batches

### E2E Tests
- Toggle mode and create multiple batches
- Submit and verify all coupons created
- Download CSV and verify contents
- Validation error handling
- Insufficient credits prevention

---

## Acceptance Criteria

✅ User can toggle between Single and Multiple Batches modes  
✅ User can add/remove batches dynamically  
✅ Each batch shows real-time cost calculation  
✅ Total cost updates automatically across all batches  
✅ Form validates all batches before submission  
✅ Submit disabled if total cost exceeds available credits  
✅ All batches created in parallel via existing API  
✅ Success page shows all generated coupons from all batches  
✅ CSV export includes all coupons from all batches  
✅ Error handling works for partial failures  
✅ UI is responsive and accessible  
✅ Performance meets targets for maximum load
