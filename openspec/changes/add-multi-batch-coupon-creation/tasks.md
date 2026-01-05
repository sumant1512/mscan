# Implementation Tasks

**Change ID**: `add-multi-batch-coupon-creation`

## Frontend Tasks

### Phase 1: Component Structure
- [x] Add `multiCouponMode` boolean property to CouponCreateComponent
- [x] Add `couponBatches` FormArray to couponForm
- [x] Create toggle button in component template
- [x] Implement `toggleMultiCouponMode()` method
- [x] Update form validators when switching modes

### Phase 2: Batch Management
- [x] Implement `addCouponBatch()` method to add new batch to FormArray
- [x] Auto-populate expiry date with 1 year from current date when adding batch
- [x] Implement `removeCouponBatch(index)` method to remove batch
- [x] Create batch form group structure with description, quantity, discount_value, and expiry_date
- [x] Add value change subscriptions for real-time cost calculation
- [x] Disable remove button when only 1 batch exists

### Phase 3: UI Layout
- [x] Add mode toggle button to header with icon
- [x] Create info banner for multi-batch mode explanation
- [x] Design batch list container with proper spacing
- [x] Create batch card component/template with:
  - Batch number label
  - Description input field (per-batch)
  - Quantity input field
  - Discount amount input field
  - Expiry date input field (datetime-local, pre-filled with 1 year from today)
  - Remove button
  - Cost display
- [x] Add "Add Batch" button with green styling
- [x] Ensure responsive layout (mobile/desktop)
- [x] Implement 2-column grid layout for single mode
- [x] Implement 2-column grid layout for multi-batch mode

### Phase 4: Cost Calculation
- [x] Update `calculateEstimatedCost()` to handle both modes
- [x] Calculate individual batch costs in real-time
- [x] Aggregate total cost across all batches
- [x] Update cost display UI to show total
- [x] Add insufficient credits warning logic

### Phase 5: Form Submission & Progress Tracking
- [x] Split `onSubmit()` into `onSubmitSingle()` and `onSubmitMultiple()`
- [x] Implement `onSubmitMultiple()` method
- [x] Validate common field (verification app only)
- [x] Validate all batches have valid data (description, quantity, discount, expiry date)
- [x] Validate expiry dates are in the future for all batches
- [x] Create single API request payload with all batches (per-batch descriptions)
- [x] Show progress bar immediately on submit
- [x] Disable submit button during API call
- [x] Make single API call to `POST /api/rewards/coupons/multi-batch`
- [x] Handle successful response with all coupons
- [x] Update progress bar to success state
- [x] Update `generatedCoupons` array with all results
- [x] Show combined success message with total counts
- [x] Hide progress bar after success message
- [x] Fix single mode to always show batch results (print/CSV screen)

### Phase 6: Error Handling & Feedback
- [x] Add error handling for API call failure
- [x] Update progress bar to error state on failure
- [x] Display validation errors from backend (e.g., which batch has invalid data)
- [x] Re-enable submit button on error for retry
- [x] Update credit balance from response
- [ ] Test insufficient credit scenario (atomic all-or-nothing)
- [ ] Test form validation for incomplete batches
- [ ] Test past expiry date validation

### Phase 7: Styling
- [x] Style toggle button with hover effects
- [x] Style info banner with blue theme
- [x] Style batch container with border and background
- [x] Style batch cards with white background and borders
- [x] Style Add Batch button (green, with icon)
- [x] Style Remove button (red/pink with icon)
- [x] Style batch cost display boxes
- [x] Add hover effects and transitions
- [x] Ensure consistent spacing and alignment
- [x] Implement 2-column grid CSS with responsive breakpoint

### Phase 8: CSV Export & Print Functionality
- [x] Update `downloadCouponsCSV()` to handle multiple batches
- [x] Include expiry_date column in CSV for each coupon
- [x] Add "Print Coupons" button to success view
- [x] Create print-friendly component/view
- [x] Display coupons in grid layout with QR codes
- [x] Include coupon code, discount value, expiry date in print view
- [x] Implement `printCoupons()` method to open print dialog
- [x] Add print CSS (@media print) for proper formatting
- [ ] Test CSV download with multi-batch results
- [ ] Test print functionality with different batch sizes

## Testing Tasks

### Unit Tests
- [x] Test `toggleMultiCouponMode()` switches state correctly
- [x] Test `addCouponBatch()` adds form group with auto-populated expiry date
- [x] Test expiry date defaults to 1 year from current date
- [x] Test `removeCouponBatch()` removes correct index
- [x] Test cost calculation in single mode
- [x] Test cost calculation in multi-batch mode
- [x] Test form validation in both modes
- [x] Test expiry date validation (must be in future)
- [x] Test `onSubmitSingle()` logic
- [x] Test `onSubmitMultiple()` with mock single API call
- [x] Test progress bar state changes (loading, success, error)

### Integration Tests
- [x] Test mode switching clears batches properly
- [x] Test adding multiple batches updates UI correctly
- [x] Test each batch has independent expiry date field
- [x] Test removing middle batch renumbers properly
- [x] Test cost updates when batch values change
- [x] Test submit button disabled states
- [x] Test progress bar appears immediately on submit
- [x] Test successful multi-batch creation end-to-end (single API call)
- [x] Test atomic failure (all-or-nothing behavior)
- [x] Test insufficient credits prevents submission

### E2E Tests
- [ ] Create E2E test: Toggle to multi-batch mode
- [ ] Create E2E test: Add 3 batches with different values and expiry dates
- [ ] Create E2E test: Verify auto-populated expiry dates (1 year default)
- [ ] Create E2E test: Remove a batch
- [ ] Create E2E test: Submit multi-batch form successfully
- [ ] Create E2E test: Verify progress bar appears during creation
- [ ] Create E2E test: Verify all coupons created with correct expiry dates
- [ ] Create E2E test: Download CSV with all coupons (includes expiry dates)
- [ ] Create E2E test: Print coupons functionality
- [ ] Create E2E test: Insufficient credits warning
- [ ] Create E2E test: Validation error handling (past expiry date)

## Backend Tasks

- [x] Create new endpoint: `POST /api/rewards/coupons/multi-batch`
- [x] Accept request body with batches array (description, quantity, discountAmount, expiryDate)
- [x] Validate total credit cost before processing
- [x] Implement atomic transaction for all batches
- [x] Return all generated coupons in single response
- [x] Add backend validation for expiry dates (must be future)
- [x] Add backend validation for per-batch descriptions
- [x] Update service interface to support per-batch descriptions
- [ ] Update API documentation for new endpoint
- [ ] Add unit tests for multi-batch endpoint
- [ ] Add integration tests for atomic behavior

## Documentation Tasks

- [ ] Update user guide with multi-batch feature screenshots
- [ ] Document per-batch expiry date configuration
- [ ] Add inline help text/tooltips in UI
- [ ] Document CSV export format with multiple batches and expiry dates
- [ ] Document print functionality
- [ ] Update API integration documentation (single multi-batch endpoint)
- [ ] Document progress bar behavior

## Review & Quality Assurance

- [ ] Code review by tech lead
- [ ] UI/UX review by product owner
- [ ] Accessibility audit (keyboard navigation, screen readers)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness testing
- [ ] Performance testing with maximum batches (10 batches × 500 coupons)

## Deployment

- [ ] Merge to development branch
- [ ] Deploy to staging environment
- [ ] Staging acceptance testing
- [ ] Production deployment
- [ ] Monitor for errors in first 24 hours
- [ ] Collect user feedback

## Estimated Effort

- **Frontend Development**: 10-12 hours
- **Backend Development**: 6-8 hours
- **Testing**: 5-7 hours
- **Documentation**: 2-3 hours
- **Review & QA**: 3-4 hours
- **Total**: ~26-34 hours (3-4 days)

**Note**: Estimated effort increased due to:
- Backend multi-batch endpoint development
- Per-batch expiry date implementation
- Progress bar component
- Print functionality
- More comprehensive testing requirements
