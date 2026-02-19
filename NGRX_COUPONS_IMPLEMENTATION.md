# NgRx Coupons Implementation - Complete Guide

## Overview
Complete NgRx-based coupon management system with full CRUD operations, lifecycle management, and bulk operations.

## Architecture

```
mscan-client/src/app/store/coupons/
├── coupons.actions.ts      # All action creators
├── coupons.state.ts        # State interface and initial state
├── coupons.reducer.ts      # State transformations
├── coupons.effects.ts      # Side effects (API calls)
├── coupons.selectors.ts    # State queries
├── coupons.facade.ts       # Component API
└── index.ts                # Barrel exports
```

## State Structure

```typescript
interface CouponsState {
  coupons: Coupon[];
  selectedCoupon: Coupon | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  } | null;
  loading: boolean;
  error: string | null;
  lastCreatedBatchId: string | null;
  lastOperationResult: {
    type: 'activate' | 'deactivate' | 'print' | 'create' | null;
    count: number;
    message: string;
  } | null;
}
```

## Features Implemented

### 1. CRUD Operations
- ✅ **Create Coupon** - Single or batch creation
- ✅ **Read Coupons** - List with filters and pagination
- ✅ **Read Single Coupon** - Get by ID
- ✅ **Update Coupon Status** - Activate/deactivate
- ✅ **Delete** - Status-based deletion (deactivate)

### 2. Advanced Features
- ✅ **Multi-batch creation** - Create multiple batches in one operation
- ✅ **Bulk operations** - Print, activate multiple coupons
- ✅ **Range operations** - Activate/deactivate by reference range
- ✅ **Lifecycle management** - Draft → Printed → Active → Used/Expired
- ✅ **Filtering** - By status, app, search term
- ✅ **Pagination** - Client-side pagination support
- ✅ **Statistics** - Count by status, totals

### 3. State Management
- ✅ **Loading states** - Track async operations
- ✅ **Error handling** - Centralized error management
- ✅ **Selection** - Track currently selected coupon
- ✅ **Operation results** - Track last operation outcome
- ✅ **Optimistic updates** - Immediate UI feedback
- ✅ **Auto-reload** - Refresh after successful operations

## Usage Guide

### Component Setup

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouponsFacade } from '../../store/coupons';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-coupon-list',
  template: `
    <div *ngIf="loading$ | async">Loading...</div>
    <div *ngIf="error$ | async as error">{{ error }}</div>

    <div *ngFor="let coupon of coupons$ | async">
      {{ coupon.coupon_code }} - {{ coupon.status }}
    </div>

    <div *ngIf="stats$ | async as stats">
      Total: {{ stats.total }},
      Active: {{ stats.active }},
      Used: {{ stats.used }}
    </div>
  `
})
export class CouponListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Observables from facade
  coupons$ = this.couponsFacade.coupons$;
  loading$ = this.couponsFacade.loading$;
  error$ = this.couponsFacade.error$;
  stats$ = this.couponsFacade.couponStats$;

  constructor(private couponsFacade: CouponsFacade) {}

  ngOnInit(): void {
    // Load all coupons
    this.couponsFacade.loadCoupons();

    // Or load with filters
    this.couponsFacade.loadCoupons({
      status: 'active',
      verification_app_id: 'app-id',
      page: 1,
      limit: 20
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### Common Operations

#### 1. Load Coupons

```typescript
// Load all
this.couponsFacade.loadCoupons();

// Load by status
this.couponsFacade.loadCouponsByStatus('active');

// Load by app
this.couponsFacade.loadCouponsByAppId('app-uuid');

// Load with custom filters
this.couponsFacade.loadCoupons({
  status: 'printed',
  search: 'SUMMER',
  page: 1,
  limit: 50
});
```

#### 2. Create Coupons

```typescript
// Create single coupon
this.couponsFacade.createCoupon({
  verification_app_id: 'app-uuid',
  discount_type: 'PERCENTAGE',
  discount_value: 20,
  expiry_date: '2024-12-31',
  description: 'Summer Sale'
});

// Create multi-batch coupons
this.couponsFacade.createMultiBatchCoupons('app-uuid', [
  {
    description: 'Batch 1',
    quantity: 100,
    discountAmount: 10,
    expiryDate: '2024-12-31'
  },
  {
    description: 'Batch 2',
    quantity: 50,
    discountAmount: 20,
    expiryDate: '2024-12-31'
  }
]);
```

#### 3. Update Coupons

```typescript
// Activate coupon
this.couponsFacade.activateCoupon('coupon-id');

// Deactivate coupon
this.couponsFacade.deactivateCoupon('coupon-id');

// Update status directly
this.couponsFacade.updateCouponStatus('coupon-id', 'active');
```

#### 4. Lifecycle Operations

```typescript
// Mark as printed
this.couponsFacade.markCouponAsPrinted('coupon-id');

// Bulk mark as printed
this.couponsFacade.bulkMarkAsPrinted(['id1', 'id2', 'id3']);

// Bulk activate
this.couponsFacade.bulkActivateCoupons(
  ['id1', 'id2', 'id3'],
  'Spring campaign activation'
);

// Activate range
this.couponsFacade.activateCouponRange(
  'REF-001',
  'REF-100',
  'printed', // Only activate printed coupons
  'Campaign launch'
);

// Deactivate range
this.couponsFacade.deactivateCouponRange(
  'REF-001',
  'REF-050',
  'Campaign ended early'
);

// Activate batch
this.couponsFacade.activateCouponBatch(
  'batch-uuid',
  'Ready for distribution'
);
```

#### 5. Selection

```typescript
// Select a coupon
this.couponsFacade.selectCoupon(coupon);

// Get selected coupon
this.couponsFacade.selectedCoupon$.subscribe(coupon => {
  console.log('Selected:', coupon);
});

// Clear selection
this.couponsFacade.clearSelectedCoupon();
```

#### 6. Filtered Queries

```typescript
// Get coupons by specific criteria
this.couponsFacade.getCouponsByStatus('active').subscribe(coupons => {
  console.log('Active coupons:', coupons);
});

this.couponsFacade.getCouponsByAppId('app-id').subscribe(coupons => {
  console.log('App coupons:', coupons);
});

this.couponsFacade.getCouponById('coupon-id').subscribe(coupon => {
  console.log('Coupon:', coupon);
});

// Pre-filtered observables
this.couponsFacade.activeCoupons$.subscribe(...);
this.couponsFacade.draftCoupons$.subscribe(...);
this.couponsFacade.printedCoupons$.subscribe(...);
this.couponsFacade.expiredCoupons$.subscribe(...);
this.couponsFacade.usedCoupons$.subscribe(...);
```

### Error Handling

```typescript
// Subscribe to errors
this.couponsFacade.error$.subscribe(error => {
  if (error) {
    console.error('Coupon error:', error);
    // Show toast notification
  }
});

// Clear errors
this.couponsFacade.clearError();
```

### Operation Results

```typescript
// Track operation results
this.couponsFacade.lastOperationResult$.subscribe(result => {
  if (result) {
    console.log(`${result.type}: ${result.message}`);
    // Show success notification
    // Example: "activate: Activated 50 coupon(s)"
  }
});

// Get last created batch ID
this.couponsFacade.lastCreatedBatchId$.subscribe(batchId => {
  if (batchId) {
    console.log('Created batch:', batchId);
  }
});
```

### Statistics

```typescript
// Get coupon statistics
this.couponsFacade.couponStats$.subscribe(stats => {
  console.log('Total:', stats.total);
  console.log('Active:', stats.active);
  console.log('Draft:', stats.draft);
  console.log('Printed:', stats.printed);
  console.log('Used:', stats.used);
  console.log('Expired:', stats.expired);
  console.log('Inactive:', stats.inactive);
  console.log('Exhausted:', stats.exhausted);
});
```

### Pagination

```typescript
// Check pagination state
this.couponsFacade.pagination$.subscribe(pagination => {
  console.log('Page:', pagination.page);
  console.log('Total:', pagination.total);
  console.log('Has more:', pagination.hasMore);
});

// Load next page
this.couponsFacade.loadNextPage({ status: 'active' });

// Direct pagination values
this.couponsFacade.hasMoreCoupons$.subscribe(...);
this.couponsFacade.currentPage$.subscribe(...);
this.couponsFacade.totalCoupons$.subscribe(...);
```

## Available Actions

### Load Actions
- `loadCoupons({ filters })` - Load coupons with filters
- `loadCoupon({ id })` - Load single coupon
- Success/Failure variants for each

### Create Actions
- `createCoupon({ coupon })` - Create single or batch
- `createMultiBatchCoupons({ verificationAppId, batches })` - Multiple batches
- Success/Failure variants for each

### Update Actions
- `updateCouponStatus({ id, status })` - Change status
- Success/Failure variants

### Lifecycle Actions
- `activateCouponRange({ from_reference, to_reference, ... })` - Range activation
- `activateCouponBatch({ batchId, activationNote })` - Batch activation
- `markCouponAsPrinted({ couponId })` - Mark single as printed
- `bulkMarkAsPrinted({ couponIds })` - Bulk print
- `bulkActivateCoupons({ couponIds, activationNote })` - Bulk activate
- `deactivateCouponRange({ from_reference, to_reference, deactivation_reason })` - Range deactivation
- Success/Failure variants for each

### Utility Actions
- `selectCoupon({ coupon })` - Select coupon
- `clearSelectedCoupon()` - Clear selection
- `clearError()` - Clear error state
- `resetCouponsState()` - Reset to initial state

## Selectors Available

### Basic Selectors
- `selectAllCoupons` - All coupons array
- `selectSelectedCoupon` - Currently selected coupon
- `selectCouponsLoading` - Loading state
- `selectCouponsError` - Error message
- `selectPagination` - Pagination info
- `selectLastCreatedBatchId` - Last batch ID
- `selectLastOperationResult` - Last operation result

### Filtered Selectors
- `selectCouponById(id)` - Get by ID
- `selectCouponsByStatus(status)` - Filter by status
- `selectCouponsByAppId(appId)` - Filter by app
- `selectActiveCoupons` - Active coupons only
- `selectDraftCoupons` - Draft coupons only
- `selectPrintedCoupons` - Printed coupons only
- `selectExpiredCoupons` - Expired coupons only
- `selectUsedCoupons` - Used coupons only
- `selectCouponsByBatchId(batchId)` - Filter by batch

### Computed Selectors
- `selectCouponsCount` - Total count
- `selectCouponStats` - Statistics by status
- `selectHasMoreCoupons` - Pagination flag
- `selectCurrentPage` - Current page number
- `selectTotalCoupons` - Total from server

## Integration Points

### 1. Backend API
All effects call `RewardsService` which interfaces with:
- `GET /api/rewards/coupons` - List coupons
- `GET /api/rewards/coupons/:id` - Get coupon
- `POST /api/rewards/coupons` - Create coupon
- `POST /api/rewards/coupons/multi-batch` - Multi-batch create
- `PATCH /api/rewards/coupons/:id/status` - Update status
- `POST /api/rewards/coupons/activate-range` - Activate range
- `POST /api/rewards/coupons/activate-batch` - Activate batch
- `PATCH /api/rewards/coupons/:id/print` - Mark printed
- `POST /api/rewards/coupons/bulk-print` - Bulk print
- `POST /api/rewards/coupons/bulk-activate` - Bulk activate
- `POST /api/rewards/coupons/deactivate-range` - Deactivate range

### 2. Auto-Reload
Effects automatically reload coupons after successful:
- Create operations
- Bulk operations
- Range operations

### 3. Error Handling
All effects include error handling that:
- Catches HTTP errors
- Dispatches failure actions
- Sets error messages in state
- Allows components to display errors

## Best Practices

### 1. Use Facade, Not Direct Store
```typescript
// ✅ Good
constructor(private couponsFacade: CouponsFacade) {}

// ❌ Bad
constructor(private store: Store) {}
```

### 2. Unsubscribe from Observables
```typescript
// ✅ Good
ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}

// Or use async pipe
<div *ngIf="coupons$ | async as coupons">
```

### 3. Handle Loading and Error States
```typescript
// ✅ Good
<div *ngIf="loading$ | async">Loading...</div>
<div *ngIf="error$ | async as error" class="error">{{ error }}</div>
<div *ngIf="!(loading$ | async) && !(error$ | async)">
  <!-- Content -->
</div>
```

### 4. Use Appropriate Selectors
```typescript
// ✅ Good - Specific selector
this.couponsFacade.activeCoupons$

// ❌ Bad - Manual filtering
this.couponsFacade.coupons$.pipe(
  map(coupons => coupons.filter(c => c.status === 'active'))
)
```

### 5. Clear State When Appropriate
```typescript
// On component destroy or route change
ngOnDestroy() {
  this.couponsFacade.resetState();
}
```

## Testing

### Unit Testing Actions
```typescript
it('should create loadCoupons action', () => {
  const filters = { status: 'active' };
  const action = CouponsActions.loadCoupons({ filters });

  expect(action.type).toBe('[Coupons] Load Coupons');
  expect(action.filters).toEqual(filters);
});
```

### Unit Testing Reducer
```typescript
it('should update state on loadCouponsSuccess', () => {
  const coupons = [/* mock coupons */];
  const action = CouponsActions.loadCouponsSuccess({ coupons, pagination: null });
  const state = couponsReducer(initialCouponsState, action);

  expect(state.coupons).toEqual(coupons);
  expect(state.loading).toBe(false);
});
```

### Unit Testing Effects
```typescript
it('should dispatch loadCouponsSuccess on successful load', () => {
  const coupons = [/* mock coupons */];
  const action = CouponsActions.loadCoupons({ filters: {} });
  const outcome = CouponsActions.loadCouponsSuccess({ coupons, pagination: null });

  actions$ = hot('-a', { a: action });
  const response = cold('-a|', { a: { coupons } });
  rewardsService.getCoupons = jest.fn(() => response);

  const expected = cold('--b', { b: outcome });
  expect(effects.loadCoupons$).toBeObservable(expected);
});
```

## Migration from Direct Service Calls

### Before (Direct Service)
```typescript
loadCoupons() {
  this.loading = true;
  this.rewardsService.getCoupons({ status: 'active' }).subscribe({
    next: (response) => {
      this.coupons = response.coupons;
      this.loading = false;
    },
    error: (error) => {
      this.error = error.message;
      this.loading = false;
    }
  });
}
```

### After (NgRx)
```typescript
// In component
coupons$ = this.couponsFacade.coupons$;
loading$ = this.couponsFacade.loading$;
error$ = this.couponsFacade.error$;

ngOnInit() {
  this.couponsFacade.loadCoupons({ status: 'active' });
}

// In template
<div *ngIf="coupons$ | async as coupons">
  <!-- Coupons -->
</div>
```

## Performance Considerations

1. **Memoized Selectors** - Selectors use memoization for efficient recomputation
2. **Immutable Updates** - Reducer creates new objects, enabling change detection optimization
3. **OnPush Strategy** - Compatible with OnPush change detection
4. **Lazy Loading** - Load coupons only when needed
5. **Pagination** - Server-side pagination reduces data transfer
6. **Auto-reload** - Smart reload only after mutations

## Summary

The NgRx coupons implementation provides:
- ✅ **Complete CRUD** - All create, read, update operations
- ✅ **Advanced Features** - Bulk operations, lifecycle management
- ✅ **Type Safety** - Full TypeScript typing
- ✅ **Clean API** - Facade pattern for easy usage
- ✅ **Testable** - Isolated, unit-testable code
- ✅ **Performant** - Optimized selectors and updates
- ✅ **Maintainable** - Clear separation of concerns
- ✅ **Scalable** - Easy to extend with new features

All coupon operations are now centralized, predictable, and follow Angular/NgRx best practices!
