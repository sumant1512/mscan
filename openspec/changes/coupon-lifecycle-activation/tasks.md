# Implementation Tasks: Coupon Lifecycle & Range Activation

**Change ID**: `coupon-lifecycle-activation`
**Status**: ✅ Core features implemented, ⚠️ Some tasks pending (server APIs and partial frontend complete; tests/doc pending)

## Phase 1: Database & Backend Foundation

### Database Migration
- [x] Create migration file for new status values (add-coupon-lifecycle.sql)
- [x] Add `printed_at` timestamp column
- [x] Add `activated_at` timestamp column
- [x] Add `printed_count` integer column (default: 0)
- [x] Add `activation_note` text column
- [x] Add `deactivation_reason` text column
- [x] Create index on `status` column
- [x] Create index on `printed_at` column
- [x] Create index on `activated_at` column
- [x] Update default status to 'draft' for new coupons
- [x] Write migration script for existing coupons (set status to 'active', activated_at to created_at)
- [x] Test migration with sample data
- [ ] Create rollback script

**Estimated Time**: 3 hours

---

## Phase 2: Backend API - Range Activation

### Activate Range Endpoint
- [x] Create `POST /api/rewards/coupons/activate-range` route
- [x] Implement request validation:
  - [x] Validate `from_reference` and `to_reference` are provided
  - [x] Validate code format
  - [x] Validate from_reference ≤ to_reference
  - [x] Validate status_filter is valid enum value
- [x] Implement range query logic:
  - [x] Parse coupon reference
  - [x] Query coupons in range by tenant_id
  - [x] Filter by status (default: 'printed')
  - [x] Limit to 1000 coupons max
- [x] Implement activation logic:
  - [x] Begin database transaction
  - [x] Validate all coupons can be activated
  - [x] Update status to 'active'
  - [x] Set activated_at timestamp
  - [x] Save activation_note if provided
  - [x] Commit transaction or rollback on error
- [x] Return response with activated_count and skipped_count
- [x] Add error handling and logging
- [x] Write controller unit tests
- [ ] Write integration tests (stub exists; refine and stabilize)

**Estimated Time**: 6 hours

---

## Phase 3: Backend API - Additional Endpoints

### Activate Batch Endpoint
- [x] Create `POST /api/rewards/coupons/activate-batch` route
- [x] Implement batch_id validation
- [x] Query all coupons in batch with status 'printed'
- [x] Perform bulk activation with transaction
- [x] Return activation summary
- [ ] Add unit tests
- [ ] Add integration tests

### Mark as Printed Endpoint
- [x] Create `PATCH /api/rewards/coupons/:id/print` route
- [x] Validate coupon exists and belongs to tenant
- [x] Update status from 'draft' to 'printed'
- [x] Set printed_at timestamp
- [x] Increment printed_count
- [x] Handle re-printing (update timestamp, increment count)
- [ ] Add unit tests

### Bulk Deactivate Endpoint
- [x] Create `POST /api/rewards/coupons/deactivate-range` route
- [x] Implement range validation (similar to activate)
- [x] Require deactivation_reason parameter
- [x] Update status to 'inactive'
- [x] Save deactivation_reason
- [ ] Add unit tests
- [ ] Add integration tests

### Update Scan Verification
- [x] Modify coupon verification logic
- [x] Only allow scanning if status = 'active'
- [x] Return appropriate error messages for other statuses:
  - `draft`: "Coupon has not been activated"
  - `printed`: "Coupon has not been activated"
  - `used`: "Coupon has already been used"
  - `inactive`: "Coupon has been deactivated"
  - `expired`: "Coupon has expired"
- [ ] Add unit tests for each status (pending)
- [ ] Update API documentation (pending)

**Estimated Time**: 6 hours

---

## Phase 4: Frontend - Coupon List Updates

### Status Filtering
- [x] Add status filter dropdown to coupon list component
- [x] Implement filter options:
  - [x] All Statuses
  - [x] Draft (default on creation)
  - [x] Printed
  - [x] Active
  - [x] Used
  - [x] Inactive
  - [x] Expired
- [x] Connect filter to API call
- [ ] Update coupon count badges
- [ ] Persist filter selection in session storage
- [x] Add loading states during filtering

### Status Display
- [x] Create status badge component
- [x] Add color coding:
  - `draft`: Gray
  - `printed`: Blue
  - `active`: Green
  - `used`: Purple
  - `inactive`: Red
  - `expired`: Orange
- [x] Display status badge in coupon list
- [x] Display printed_at timestamp (if exists)
- [x] Display activated_at timestamp (if exists)
- [ ] Add tooltips with status explanations

### Coupon List Layout
- [x] Update table/card layout to show new fields
- [x] Add "Printed On" column
- [x] Add "Activated On" column
- [ ] Make columns sortable by dates
- [x] Add print count indicator

**Estimated Time**: 4 hours

---

## Phase 5: Frontend - Range Activation UI

### Range Activation Modal
- [ ] Create ActivateRangeModal component
- [ ] Design modal layout:
  - [ ] "From Code" input field
  - [x] "From Reference" input field
  - [x] "To Reference" input field
  - [x] Status filter dropdown (default: printed)
  - [x] Activation note textarea (optional)
  - [x] Preview coupon count
  - [x] Validation error messages
  - [x] Cancel and Activate buttons
- [x] Implement real-time validation:
  - [x] Check code format on input
  - [x] Validate from ≤ to
  - [ ] Show warning if range > 100 coupons
  - [x] Disable submit if validation fails
- [x] Implement preview count:
  - [x] Query coupon count in range (debounced)
  - [x] Display "X coupons will be activated"
  - [x] Update count when inputs change
- [x] Implement activation:
  - [x] Call activate-range API
  - [x] Show loading spinner during activation
  - [x] Display success message with count
  - [x] Display partial success with skipped count
  - [x] Handle errors gracefully
  - [x] Refresh coupon list on success
  - [x] Close modal on success

### Add Activation Triggers
- [x] Add "Activate Range" button to toolbar
- [x] Add "Activate Batch" button to batch detail view
- [ ] Show button only for appropriate permissions
- [ ] Disable if no coupons available

**Estimated Time**: 6 hours

---

## Phase 6: Frontend - Print Tracking

### Print Flow Update
- [x] Modify print button to call mark-as-printed API
- [x] Show loading state during API call
- [x] Update coupon status locally after success
- [ ] Handle re-printing scenario:
  - [ ] Show warning if coupon already printed
  - [ ] Allow re-printing with confirmation
  - [ ] Display updated print count
- [ ] Update print modal to show only draft/printed coupons
- [x] Add bulk print functionality:
  - [x] Select multiple draft coupons
  - [x] Print all and mark as printed in one operation

**Estimated Time**: 3 hours

---

## Phase 7: Frontend - Batch Activation

### Batch Detail View
- [x] Add "Activate Batch" button
- [x] Show count of activatable coupons (printed status)
- [x] Implement confirmation dialog:
  - [x] Display batch name and coupon count
  - [x] Optional activation note
  - [ ] Warning if some coupons already active
- [x] Call activate-batch API
- [x] Show success message
- [ ] Update batch statistics
- [x] Refresh coupon list

**Estimated Time**: 2 hours

---

## Phase 8: Frontend - Bulk Deactivation

### Deactivation UI
- [ ] Create DeactivateRangeModal component
- [ ] Add "Deactivate Range" button
- [ ] Implement range selection (similar to activation)
- [ ] Require deactivation reason input
- [ ] Show confirmation dialog with warning
- [ ] Call deactivate-range API
- [ ] Display success message
- [ ] Refresh coupon list

**Estimated Time**: 3 hours

---

## Phase 9: Testing

### Backend Unit Tests
- [ ] Test activate-range validation logic
- [ ] Test activate-range with valid inputs
- [ ] Test activate-range with invalid range
- [ ] Test activate-range transaction rollback
- [ ] Test activate-batch for single batch
- [ ] Test mark-as-printed status transition
- [ ] Test mark-as-printed with re-printing
- [ ] Test deactivate-range logic
- [ ] Test scan verification for each status
- [ ] Test concurrent activation requests

### Backend Integration Tests
- [ ] Test range activation with database
- [ ] Test batch activation with database
- [ ] Test activation atomicity (all-or-nothing)
- [ ] Test status transitions end-to-end
- [ ] Test print tracking with database

### Frontend Unit Tests
- [ ] Test ActivateRangeModal component
- [ ] Test range validation logic
- [ ] Test status filter component
- [ ] Test status badge rendering
- [ ] Test print tracking UI
- [ ] Test batch activation UI

### E2E Tests
- [ ] Test complete workflow: create → print → activate → scan
- [ ] Test range activation from UI
- [ ] Test batch activation from UI
- [ ] Test status filtering
- [ ] Test deactivation of lost coupons
- [ ] Test re-printing scenario
- [ ] Test validation error handling
- [ ] Test insufficient permissions

**Estimated Time**: 8 hours

---

## Phase 10: Documentation & Deployment

### Documentation
- [ ] Update API documentation with new endpoints
- [ ] Document request/response schemas
- [ ] Document error codes and messages
- [ ] Create user guide for coupon lifecycle
- [ ] Add screenshots of range activation UI
- [ ] Document migration steps for existing coupons
- [ ] Create troubleshooting guide
- [ ] Update README with new features

### Code Review & QA
- [ ] Code review by tech lead
- [ ] Security review of activation logic
- [ ] UX review of range activation modal
- [ ] Accessibility audit (keyboard navigation)
- [ ] Cross-browser testing
- [ ] Mobile responsiveness testing
- [ ] Performance testing with 1000 coupons

### Deployment
- [ ] Run database migration in staging
- [ ] Deploy backend to staging
- [ ] Deploy frontend to staging
- [ ] Staging acceptance testing
- [ ] Run database migration in production
- [ ] Deploy backend to production
- [ ] Deploy frontend to production
- [ ] Monitor for errors in first 24 hours
- [ ] Collect user feedback

**Estimated Time**: 4 hours

---

## Estimated Effort Summary

| Phase | Description | Time |
|-------|-------------|------|
| 1 | Database & Backend Foundation | 3 hours |
| 2 | Backend API - Range Activation | 6 hours |
| 3 | Backend API - Additional Endpoints | 6 hours |
| 4 | Frontend - Coupon List Updates | 4 hours |
| 5 | Frontend - Range Activation UI | 6 hours |
| 6 | Frontend - Print Tracking | 3 hours |
| 7 | Frontend - Batch Activation | 2 hours |
| 8 | Frontend - Bulk Deactivation | 3 hours |
| 9 | Testing | 8 hours |
| 10 | Documentation & Deployment | 4 hours |
| **Total** | | **45 hours (5-6 days)** |

---

## Dependencies

- Multi-batch coupon creation feature (completed)
- Credit system for validation
- User permissions system
- PostgreSQL database

---

## Risk Mitigation

1. **Migration Risk**: Test migration thoroughly in staging with production data copy
2. **Performance Risk**: Add database indexes before deployment
3. **User Adoption Risk**: Provide clear onboarding tutorial and help tooltips
4. **Rollback Plan**: Keep migration rollback script ready for quick revert

---

## Success Criteria

- [ ] All unit tests passing (>95% coverage)
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Range activation completes in <2s for 100 coupons
- [ ] Zero production errors in first 48 hours
- [ ] User feedback score >4/5
- [ ] Zero incidents of lost coupons being scanned
