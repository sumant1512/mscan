# Change Proposal: Multi-Batch Coupon Creation

**Change ID**: `add-multi-batch-coupon-creation`  
**Status**: Draft  
**Author**: AI Assistant  
**Date**: 2025-12-31

## Summary

Enhance the coupon creation interface to allow tenant admins to create multiple batches of coupons with different discount amounts in a single operation. Each batch can have a different number of coupons and different discount value, streamlining the process of creating diverse coupon campaigns.

## Problem Statement

Currently, tenant admins must create coupons one batch at a time, even when they need multiple batches with different discount amounts. For example:
- 10 coupons worth $5 each
- 20 coupons worth $10 each  
- 50 coupons worth $2.50 each

This requires creating three separate batches sequentially, which is time-consuming and requires multiple form submissions.

## Goals

1. Enable creation of multiple coupon batches with different discount amounts and expiry dates in a single operation
2. Provide an intuitive UI for adding/removing batch configurations dynamically
3. Show real-time credit cost calculation across all batches
4. Support per-batch expiry date configuration with smart defaults (1 year from today)
5. Create all batches via single API call instead of multiple parallel calls
6. Provide real-time progress feedback during batch creation
7. Enable both CSV download and print functionality for generated coupons
8. Maintain all existing coupon creation features and validations

## Non-Goals

- Creating batches for different verification apps (all batches use same app)
- Creating batches with different descriptions (all batches share same description)
- Scheduling batch creation for different times
- QR code design customization per batch

## Proposed Changes

### 1. Frontend UI Changes

#### Add Mode Toggle
- Add "Multiple Batches Mode" toggle button in coupon creation header
- Toggle between:
  - **Single Mode** (default): Current behavior - one batch at a time
  - **Multiple Batches Mode**: New feature - multiple batches in one operation

#### Multi-Batch Interface (when enabled)
- Show common fields at top:
  - Verification App (required, shared by all batches)
  - Description (required, shared by all batches)
- Replace single discount/quantity/expiry inputs with dynamic batch list
- **"Add Batch" button**: Adds a new batch configuration row
- Each batch row contains:
  - Batch number/label (e.g., "Batch 1", "Batch 2")
  - **Number of Coupons** input (1-500)
  - **Discount Amount** input (min: $0.01)
  - **Expiry Date** input (datetime-local, defaults to 1 year from today)
  - **Remove button** (🗑️) to delete the batch
  - Real-time cost display for that batch (quantity × discount)
- Minimum: At least 1 batch required
- Remove button disabled when only 1 batch exists
- Each new batch automatically defaults expiry to 1 year from current date

#### Cost Calculation Updates
- Show total estimated cost across all batches
- Display cost breakdown:
  - Individual batch costs visible on each row
  - Total cost prominently displayed
  - Warning if total exceeds available credits

#### Form Validation
- Validate all common fields (verification app, description, expiry)
- Validate each batch has valid quantity (1-500) and discount (> 0)
- Prevent submission if any batch is incomplete
- Prevent submission if total cost exceeds credit balance

#### Success Feedback
- After successful creation, show all generated coupons from all batches
- Display summary: "Generated X coupons across Y batches"
- Show total cost and new credit balance
- Provide action buttons:
  - **Download CSV**: Export all coupons to CSV file
  - **Print Coupons**: Open print-friendly view of all coupons
  - **View All Coupons**: Navigate to coupon management page
- Print view includes QR codes, coupon codes, discount values, and expiry dates

### 2. Frontend Implementation Details

#### State Management
- Add `multiCouponMode` boolean flag
- Add `couponBatches` FormArray to manage dynamic batch list
- Each batch in FormArray contains:
  - `quantity` (number, required, 1-5000)
  - `discount_value` (number, required, min 0.01)

#### API Integration
- Use existing `POST /api/rewards/coupons` endpoint
- Make parallel API calls for each batch using RxJS `forkJoin`
- Each call uses same verification_app_id, description, expiry_date
- Each call has different discount_value and batch_quantity
- Wait for all calls to complete before showing results
- Aggregate all responses to display complete coupon list

#### Error Handling
- If any batch fails, show error for that specific batch
- Already-created batches remain created (no rollback across batches)
- Allow user to retry failed batches individually or return to form

### 3. User Experience Flow

#### Scenario 1: Creating Multiple Discount Tiers
**Given** tenant admin needs promotional coupons at different price points  
**When** admin clicks "Multiple Batches Mode"  
**Then** form switches to multi-batch interface

**When** admin clicks "Add Batch" three times  
**Then** three batch configuration rows appear

**When** admin enters:
- Batch 1: 10 coupons × $5.00 = $50.00
- Batch 2: 20 coupons × $10.00 = $200.00
- Batch 3: 50 coupons × $2.50 = $125.00

**Then** total cost shows $375.00

**When** admin submits form  
**Then** system shows progress bar during batch creation
**And** system creates 80 coupons total across 3 batches via single API call
**And** shows success message with all 80 coupon codes  
**And** allows CSV download and print of all codes

#### Scenario 2: Different Expiry Dates Per Batch
**Given** admin is in multi-batch mode  
**When** admin creates Batch 1 with $5 discount, 50 coupons, expiry 2025-12-31  
**And** admin creates Batch 2 with $10 discount, 30 coupons, expiry 2026-06-30  
**Then** Batch 1 coupons expire on 2025-12-31  
**And** Batch 2 coupons expire on 2026-06-30  
**And** both batches created in single API call

#### Scenario 3: Removing Unwanted Batch
**Given** admin has 4 batches configured  
**When** admin clicks remove (🗑️) on Batch 2  
**Then** Batch 2 is removed  
**And** remaining batches renumber automatically  
**And** total cost recalculates without Batch 2

#### Scenario 3: Insufficient Credits
**Given** admin has 200 credits available  
**When** admin configures batches totaling 375 credits  
**Then** submit button is disabled  
**And** warning message shows "Insufficient credits! Need 175 more credits."

#### Scenario 4: Validation Error
**Given** admin is in multi-batch mode  
**When** admin leaves discount amount empty in Batch 2  
**And** clicks submit  
**Then** form highlights Batch 2 discount field in red  
**And** shows error "Please fill in all batch fields correctly"

## Technical Considerations

### Backend API Changes
- New endpoint: `POST /api/rewards/coupons/multi-batch`
- Accepts array of batch configurations in single request
- Request body:
  ```json
  {
    "verificationAppId": "uuid",
    "description": "string",
    "batches": [
      {
        "discountAmount": number,
        "quantity": number,
        "expiryDate": "ISO 8601 datetime"
      }
    ]
  }
  ```
- Single transaction ensures atomicity (all batches succeed or all fail)
- Returns progress updates via streaming or single response with all coupons

### Credit Balance Updates
- Frontend makes **single API call** with all batches
- Backend validates total credit cost before processing
- If insufficient credits, entire operation fails (no partial creation)
- Credit deduction happens atomically for all batches
- Final balance returned in single response

### Progress Tracking
- Display indeterminate progress bar during API call
- Show "Creating X batches..." message
- Update to "Generated Y coupons across X batches" on success
- Progress bar shown from submit until response received

### Performance
- Single API call reduces network overhead vs parallel calls
- Backend processes batches sequentially or in optimized batch groups
- Maximum recommended: 10 batches per operation (reasonable UI limit)
- Each batch can have up to 5000 coupons (existing backend limit)
- Total theoretical max: 5,000 coupons in one operation (10 batches × 500 each)

### Browser Compatibility
- Dynamic form arrays work in all modern browsers
- No special polyfills required (Angular handles reactivity)

## UI/UX Design Notes

### Visual Hierarchy
- Toggle button: Prominent, easy to discover
- Batch cards: Clearly separated with borders, numbered
- Add button: Green, positive action color
- Remove button: Red/pink, destructive action color
- Cost displays: Blue highlight boxes

### Responsive Design
- Desktop: Batch rows display side-by-side inputs
- Mobile: Stack inputs vertically within each batch card
- Batch list scrollable if many batches added

### Accessibility
- All inputs have proper labels
- Remove buttons have aria-labels: "Remove Batch 1"
- Add button has clear text and icon
- Error messages associated with form controls

## Success Metrics

- Time saved: Creating 3 batches takes 1 operation vs 3 separate operations
- User satisfaction: Tenant admins can create complex campaigns efficiently
- Error reduction: All batches validated together before submission
- Adoption: Track % of coupon creations using multi-batch mode

## Risks and Mitigations

### Risk: Single API Call Failure
**Risk**: Entire batch creation fails if any validation fails  
**Mitigation**: 
- Validate total credit cost upfront on frontend
- Backend validates all batch configurations before creating any coupons
- Atomic transaction ensures all-or-nothing behavior (better than partial success)
- Clear error messages indicate which batch configuration is invalid

### Risk: Large Batch Processing Timeout
**Risk**: Creating many batches (e.g., 10 batches × 500 coupons = 5,000 total) may timeout  
**Mitigation**: 
- Set reasonable timeout limits (e.g., 60 seconds)
- Backend optimizes bulk coupon creation
- Show progress indicator to keep user informed
- Consider async processing for very large operations (future enhancement)

### Risk: Browser Timeout
**Risk**: Large batch operations might timeout in browser  
**Mitigation**:
- Set reasonable UI limits (suggest max 10 batches)
- Show progress bar during processing
- Backend timeout is 60s which should handle most cases

### Risk: Per-Batch Expiry Date Errors
**Risk**: User forgets to set expiry dates or sets invalid dates  
**Mitigation**:
- Auto-populate with 1 year from today for each new batch
- Validate dates are in future
- Clear visual feedback for validation errors

## Backward Compatibility

- Single mode remains default behavior (no disruption)
- New multi-batch API endpoint separate from existing single coupon endpoint
- Existing coupon list/management unchanged
- No database schema changes required (expiry_date already exists)

## Future Enhancements (Out of Scope)

- Import batch configurations from CSV file
- Save batch templates for reuse
- Scheduled batch creation
- Async job processing for very large operations (>5,000 coupons)
- Batch creation progress bar with real-time updates

## Approval

This proposal requires approval before implementation.

**Reviewers**: Product Owner, Tech Lead  
**Approval Date**: _Pending_
