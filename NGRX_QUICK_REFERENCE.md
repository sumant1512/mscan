# NgRx Tenant Management - Quick Reference

## 🚀 Quick Start

```typescript
// 1. Import facade
import { TenantsFacade } from '../../store/tenants';

// 2. Inject in constructor
constructor(private facade: TenantsFacade) {}

// 3. Use observables
tenants$ = this.facade.filteredTenants$;
loading$ = this.facade.loading$;

// 4. Dispatch actions
this.facade.createTenant(tenant);
```

---

## 📊 Available Observables

```typescript
facade.allTenants$              // All tenants (unfiltered)
facade.filteredTenants$         // Filtered + sorted tenants
facade.activeTenants$           // Active tenants only
facade.selectedTenant$          // Currently selected
facade.loading$                 // List loading state
facade.error$                   // Error message
facade.loaded$                  // Has loaded
facade.filters$                 // Current filters
facade.stats$                   // Tenant statistics
facade.successMessage$          // Success notification
facade.operationInProgress$     // Create/update/delete in progress
```

---

## 🎯 Actions Cheat Sheet

### **Load & Select**
```typescript
facade.loadTenants()                 // Load all tenants
facade.selectTenant(tenant)          // Select a tenant
facade.getTenantById(id)             // Get tenant observable
facade.getTenantAdminsById(id)       // Get admins observable
```

### **CRUD Operations** (Auto-reload list on success!)
```typescript
facade.createTenant(tenant)          // Create + reload
facade.updateTenant(id, tenant)      // Update + reload
facade.toggleTenantStatus(id)        // Toggle + reload
facade.deleteTenant(id)              // Delete + reload (when backend ready)
```

### **Filters**
```typescript
facade.setSearchQuery('acme')        // Search filter
facade.setStatusFilter('active')     // Status filter (all/active/inactive)
facade.setSortBy('name')             // Sort by (name/created_at)
facade.setSortOrder('asc')           // Sort order (asc/desc)
facade.toggleSortOrder()             // Toggle asc ↔ desc
facade.setFilters({ ... })           // Set multiple filters
facade.resetFilters()                // Reset to defaults
```

### **Messages**
```typescript
facade.clearError()                  // Clear error message
facade.clearSuccess()                // Clear success message
```

---

## 💡 Common Patterns

### **Pattern 1: List Component**
```typescript
@Component({
  template: `
    <div *ngIf="loading$ | async">Loading...</div>
    <div *ngFor="let tenant of tenants$ | async">
      {{ tenant.tenant_name }}
    </div>
  `
})
export class TenantListComponent implements OnInit {
  tenants$ = this.facade.filteredTenants$;
  loading$ = this.facade.loading$;

  constructor(private facade: TenantsFacade) {}

  ngOnInit() {
    this.facade.loadTenants();
  }
}
```

### **Pattern 2: Create/Edit Form**
```typescript
@Component({ ... })
export class TenantFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading$ = this.facade.operationInProgress$;
  error$ = this.facade.error$;
  successMessage$ = this.facade.successMessage$;

  constructor(
    private facade: TenantsFacade,
    private router: Router
  ) {}

  ngOnInit() {
    // Navigate on success
    this.successMessage$
      .pipe(filter(msg => !!msg), takeUntil(this.destroy$))
      .subscribe(() => {
        setTimeout(() => this.router.navigate(['/tenants']), 1500);
      });
  }

  onSubmit() {
    if (this.isEditMode) {
      this.facade.updateTenant(this.id, this.form.value);
    } else {
      this.facade.createTenant(this.form.value);
    }
    // List auto-reloads on success!
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### **Pattern 3: Toggle Status**
```typescript
onToggleStatus(tenantId: string) {
  if (confirm('Change status?')) {
    this.facade.toggleTenantStatus(tenantId);
    // List auto-reloads on success!
  }
}
```

### **Pattern 4: Search & Filter**
```typescript
onSearch(event: Event) {
  const query = (event.target as HTMLInputElement).value;
  this.facade.setSearchQuery(query);
}

onStatusChange(status: 'all' | 'active' | 'inactive') {
  this.facade.setStatusFilter(status);
}

onSort(field: 'name' | 'created_at') {
  this.facade.setSortBy(field);
}
```

### **Pattern 5: Success Toast**
```typescript
@Component({
  template: `
    <div *ngIf="successMessage$ | async as msg" class="toast success">
      ✅ {{ msg }}
      <button (click)="facade.clearSuccess()">×</button>
    </div>
  `
})
export class ToastComponent {
  successMessage$ = this.facade.successMessage$;

  constructor(public facade: TenantsFacade) {
    // Auto-clear after 5 seconds
    this.successMessage$.subscribe(msg => {
      if (msg) {
        setTimeout(() => this.facade.clearSuccess(), 5000);
      }
    });
  }
}
```

---

## 🎨 Template Helpers

### **Loading State**
```html
<div *ngIf="loading$ | async">
  <spinner></spinner> Loading tenants...
</div>
```

### **Error Display**
```html
<div *ngIf="error$ | async as error" class="alert alert-error">
  ❌ {{ error }}
  <button (click)="facade.clearError()">×</button>
</div>
```

### **Success Display**
```html
<div *ngIf="successMessage$ | async as msg" class="alert alert-success">
  ✅ {{ msg }}
</div>
```

### **Disabled Button**
```html
<button
  [disabled]="operationInProgress$ | async"
  (click)="onSubmit()">
  {{ (operationInProgress$ | async) ? 'Saving...' : 'Save' }}
</button>
```

### **Empty State**
```html
<div *ngIf="(tenants$ | async)?.length === 0 && !(loading$ | async)">
  No tenants found
</div>
```

---

## ✅ Checklist

When creating a new component that uses tenants:

- [ ] Import `TenantsFacade`
- [ ] Inject in constructor
- [ ] Create observables for state you need
- [ ] Call `loadTenants()` in ngOnInit (if showing list)
- [ ] Use `*ngIf="loading$ | async"` for loading state
- [ ] Use `*ngIf="error$ | async"` for errors
- [ ] Use facade methods instead of service calls
- [ ] Implement OnDestroy for subscriptions
- [ ] Use `takeUntil(destroy$)` for manual subscriptions
- [ ] Clear success/error messages when appropriate

---

## 🔍 Debug Tips

### **Check if effects are registered:**
```typescript
// app.config.ts
provideEffects([TenantsEffects])  // Must be here!
```

### **Check store in DevTools:**
```bash
# Install Redux DevTools Chrome extension
# Open DevTools → Redux tab
# See all actions and state changes
```

### **Log state changes:**
```typescript
this.facade.filteredTenants$.subscribe(tenants => {
  console.log('Tenants updated:', tenants);
});
```

---

## 📐 State Structure

```typescript
{
  tenants: {
    tenants: Tenant[],            // All tenants
    filteredTenants: Tenant[],    // Filtered list
    selectedTenant: Tenant | null,
    loading: boolean,
    error: string | null,
    loaded: boolean,
    filters: {
      searchQuery: string,
      statusFilter: 'all' | 'active' | 'inactive',
      sortBy: 'name' | 'created_at',
      sortOrder: 'asc' | 'desc'
    },
    successMessage: string | null,
    operationInProgress: boolean
  }
}
```

---

## ⚡ Performance Tips

1. **Use OnPush change detection:**
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

2. **Unsubscribe properly:**
```typescript
ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
```

3. **Use async pipe:**
```html
<!-- Good ✅ -->
<div *ngFor="let tenant of tenants$ | async">

<!-- Bad ❌ -->
<div *ngFor="let tenant of tenants">
```

---

## 🎓 Learning Resources

- Full guide: `NGRX_TENANT_MANAGEMENT.md`
- Implementation: `NGRX_IMPLEMENTATION_SUMMARY.md`
- NgRx Docs: https://ngrx.io/

---

**Save this file for quick reference! 📌**
