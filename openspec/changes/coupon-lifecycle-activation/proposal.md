# Coupon Lifecycle & Range Activation

**Change ID**: `coupon-lifecycle-activation`  
**Status**: Proposed  
**Created**: 2025-12-31  
**Author**: System

## Overview

Implement a comprehensive coupon lifecycle management system with range-based bulk activation. This addresses the real-world problem where businesses print coupons in batches but need to control which coupons are active and scannable.

## Problem Statement

Currently, coupons are active immediately upon creation, which creates several problems:

1. **Lost Coupon Risk**: If printed coupons are lost before attachment to products, they could still be scanned fraudulently
2. **No Inventory Tracking**: Cannot track which coupons have been printed vs. physically deployed
3. **Bulk Management**: No efficient way to activate multiple coupons that have been attached to products
4. **Audit Trail**: No record of when coupons were printed or activated

### Example Scenario:
- Create 100 coupons in 10 batches
- Print and attach 50 coupons to products → Should be ACTIVE
- Print 20 coupons but lose them before attachment → Should be DEACTIVATED
- Keep 30 coupons unprinted → Should be DRAFT

## Proposed Solution

### 1. Coupon Lifecycle Status

Introduce a status workflow:

```
draft → printed → active → used/expired
  ↓        ↓         ↓
inactive  inactive  inactive
```

**Status Definitions:**
- **`draft`**: Created but not printed (default state, not scannable)
- **`printed`**: Printed but not yet activated (not scannable)
- **`active`**: Activated and physically attached (scannable)
- **`used`**: Customer has scanned/redeemed (not scannable)
- **`inactive`**: Manually deactivated for lost/damaged coupons (not scannable)
- **`expired`**: Past expiry date (not scannable)

### 2. Range Selection Activation

Primary activation method using coupon code ranges:

```
┌─────────────────────────────────────────┐
│ Activate Coupons by Range              │
├─────────────────────────────────────────┤
│ From: COUP-001  To: COUP-050            │
│                                         │
│ Status: printed ▼                       │
│                                         │
│ Preview: 50 coupons will be activated  │
│                                         │
│ Activation Note (optional):            │
│ [Attached to products - Store A]       │
│                                         │
│ [Cancel] [✓ Activate Range]            │
└─────────────────────────────────────────┘
```

### 3. Enhanced Print Flow

When printing coupons:
1. User selects coupons with `draft` status
2. Click "Print Coupons" button
3. System marks them as `printed` with timestamp
4. Generate print view
5. Coupons now appear in "Printed" filter view

### 4. Activation Tracking

Track activation metadata:
- `printed_at`: Timestamp when coupon was printed
- `activated_at`: Timestamp when coupon was activated
- `printed_count`: Number of times coupon was printed
- `activation_note`: Optional note describing activation batch/location

## Benefits

1. **Fraud Prevention**: Printed-but-lost coupons cannot be scanned
2. **Inventory Control**: Clear visibility of coupon deployment status
3. **Audit Trail**: Complete history of print and activation events
4. **Batch Efficiency**: Activate 50+ coupons in seconds using range selection
5. **Business Intelligence**: Track printing and activation patterns

## User Stories

### US-1: Print Management
**As a** store manager  
**I want to** print coupons and have them marked as "printed" but not active  
**So that** I can control when they become scannable

### US-2: Range Activation
**As a** store manager  
**I want to** activate coupons by specifying a code range (e.g., COUP-001 to COUP-050)  
**So that** I can quickly activate all coupons I've attached to products

### US-3: Lost Coupon Handling
**As a** store manager  
**I want to** deactivate printed coupons that were lost or damaged  
**So that** they cannot be scanned fraudulently

### US-4: Status Filtering
**As a** store manager  
**I want to** filter coupons by status (draft, printed, active, used)  
**So that** I can see exactly which coupons are in each stage

### US-5: Batch Activation
**As a** store manager  
**I want to** activate all coupons in a batch at once  
**So that** I can deploy entire batches efficiently

## Technical Approach

### Database Changes
- Add `printed_at`, `activated_at` timestamps
- Add `printed_count`, `activation_note` fields
- Update `status` enum to include new values
- Add indexes for status filtering

### Backend APIs
- `POST /api/rewards/coupons/activate-range` - Range activation
- `POST /api/rewards/coupons/activate-batch` - Batch activation
- `POST /api/rewards/coupons/bulk-deactivate` - Bulk deactivation
- `PATCH /api/rewards/coupons/:id/print` - Mark as printed

### Frontend Features
- Status filter dropdown (Draft, Printed, Active, Used, Inactive)
- Range activation modal with validation
- Batch activation button
- Status badges with color coding
- Print tracking in coupon list
- Activation history view

## Success Metrics

1. **Activation Efficiency**: Average time to activate 50 coupons < 10 seconds
2. **Fraud Reduction**: Zero incidents of lost coupons being scanned
3. **User Adoption**: 80%+ of tenants use activation workflow within 30 days
4. **Error Rate**: < 1% of range activation attempts fail

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Coupons accidentally not activated | High | Clear UI warnings, confirmation dialogs |
| Range selection errors (wrong codes) | Medium | Preview count, validation, undo capability |
| Existing coupons migration | Medium | One-time migration script, default to 'active' |
| Performance with large ranges | Low | Batch processing, progress indicators |

## Timeline Estimate

- **Database Migration**: 2 hours
- **Backend APIs**: 8 hours
- **Frontend UI**: 12 hours
- **Testing**: 8 hours
- **Documentation**: 2 hours
- **Total**: ~32 hours (4 days)

## Dependencies

- Existing coupon management system
- Credit system (for activation validation)
- User permissions system

## Future Enhancements

1. Mobile app for scan-to-activate
2. CSV bulk upload for activation
3. Activation scheduling (activate at specific date/time)
4. Integration with inventory management systems
5. Activation analytics dashboard

## Approval

- [ ] Product Owner
- [ ] Tech Lead
- [ ] Security Review
- [ ] UX Review
