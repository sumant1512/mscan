# Implementation Tasks: Enhanced Coupon Types

**🔴 CRITICAL BUG IDENTIFIED**: Single-use coupon validation (max_scans_per_code) is NOT implemented in scan verification. Database field exists and is set correctly, but verifyScan() in rewards.controller.js does not check per-code scan count. This allows batch coupons to be scanned unlimited times.

## Database Changes
- [x] Create migration file for new columns
- [x] Add `max_scans_per_code` INTEGER column to coupons table (for single-use validation)
- [x] Add `batch_id` UUID column to coupons table
- [x] Add `batch_quantity` INTEGER column to coupons table
- [x] Create index on `batch_id` column
- [x] Test migration on development database

## Backend API Changes
- [x] Update coupon creation endpoint to accept `coupon_generation_type`
- [x] Update coupon creation endpoint to accept `batch_quantity`
- [x] Implement batch coupon code generation logic
- [x] Update coupon-generator service for batch generation
- [x] Update credit calculator for batch pricing
- [ ] Add validation for minimum purchase amount on percentage coupons (N/A - percentage type not implemented)
- [x] Add validation for batch quantity limits (max 500)
- [ ] Update scan validation logic for single-use codes (CRITICAL: Missing per-code scan count check)
- [ ] Update scan validation for minimum purchase amount (N/A - percentage type not implemented)
- [x] Return array of generated codes for batch requests
- [x] Update transaction logging for batch creation

## Backend Tests
- [x] Unit test: Generate batch of coupons
- [x] Unit test: Validate unique codes in batch
- [x] Unit test: Credit calculation for batch
- [ ] Unit test: Single-use scan validation (BLOCKED: Feature not implemented)
- [x] Integration test: Create batch coupons end-to-end
- [ ] Integration test: Scan single-use coupon twice (should fail) (BLOCKED: Feature not implemented)
- [ ] Integration test: Percentage coupon with min purchase validation (N/A - percentage type not implemented)
- [x] Integration test: Insufficient credits for batch

## Frontend Model Updates
- [x] Update coupon model interface with new fields
- [x] Add batch response model (array of coupons)
- [x] Update create coupon request model

## Frontend Component Updates
- [x] Add "Number of Coupons" input field (auto-detects batch when > 1)
- [x] Add conditional form fields for batch generation
- [x] Update form validation logic
- [x] Update cost estimation for batch generation
- [x] Update success message to show all generated codes
- [x] Add CSV export functionality for batch codes
- [x] Add copy-to-clipboard functionality for codes
- [x] Update error handling for batch failures
- [ ] Make "Minimum Purchase Amount" required for percentage type (N/A - percentage type not implemented)
- [ ] Update "Total Usage Limit" label to "Max Number of Users" for percentage (N/A - percentage type not implemented)

## Frontend Service Updates
- [x] Update RewardsService.createCoupon to handle batch response
- [x] Add method to export codes as CSV
- [x] Update response typing

## API Documentation
- [x] Update API.md with new coupon creation parameters
- [x] Document batch generation endpoint behavior
- [x] Add examples for batch coupons
- [x] Document error responses
- [ ] Add examples for percentage coupons (N/A - percentage type not implemented)

## Testing
- [ ] Manual test: Create percentage coupon with min purchase (N/A - percentage type not implemented)
- [x] Manual test: Create batch of 10 fixed amount coupons
- [ ] Manual test: Scan single-use coupon twice (BLOCKED: Feature not implemented)
- [x] Manual test: Verify credit cost calculation
- [x] Manual test: Download CSV of generated codes
- [x] Manual test: Create batch with insufficient credits

## Documentation
- [x] Update README with new coupon types
- [x] Add user guide for batch coupon generation
- [x] Document CSV export format
