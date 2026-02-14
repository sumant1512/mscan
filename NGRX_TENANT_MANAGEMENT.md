# NgRx Tenant Management - Complete Implementation

## 📋 Overview

Complete NgRx implementation for tenant CRUD operations with automatic list refresh after every operation.

---

## 🎯 Features Implemented

### ✅ Actions:
- **Load Tenants** - Fetch all tenants
- **Create Tenant** - Create new tenant + auto-reload list
- **Update Tenant** - Update existing tenant + auto-reload list
- **Toggle Status** - Activate/Deactivate tenant + auto-reload list
- **Delete Tenant** - Delete tenant + auto-reload list (backend pending)
- **Filters** - Search, status filter, sorting
- **Selection** - Select/deselect tenant

### ✅ State Management:
- Tenants list (all and filtered)
- Loading states
- Error handling
- Success messages
- Operation in progress tracking

### ✅ Automatic Refresh:
- List automatically reloads after:
  - Create success
  - Update success
  - Toggle status success
  - Delete success

---

## 📁 File Structure

```
src/app/store/tenants/
├── index.ts                    # Public API
├── tenants.actions.ts          # All actions (✅ Updated)
├── tenants.effects.ts          # Side effects (✅ Updated)
├── tenants.reducer.ts          # State reducer (✅ Updated)
├── tenants.selectors.ts        # State selectors (✅ Updated)
├── tenants.facade.ts           # Facade service (✅ Updated)
└── tenants.models.ts           # Type definitions (✅ Updated)
```

---

## 🔧 Usage in Components

### **1. Basic Setup**

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { TenantsFacade } from '../../store/tenants';
import { Tenant } from '../../models/tenant-admin.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-tenant-list',
  template: `
    <div *ngIf="loading$ | async">Loading...</div>
    <div *ngIf="error$ | async as error" class="error">{{ error }}</div>
    <div *ngIf="successMessage$ | async as success" class="success">{{ success }}</div>

    <div *ngFor="let tenant of tenants$ | async">
      {{ tenant.tenant_name }}
    </div>
  `
})
export class TenantListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Observables from facade
  tenants$ = this.facade.filteredTenants$;
  loading$ = this.facade.loading$;
  error$ = this.facade.error$;
  successMessage$ = this.facade.successMessage$;
  operationInProgress$ = this.facade.operationInProgress$;

  constructor(private facade: TenantsFacade) {}

  ngOnInit() {
    // Load tenants on component init
    this.facade.loadTenants();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

### **2. Create Tenant**

```typescript
@Component({
  selector: 'app-tenant-create',
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input formControlName="tenant_name" placeholder="Tenant Name">
      <input formControlName="email" placeholder="Email">
      <input formControlName="contact_person" placeholder="Contact Person">
      <input formControlName="subdomain_slug" placeholder="Subdomain">

      <button
        type="submit"
        [disabled]="form.invalid || (operationInProgress$ | async)">
        {{ (operationInProgress$ | async) ? 'Creating...' : 'Create Tenant' }}
      </button>
    </form>

    <div *ngIf="successMessage$ | async as success" class="alert alert-success">
      {{ success }}
    </div>
    <div *ngIf="error$ | async as error" class="alert alert-error">
      {{ error }}
    </div>
  `
})
export class TenantCreateComponent implements OnInit {
  form: FormGroup;

  successMessage$ = this.facade.successMessage$;
  error$ = this.facade.error$;
  operationInProgress$ = this.facade.operationInProgress$;

  constructor(
    private facade: TenantsFacade,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.form = this.fb.group({
      tenant_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      contact_person: ['', Validators.required],
      subdomain_slug: ['', Validators.required]
    });
  }

  ngOnInit() {
    // Listen for success and navigate
    this.facade.successMessage$
      .pipe(
        filter(msg => !!msg),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        setTimeout(() => {
          this.facade.clearSuccess();
          this.router.navigate(['/tenants']);
        }, 2000);
      });
  }

  onSubmit() {
    if (this.form.valid) {
      this.facade.createTenant(this.form.value);
      // List will auto-reload after successful creation!
    }
  }
}
```

---

### **3. Update Tenant**

```typescript
@Component({
  selector: 'app-tenant-edit',
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input formControlName="tenant_name">
      <input formControlName="contact_person">
      <input formControlName="email">
      <input formControlName="phone">

      <button
        type="submit"
        [disabled]="form.invalid || (operationInProgress$ | async)">
        {{ (operationInProgress$ | async) ? 'Updating...' : 'Update Tenant' }}
      </button>
    </form>
  `
})
export class TenantEditComponent implements OnInit {
  tenantId!: string;
  form: FormGroup;

  operationInProgress$ = this.facade.operationInProgress$;
  successMessage$ = this.facade.successMessage$;

  constructor(
    private facade: TenantsFacade,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      tenant_name: ['', Validators.required],
      contact_person: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['']
    });
  }

  ngOnInit() {
    // Get tenant ID from route
    this.tenantId = this.route.snapshot.paramMap.get('id')!;

    // Load tenant data
    this.facade.getTenantById(this.tenantId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(tenant => {
        if (tenant) {
          this.form.patchValue(tenant);
        }
      });

    // Navigate on success
    this.facade.successMessage$
      .pipe(filter(msg => !!msg), takeUntil(this.destroy$))
      .subscribe(() => {
        setTimeout(() => this.router.navigate(['/tenants']), 2000);
      });
  }

  onSubmit() {
    if (this.form.valid) {
      this.facade.updateTenant(this.tenantId, this.form.value);
      // List will auto-reload after successful update!
    }
  }
}
```

---

### **4. Toggle Tenant Status (Activate/Deactivate)**

```typescript
@Component({
  selector: 'app-tenant-list',
  template: `
    <table>
      <tr *ngFor="let tenant of tenants$ | async">
        <td>{{ tenant.tenant_name }}</td>
        <td>
          <span [class]="tenant.status">{{ tenant.status }}</span>
        </td>
        <td>
          <button
            (click)="onToggleStatus(tenant.id)"
            [disabled]="operationInProgress$ | async">
            {{ tenant.status === 'active' ? 'Deactivate' : 'Activate' }}
          </button>
        </td>
      </tr>
    </table>
  `
})
export class TenantListComponent {
  tenants$ = this.facade.filteredTenants$;
  operationInProgress$ = this.facade.operationInProgress$;

  constructor(private facade: TenantsFacade) {}

  onToggleStatus(tenantId: string) {
    if (confirm('Are you sure you want to change the status?')) {
      this.facade.toggleTenantStatus(tenantId);
      // List will auto-reload after successful toggle!
    }
  }
}
```

---

### **5. Delete Tenant (Future)**

```typescript
onDeleteTenant(tenantId: string) {
  if (confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
    this.facade.deleteTenant(tenantId);
    // List will auto-reload after successful deletion!
  }
}
```

---

### **6. Search and Filters**

```typescript
@Component({
  selector: 'app-tenant-list',
  template: `
    <!-- Search -->
    <input
      type="text"
      [value]="(filters$ | async)?.searchQuery"
      (input)="onSearch($event)"
      placeholder="Search tenants...">

    <!-- Status Filter -->
    <select (change)="onStatusChange($event)">
      <option value="all">All</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>

    <!-- Sort -->
    <select (change)="onSortChange($event)">
      <option value="name">Name</option>
      <option value="created_at">Date Created</option>
    </select>

    <button (click)="onToggleSortOrder()">
      {{ (filters$ | async)?.sortOrder === 'asc' ? '↑' : '↓' }}
    </button>

    <!-- Reset Filters -->
    <button (click)="onResetFilters()">Reset Filters</button>

    <!-- Tenant List -->
    <div *ngFor="let tenant of tenants$ | async">
      {{ tenant.tenant_name }}
    </div>
  `
})
export class TenantListComponent {
  tenants$ = this.facade.filteredTenants$;
  filters$ = this.facade.filters$;

  constructor(private facade: TenantsFacade) {}

  onSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.facade.setSearchQuery(query);
  }

  onStatusChange(event: Event) {
    const status = (event.target as HTMLSelectElement).value as 'all' | 'active' | 'inactive';
    this.facade.setStatusFilter(status);
  }

  onSortChange(event: Event) {
    const sortBy = (event.target as HTMLSelectElement).value as 'name' | 'created_at';
    this.facade.setSortBy(sortBy);
  }

  onToggleSortOrder() {
    this.facade.toggleSortOrder();
  }

  onResetFilters() {
    this.facade.resetFilters();
  }
}
```

---

### **7. Display Success/Error Messages**

```typescript
@Component({
  template: `
    <!-- Success Toast -->
    <div
      *ngIf="successMessage$ | async as success"
      class="toast toast-success"
      [@slideIn]>
      <span>✅ {{ success }}</span>
      <button (click)="facade.clearSuccess()">×</button>
    </div>

    <!-- Error Toast -->
    <div
      *ngIf="error$ | async as error"
      class="toast toast-error"
      [@slideIn]>
      <span>❌ {{ error }}</span>
      <button (click)="facade.clearError()">×</button>
    </div>
  `
})
export class ToastNotificationComponent {
  successMessage$ = this.facade.successMessage$;
  error$ = this.facade.error$;

  constructor(public facade: TenantsFacade) {
    // Auto-clear messages after 5 seconds
    this.successMessage$.subscribe(msg => {
      if (msg) {
        setTimeout(() => this.facade.clearSuccess(), 5000);
      }
    });

    this.error$.subscribe(err => {
      if (err) {
        setTimeout(() => this.facade.clearError(), 5000);
      }
    });
  }
}
```

---

## 📊 State Structure

```typescript
interface TenantsState {
  tenants: Tenant[];              // All tenants (unfiltered)
  filteredTenants: Tenant[];      // Filtered/sorted tenants
  selectedTenant: Tenant | null;  // Currently selected tenant
  loading: boolean;               // Loading tenants list
  error: string | null;           // Error message
  loaded: boolean;                // Has data been loaded
  filters: TenantFilters;         // Current filters
  successMessage: string | null;  // Success notification
  operationInProgress: boolean;   // Create/update/delete in progress
}
```

---

## 🔄 Data Flow

### **Create Tenant Flow:**
```
1. User submits form
   ↓
2. Component calls: facade.createTenant(data)
   ↓
3. Action dispatched: createTenant
   ↓
4. Effect: createTenant$ → API call
   ↓
5. Success → createTenantSuccess action
   ↓
6. Reducer: Set successMessage, clear error
   ↓
7. Effect: createTenantSuccess$ → dispatch loadTenants
   ↓
8. Effect: loadTenants$ → API call
   ↓
9. Success → loadTenantsSuccess
   ↓
10. Reducer: Update tenants list
   ↓
11. Component: UI updates automatically! ✅
```

---

## 🎨 Available Selectors

```typescript
// From facade
facade.allTenants$              // Observable<Tenant[]>
facade.filteredTenants$         // Observable<Tenant[]>
facade.activeTenants$           // Observable<Tenant[]>
facade.selectedTenant$          // Observable<Tenant | null>
facade.loading$                 // Observable<boolean>
facade.error$                   // Observable<string | null>
facade.loaded$                  // Observable<boolean>
facade.filters$                 // Observable<TenantFilters>
facade.stats$                   // Observable<TenantStats>
facade.successMessage$          // Observable<string | null>
facade.operationInProgress$     // Observable<boolean>
facade.getTenantById(id)        // Observable<Tenant | null>
facade.getTenantAdminsById(id)  // Observable<TenantAdmin[]>
```

---

## 🚀 Available Actions

```typescript
// From facade
facade.loadTenants()                        // Load all tenants
facade.createTenant(tenant)                 // Create + auto-reload
facade.updateTenant(id, tenant)             // Update + auto-reload
facade.toggleTenantStatus(id)               // Toggle + auto-reload
facade.deleteTenant(id)                     // Delete + auto-reload
facade.selectTenant(tenant)                 // Select tenant
facade.setSearchQuery(query)                // Set search filter
facade.setStatusFilter(status)              // Set status filter
facade.setSortBy(field)                     // Set sort field
facade.setSortOrder(order)                  // Set sort order
facade.toggleSortOrder()                    // Toggle asc/desc
facade.setFilters(filters)                  // Set multiple filters
facade.resetFilters()                       // Reset to defaults
facade.clearError()                         // Clear error message
facade.clearSuccess()                       // Clear success message
```

---

## ✅ Benefits

### **1. Automatic List Refresh**
- No manual reload calls needed
- List updates automatically after every operation
- Always shows latest data

### **2. Centralized State**
- Single source of truth
- Consistent data across all components
- Easy debugging with Redux DevTools

### **3. Better UX**
- Loading states for all operations
- Success/error notifications
- Optimistic updates possible
- Undo/redo support (future)

### **4. Type Safety**
- Full TypeScript support
- Compile-time error checking
- IntelliSense autocomplete

### **5. Testability**
- Easy to test actions, reducers, effects
- Mock-friendly facade pattern
- Predictable state mutations

---

## 🐛 Troubleshooting

### **Problem: List not refreshing after create**
**Solution:** Check that effects are properly registered in AppConfig

```typescript
// app.config.ts
providers: [
  provideStore({ tenants: tenantsReducer }),
  provideEffects([TenantsEffects]),  // ← Make sure this is here
]
```

### **Problem: Success message not showing**
**Solution:** Subscribe to `successMessage$` in your component

```typescript
successMessage$ = this.facade.successMessage$;
```

### **Problem: Operation in progress stuck**
**Solution:** Check for errors in effects, make sure success/failure actions are dispatched

---

## 📝 Migration Guide

### **Old Way (Without NgRx):**
```typescript
// Old
createTenant() {
  this.loading = true;
  this.tenantService.createTenant(this.form.value).subscribe({
    next: (response) => {
      this.success = response.message;
      this.loadTenants(); // Manual reload
      this.loading = false;
    },
    error: (error) => {
      this.error = error.message;
      this.loading = false;
    }
  });
}
```

### **New Way (With NgRx):**
```typescript
// New
createTenant() {
  this.facade.createTenant(this.form.value);
  // That's it! Everything else is automatic ✅
}
```

---

## 🎯 Summary

✅ **Complete CRUD operations** implemented
✅ **Automatic list refresh** after all operations
✅ **Loading states** for better UX
✅ **Error & success handling** built-in
✅ **Filtering & sorting** with state persistence
✅ **Type-safe** with full TypeScript support
✅ **Easy to use** facade pattern
✅ **Testable** and maintainable

**All tenant management is now handled through NgRx!** 🎉
