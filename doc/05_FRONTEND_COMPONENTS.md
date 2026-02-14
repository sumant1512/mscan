# MScan Frontend Components Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Super Admin Components](#super-admin-components)
4. [Tenant Admin Components](#tenant-admin-components)
5. [Shared/Common Components](#sharedcommon-components)
6. [Services](#services)
7. [State Management (NgRx)](#state-management-ngrx)
8. [Routing](#routing)
9. [Common Patterns](#common-patterns)
10. [Component Reference](#component-reference)

---

## Overview

The MScan frontend is built with **Angular 21** using standalone components architecture. The application consists of 40+ components organized by feature areas, following Angular best practices and implementing reactive programming with RxJS.

### Technology Stack
- **Angular 21** - Latest standalone components
- **TypeScript 5.9** - Type-safe development
- **NgRx 21** - State management for complex features
- **RxJS 7.8** - Reactive programming
- **Tailwind CSS 4.1** - Utility-first styling
- **Chart.js** - Analytics visualization

### Component Architecture Philosophy

**Standalone Components:**
- All components are standalone (no NgModules)
- Explicit imports in component metadata
- Better tree-shaking and performance
- Easier to understand dependencies

**Two Component Types:**

1. **Smart Components (Containers):**
   - Connect to services/store
   - Handle business logic
   - Manage local state
   - Dispatch actions (NgRx)

2. **Dumb Components (Presentational):**
   - Receive data via @Input()
   - Emit events via @Output()
   - Pure presentation logic
   - Highly reusable

---

## Architecture

### Component Structure

```
src/app/
├── components/
│   ├── super-admin/              # Super Admin features
│   │   ├── super-admin-dashboard.component.ts
│   │   ├── tenant-list.component.ts
│   │   ├── tenant-form.component.ts
│   │   ├── tenant-detail.component.ts
│   │   ├── add-tenant-admin.component.ts
│   │   ├── tenant-admin-detail.component.ts
│   │   └── tenant-admin-dashboard.component.ts
│   │
│   ├── tenant-dashboard/          # Tenant Dashboard
│   │   ├── tenant-dashboard.component.ts
│   │   └── dashboard.component.ts
│   │
│   ├── credit-management/         # Credit System
│   │   ├── credit-approval-list.component.ts
│   │   ├── credit-request-form.component.ts
│   │   └── credit-transaction-history.component.ts
│   │
│   ├── products/                  # Product Management
│   │   ├── product-list.component.ts
│   │   ├── product-form.component.ts
│   │   ├── variant-list-editor.component.ts
│   │   └── structured-description-editor.component.ts
│   │
│   ├── templates/                 # Product Templates
│   │   ├── template-list.component.ts
│   │   ├── template-form.component.ts
│   │   ├── template-detail.component.ts
│   │   └── attribute-manager.component.ts
│   │
│   ├── categories/                # Category Management
│   │   ├── category-list.component.ts
│   │   └── category-form.component.ts
│   │
│   ├── tags/                      # Tag Management
│   │   ├── tag-list.component.ts
│   │   └── tag-form.component.ts
│   │
│   ├── rewards/                   # Coupon/Rewards
│   │   ├── coupon-list.component.ts
│   │   ├── coupon-create.component.ts
│   │   └── batch-activation-wizard.component.ts
│   │
│   ├── scans/                     # Scan History
│   │   └── scan-history.component.ts
│   │
│   ├── verification-app/          # Verification Apps
│   │   ├── verification-app-list.component.ts
│   │   ├── verification-app-configure.component.ts
│   │   └── verification-app-api-config.component.ts
│   │
│   ├── tenant-users/              # User Management
│   │   ├── tenant-users-list.component.ts
│   │   ├── tenant-user-form.component.ts
│   │   └── user-permissions.component.ts
│   │
│   ├── tenant-analytics/          # Analytics
│   │   └── tenant-analytics.component.ts
│   │
│   ├── shared-header/             # Navigation
│   │   └── shared-header.component.ts
│   │
│   ├── side-nav/                  # Side Navigation
│   │   └── side-nav.component.ts
│   │
│   ├── app-selector/              # Multi-App Selector
│   │   └── app-selector.component.ts
│   │
│   └── login/                     # Authentication
│       └── login.component.ts
│
├── services/                      # HTTP Services
│   ├── auth.service.ts
│   ├── tenant.service.ts
│   ├── products.service.ts
│   ├── rewards.service.ts
│   ├── credit.service.ts
│   ├── template.service.ts
│   ├── categories.service.ts
│   ├── tag.service.ts
│   ├── tenant-users.service.ts
│   ├── permissions.service.ts
│   ├── tenant-admin.service.ts
│   ├── analytics.service.ts
│   └── app-context.service.ts
│
├── store/                         # NgRx Store
│   ├── actions/
│   ├── reducers/
│   ├── effects/
│   ├── selectors/
│   └── facades/
│
├── guards/                        # Route Guards
│   ├── auth.guard.ts
│   └── permission.guard.ts
│
├── models/                        # TypeScript Interfaces
│   ├── tenant.model.ts
│   ├── product.model.ts
│   ├── coupon.model.ts
│   ├── user.model.ts
│   ├── permissions.model.ts
│   └── rewards.model.ts
│
└── app.routes.ts                  # Route Configuration
```

---

## Super Admin Components

Super Admin components manage platform-level operations including tenant management, credit approvals, and system analytics.

### 1. SuperAdminDashboardComponent

**Path:** `components/super-admin/super-admin-dashboard.component.ts`

**Purpose:** Main dashboard for Super Admins showing system-wide statistics and quick actions.

**Key Features:**
- Total tenants count
- Active/inactive tenant breakdown
- Pending credit requests
- Recent activity feed
- System health metrics

**Services Used:**
- `TenantService` - Fetch tenant statistics
- `CreditService` - Pending credit requests count
- `Router` - Navigation to detail pages

**Template Example:**
```html
<div class="dashboard-grid">
  <div class="stat-card">
    <h3>Total Tenants</h3>
    <p class="stat-value">{{ totalTenants }}</p>
  </div>
  <div class="stat-card">
    <h3>Pending Credits</h3>
    <p class="stat-value">{{ pendingCredits }}</p>
    <button (click)="router.navigate(['/super-admin/credits/pending'])">
      View Requests
    </button>
  </div>
</div>
```

**NgRx Integration:** Uses `TenantsFacade` for tenant statistics

---

### 2. TenantListComponent

**Path:** `components/super-admin/tenant-list.component.ts`

**Purpose:** Display and manage all tenants in the system.

**Key Features:**
- Searchable tenant list
- Filter by status (Active/Inactive/Suspended)
- Pagination support
- Quick actions (Edit, View Details, Toggle Status)
- Create new tenant button

**Component State:**
```typescript
export class TenantListComponent implements OnInit {
  tenants: Tenant[] = [];
  loading: boolean = false;
  error: string = '';
  searchTerm: string = '';
  statusFilter: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalTenants: number = 0;

  constructor(
    private tenantService: TenantService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadTenants();
  }

  loadTenants() {
    this.loading = true;
    this.tenantService.getAllTenants({
      search: this.searchTerm,
      status: this.statusFilter,
      page: this.currentPage,
      limit: this.itemsPerPage
    }).subscribe({
      next: (response) => {
        this.tenants = response.data.tenants;
        this.totalTenants = response.data.total;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to load tenants';
        this.loading = false;
      }
    });
  }

  onSearch() {
    this.currentPage = 1;
    this.loadTenants();
  }

  onStatusFilterChange() {
    this.currentPage = 1;
    this.loadTenants();
  }

  toggleTenantStatus(tenant: Tenant) {
    const newStatus = !tenant.is_active;
    this.tenantService.updateTenant(tenant.id, { is_active: newStatus })
      .subscribe({
        next: () => this.loadTenants(),
        error: (error) => this.error = error.error?.message
      });
  }
}
```

**Template Features:**
- Search input with debounce
- Status dropdown filter
- Table with tenant details
- Action buttons (Edit, View, Toggle Status)
- Pagination controls

**Services Used:**
- `TenantService.getAllTenants(params)` - Fetch tenants
- `TenantService.updateTenant(id, data)` - Update tenant status

**Routes:**
- List: `/super-admin/tenants`
- Create: `/super-admin/tenants/new`
- Edit: `/super-admin/tenants/:id/edit`
- Detail: `/super-admin/tenants/:id`

---

### 3. TenantFormComponent

**Path:** `components/super-admin/tenant-form.component.ts`

**Purpose:** Create or edit tenant details.

**Key Features:**
- Reactive form validation
- Real-time subdomain validation
- Initial credit assignment
- Settings configuration (JSONB)
- Admin email setup

**Form Structure:**
```typescript
export class TenantFormComponent implements OnInit {
  tenantForm: FormGroup;
  isEditMode: boolean = false;
  tenantId: string | null = null;
  subdomainAvailable: boolean = true;
  checkingSubdomain: boolean = false;

  constructor(
    private fb: FormBuilder,
    private tenantService: TenantService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.tenantForm = this.fb.group({
      tenant_name: ['', [Validators.required, Validators.minLength(3)]],
      subdomain: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      admin_email: ['', [Validators.required, Validators.email]],
      contact_email: ['', [Validators.email]],
      contact_phone: [''],
      initial_credits: [0, [Validators.min(0)]],
      is_active: [true],
      settings: this.fb.group({
        allow_public_scan: [true],
        require_email_verification: [true],
        max_products: [1000],
        max_coupons_per_batch: [10000]
      })
    });
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.tenantId = params['id'];
        this.loadTenant();
      }
    });

    // Real-time subdomain validation
    this.tenantForm.get('subdomain')?.valueChanges
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(subdomain => {
        if (subdomain && subdomain.length >= 3) {
          this.checkSubdomainAvailability(subdomain);
        }
      });
  }

  loadTenant() {
    this.tenantService.getTenantById(this.tenantId!).subscribe({
      next: (response) => {
        this.tenantForm.patchValue(response.data);
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to load tenant';
      }
    });
  }

  checkSubdomainAvailability(subdomain: string) {
    this.checkingSubdomain = true;
    this.tenantService.checkSubdomain(subdomain).subscribe({
      next: (response) => {
        this.subdomainAvailable = response.data.available;
        this.checkingSubdomain = false;
      },
      error: () => {
        this.checkingSubdomain = false;
      }
    });
  }

  onSubmit() {
    if (this.tenantForm.invalid || !this.subdomainAvailable) {
      return;
    }

    const tenantData = this.tenantForm.value;

    const request = this.isEditMode
      ? this.tenantService.updateTenant(this.tenantId!, tenantData)
      : this.tenantService.createTenant(tenantData);

    request.subscribe({
      next: () => {
        this.router.navigate(['/super-admin/tenants']);
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to save tenant';
      }
    });
  }
}
```

**Validation Rules:**
- `tenant_name`: Required, minimum 3 characters
- `subdomain`: Required, lowercase alphanumeric with hyphens, must be unique
- `admin_email`: Required, valid email format
- `initial_credits`: Non-negative number

**Template Features:**
- Form fields with inline validation messages
- Subdomain availability indicator
- Settings toggle switches
- Save/Cancel buttons

---

### 4. TenantDetailComponent

**Path:** `components/super-admin/tenant-detail.component.ts`

**Purpose:** Display detailed information about a specific tenant.

**Key Features:**
- Tenant information display
- Credit balance and history
- User count and list
- Product/coupon statistics
- Quick actions (Edit, Add Credits, View Analytics)

**Services Used:**
- `TenantService.getTenantById(id)` - Fetch tenant details
- `CreditService.getTenantCredits(tenantId)` - Credit information
- `TenantUsersService.getTenantUsers(tenantId)` - User list

---

### 5. CreditApprovalListComponent

**Path:** `components/credit-management/credit-approval-list.component.ts`

**Purpose:** Super Admin view of all pending credit requests from tenants with server-side filtering.

**Key Features:**
- List of pending credit requests
- Filter by tenant (server-side)
- Approve/Reject actions with reason
- View request justification
- Automatic reload on filter changes

**Component Implementation:**
```typescript
export class CreditApprovalListComponent implements OnInit {
  pendingRequests$: Observable<CreditRequest[]>;
  loading$ = this.creditRequestsFacade.loading$;
  tenants: Tenant[] = [];
  tenantFilter: string = 'all';
  isSuperAdmin = false;

  constructor(
    private creditRequestsFacade: CreditRequestsFacade,
    private tenantService: TenantService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.pendingRequests$ = this.creditRequestsFacade.pendingRequests$;

    if (this.isSuperAdmin) {
      this.loadTenants();
    }

    this.loadPendingRequests();
  }

  loadTenants() {
    this.tenantService.getAllTenants().subscribe({
      next: (response) => {
        this.tenants = response.tenants || [];
      }
    });
  }

  loadPendingRequests() {
    // Pass tenant_id for server-side filtering
    const tenantId = this.tenantFilter !== 'all' ? this.tenantFilter : undefined;
    this.creditRequestsFacade.loadPendingRequests(tenantId);
  }

  approveRequest(id: number) {
    if (confirm('Approve this credit request?')) {
      this.creditRequestsFacade.approveRequest(id);
    }
  }

  rejectRequest(id: number) {
    const reason = prompt('Reason for rejection:');
    if (reason) {
      this.creditRequestsFacade.rejectRequest(id, reason);
    }
  }

  onTenantFilterChange() {
    // Reload with new tenant filter
    this.loadPendingRequests();
  }
}
```

**NgRx Integration:**
- Uses `CreditRequestsFacade` for state management
- Dispatches actions with `tenantId` parameter for server-side filtering
- Effects pass `tenant_id` to service layer
- Backend enforces tenant isolation automatically
- Subscribes to `pendingRequests$` and `loading$` observables

---

### 6. AddTenantAdminComponent

**Path:** `components/super-admin/add-tenant-admin.component.ts`

**Purpose:** Create new Tenant Admin users for existing tenants.

**Key Features:**
- Select tenant from dropdown
- Tenant admin email input
- Automatic user creation with TENANT_ADMIN role
- Email notification to new admin

**Form Structure:**
```typescript
adminForm = this.fb.group({
  tenant_id: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]],
  send_notification: [true]
});
```

**Services Used:**
- `TenantAdminService.createTenantAdmin(data)` - Create admin user
- `TenantService.getAllTenants()` - Populate tenant dropdown

---

### 7. TenantAdminDetailComponent

**Path:** `components/super-admin/tenant-admin-detail.component.ts`

**Purpose:** View details of a specific Tenant Admin.

**Key Features:**
- Admin information display
- Associated tenant details
- Permissions list
- Activity log
- Deactivate/activate actions

---

## Tenant Admin Components

Tenant Admin components manage tenant-specific operations including products, coupons, users, and analytics.

### 8. TenantDashboardComponent

**Path:** `components/tenant-dashboard/tenant-dashboard.component.ts`

**Purpose:** Main dashboard for Tenant Admins showing tenant-specific metrics.

**Key Features:**
- Credit balance display
- Active products count
- Total coupons generated
- Recent scans
- Active verification apps
- Quick actions (Create Product, Generate Coupons, Request Credits)

**Template Structure:**
```html
<div class="dashboard-container">
  <div class="stats-grid">
    <!-- Credit Balance Card -->
    <div class="stat-card">
      <h3>Credit Balance</h3>
      <p class="stat-value">{{ creditBalance | number }}</p>
      <button (click)="requestCredits()">Request Credits</button>
    </div>

    <!-- Products Card -->
    <div class="stat-card">
      <h3>Active Products</h3>
      <p class="stat-value">{{ activeProducts }}</p>
      <button routerLink="/tenant/products/create">Add Product</button>
    </div>

    <!-- Coupons Card -->
    <div class="stat-card">
      <h3>Total Coupons</h3>
      <p class="stat-value">{{ totalCoupons | number }}</p>
      <button routerLink="/tenant/coupons/create">Create Coupons</button>
    </div>

    <!-- Recent Scans Card -->
    <div class="stat-card">
      <h3>Scans Today</h3>
      <p class="stat-value">{{ scansToday }}</p>
      <button routerLink="/tenant/scans">View History</button>
    </div>
  </div>

  <!-- Recent Activity -->
  <div class="recent-activity">
    <h3>Recent Activity</h3>
    <ul>
      <li *ngFor="let activity of recentActivities">
        {{ activity.description }} - {{ activity.timestamp | date }}
      </li>
    </ul>
  </div>
</div>
```

**Services Used:**
- `CreditService.getCreditBalance()` - Current credits
- `ProductsService.getProducts()` - Product count
- `RewardsService.getCoupons()` - Coupon count
- `RewardsService.getRecentScans()` - Scan activity

---

### 9. ProductListComponent

**Path:** `components/products/product-list.component.ts`

**Purpose:** Display and manage all products for the tenant.

**Key Features:**
- Searchable product table
- Filter by category, template, status
- Pagination
- Bulk actions (Delete, Activate/Deactivate)
- Quick edit
- App context filtering

**Component Implementation:**
```typescript
export class ProductListComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  loading: boolean = false;
  error: string = '';
  searchTerm: string = '';
  categoryFilter: string = '';
  templateFilter: string = '';
  statusFilter: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalProducts: number = 0;

  categories: Category[] = [];
  templates: Template[] = [];

  selectedAppId: string | null = null;
  private appContextSubscription?: Subscription;

  constructor(
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private templateService: TemplateService,
    private appContextService: AppContextService,
    private router: Router
  ) {}

  ngOnInit() {
    // Subscribe to app context changes
    this.appContextSubscription = this.appContextService.selectedApp$.subscribe(
      app => {
        this.selectedAppId = app?.id || null;
        this.loadProducts();
      }
    );

    this.loadCategories();
    this.loadTemplates();
  }

  ngOnDestroy() {
    this.appContextSubscription?.unsubscribe();
  }

  loadProducts() {
    if (!this.selectedAppId) {
      this.products = [];
      return;
    }

    this.loading = true;
    this.productsService.getProducts({
      app_id: this.selectedAppId,
      search: this.searchTerm,
      category_id: this.categoryFilter,
      template_id: this.templateFilter,
      status: this.statusFilter,
      page: this.currentPage,
      limit: this.itemsPerPage
    }).subscribe({
      next: (response) => {
        this.products = response.data.products;
        this.totalProducts = response.data.total;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to load products';
        this.loading = false;
      }
    });
  }

  onSearch() {
    this.currentPage = 1;
    this.loadProducts();
  }

  deleteProduct(productId: string) {
    if (confirm('Are you sure you want to delete this product?')) {
      this.productsService.deleteProduct(productId).subscribe({
        next: () => {
          this.loadProducts();
        },
        error: (error) => {
          this.error = error.error?.message || 'Failed to delete product';
        }
      });
    }
  }

  editProduct(productId: string) {
    this.router.navigate(['/tenant/products/edit', productId]);
  }
}
```

**Permission Checks:**
- `VIEW_PRODUCTS` - View product list
- `CREATE_PRODUCTS` - Show create button
- `EDIT_PRODUCTS` - Show edit button
- `DELETE_PRODUCTS` - Show delete button

**App Context Integration:**
Products are filtered by the currently selected Verification App. The app selector is displayed in the shared header.

---

### 10. ProductFormComponent

**Path:** `components/products/product-form.component.ts`

**Purpose:** Create or edit products with template-based attributes and variants.

**Key Features:**
- Template selection (determines available attributes)
- Dynamic attribute fields based on template
- Variant management (size, color, etc.)
- Structured description editor
- Category and tag assignment
- Image upload
- Base price and variant pricing

**Complex Form Structure:**
```typescript
export class ProductFormComponent implements OnInit {
  productForm: FormGroup;
  isEditMode: boolean = false;
  productId: string | null = null;

  templates: Template[] = [];
  selectedTemplate: Template | null = null;
  categories: Category[] = [];
  tags: Tag[] = [];

  // Variant management
  variantDefinitions: VariantDefinition[] = [];

  constructor(
    private fb: FormBuilder,
    private productsService: ProductsService,
    private templateService: TemplateService,
    private categoriesService: CategoriesService,
    private tagService: TagService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.productForm = this.fb.group({
      template_id: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      structured_description: this.fb.group({}),
      category_id: [''],
      tag_ids: [[]],
      base_price: [0, [Validators.min(0)]],
      attributes: this.fb.group({}),  // Dynamic based on template
      variants: this.fb.array([]),  // Variant configurations
      is_active: [true]
    });
  }

  ngOnInit() {
    this.loadTemplates();
    this.loadCategories();
    this.loadTags();

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.productId = params['id'];
        this.loadProduct();
      }
    });

    // Watch template changes to rebuild form
    this.productForm.get('template_id')?.valueChanges.subscribe(templateId => {
      this.onTemplateChange(templateId);
    });
  }

  onTemplateChange(templateId: string) {
    const template = this.templates.find(t => t.id === templateId);
    if (template) {
      this.selectedTemplate = template;
      this.buildDynamicFields(template);
      this.buildVariantDefinitions(template);
    }
  }

  buildDynamicFields(template: Template) {
    // Clear existing attributes
    this.productForm.setControl('attributes', this.fb.group({}));
    this.productForm.setControl('structured_description', this.fb.group({}));

    const attributesGroup = this.productForm.get('attributes') as FormGroup;
    const descGroup = this.productForm.get('structured_description') as FormGroup;

    // Add fields based on template attributes
    template.attributes?.forEach(attr => {
      const validators = [];
      if (attr.required) {
        validators.push(Validators.required);
      }

      attributesGroup.addControl(
        attr.name,
        this.fb.control('', validators)
      );
    });

    // Add structured description fields
    template.structured_description_fields?.forEach(field => {
      descGroup.addControl(
        field.name,
        this.fb.control('', field.required ? Validators.required : [])
      );
    });
  }

  buildVariantDefinitions(template: Template) {
    this.variantDefinitions = template.variant_definitions || [];

    // Clear existing variants FormArray
    this.productForm.setControl('variants', this.fb.array([]));
  }

  get variantsFormArray(): FormArray {
    return this.productForm.get('variants') as FormArray;
  }

  addVariant() {
    const variantGroup = this.fb.group({});

    // Add controls for each variant dimension
    this.variantDefinitions.forEach(def => {
      variantGroup.addControl(def.name, this.fb.control('', Validators.required));
    });

    // Add price and SKU
    variantGroup.addControl('price', this.fb.control(0, [Validators.required, Validators.min(0)]));
    variantGroup.addControl('sku', this.fb.control(''));
    variantGroup.addControl('stock', this.fb.control(0, Validators.min(0)));

    this.variantsFormArray.push(variantGroup);
  }

  removeVariant(index: number) {
    this.variantsFormArray.removeAt(index);
  }

  onSubmit() {
    if (this.productForm.invalid) {
      return;
    }

    const productData = this.productForm.value;

    const request = this.isEditMode
      ? this.productsService.updateProduct(this.productId!, productData)
      : this.productsService.createProduct(productData);

    request.subscribe({
      next: () => {
        this.router.navigate(['/tenant/products']);
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to save product';
      }
    });
  }
}
```

**Child Components:**
- `VariantListEditorComponent` - Manage product variants
- `StructuredDescriptionEditorComponent` - Edit structured description fields

**Template Dynamic Fields Example:**
```html
<!-- Dynamic attributes based on selected template -->
<div *ngIf="selectedTemplate" formGroupName="attributes">
  <div *ngFor="let attr of selectedTemplate.attributes" class="form-group">
    <label>{{ attr.label || attr.name }}</label>
    <input
      *ngIf="attr.type === 'text'"
      [formControlName]="attr.name"
      type="text"
      [placeholder]="attr.placeholder"
    />
    <select *ngIf="attr.type === 'select'" [formControlName]="attr.name">
      <option value="">Select {{ attr.label }}</option>
      <option *ngFor="let option of attr.options" [value]="option">
        {{ option }}
      </option>
    </select>
    <div *ngIf="isFieldInvalid('attributes.' + attr.name)" class="error">
      {{ attr.label }} is required
    </div>
  </div>
</div>

<!-- Variants -->
<div formArrayName="variants">
  <h3>Variants</h3>
  <button type="button" (click)="addVariant()">Add Variant</button>

  <div *ngFor="let variant of variantsFormArray.controls; let i = index" [formGroupName]="i">
    <div class="variant-row">
      <div *ngFor="let def of variantDefinitions" class="form-group">
        <label>{{ def.label }}</label>
        <select [formControlName]="def.name">
          <option *ngFor="let opt of def.options" [value]="opt">{{ opt }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>Price</label>
        <input type="number" formControlName="price" />
      </div>
      <button type="button" (click)="removeVariant(i)">Remove</button>
    </div>
  </div>
</div>
```

---

### 11. TemplateListComponent

**Path:** `components/templates/template-list.component.ts`

**Purpose:** Manage product templates that define product structure.

**Key Features:**
- List all templates
- Create new template
- Edit existing template
- View template details
- Delete template (if no products use it)

---

### 12. TemplateFormComponent

**Path:** `components/templates/template-form.component.ts`

**Purpose:** Create or edit product templates with custom attributes and variant definitions.

**Key Features:**
- Template name and description
- Attribute manager (add/remove/edit attributes)
- Variant dimension definitions
- Structured description field definitions
- Attribute types (text, number, select, checkbox, textarea)

**Attribute Management:**
```typescript
export class TemplateFormComponent {
  templateForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.templateForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      attributes: this.fb.array([]),
      variant_definitions: this.fb.array([]),
      structured_description_fields: this.fb.array([])
    });
  }

  get attributesArray(): FormArray {
    return this.templateForm.get('attributes') as FormArray;
  }

  addAttribute() {
    const attrGroup = this.fb.group({
      name: ['', Validators.required],
      label: ['', Validators.required],
      type: ['text', Validators.required],
      required: [false],
      options: [[]],  // For select type
      placeholder: [''],
      validation: this.fb.group({
        min: [null],
        max: [null],
        pattern: ['']
      })
    });

    this.attributesArray.push(attrGroup);
  }

  removeAttribute(index: number) {
    this.attributesArray.removeAt(index);
  }

  addVariantDefinition() {
    const variantGroup = this.fb.group({
      name: ['', Validators.required],
      label: ['', Validators.required],
      options: [[], Validators.required]  // e.g., ['Small', 'Medium', 'Large']
    });

    (this.templateForm.get('variant_definitions') as FormArray).push(variantGroup);
  }
}
```

---

### 13. CouponListComponent

**Path:** `components/rewards/coupon-list.component.ts`

**Purpose:** Display and manage all generated coupons.

**Key Features:**
- Search by coupon code
- Filter by status (DRAFT, PRINTED, ACTIVE, USED, EXPIRED)
- Filter by product
- Filter by verification app
- Batch activation
- Export coupons (CSV, PDF)
- QR code preview
- Change status (activate, deactivate)

**Component Structure:**
```typescript
export class CouponListComponent implements OnInit {
  coupons: Coupon[] = [];
  loading: boolean = false;
  searchTerm: string = '';
  statusFilter: string = '';
  productFilter: string = '';
  appFilter: string = '';

  products: Product[] = [];
  verificationApps: VerificationApp[] = [];

  selectedCoupons: Set<string> = new Set();

  constructor(
    private rewardsService: RewardsService,
    private productsService: ProductsService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCoupons();
    this.loadProducts();
    this.loadVerificationApps();
  }

  loadCoupons() {
    this.loading = true;
    this.rewardsService.getCoupons({
      search: this.searchTerm,
      status: this.statusFilter,
      product_id: this.productFilter,
      app_id: this.appFilter
    }).subscribe({
      next: (response) => {
        this.coupons = response.data.coupons;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message;
        this.loading = false;
      }
    });
  }

  toggleCouponSelection(couponId: string) {
    if (this.selectedCoupons.has(couponId)) {
      this.selectedCoupons.delete(couponId);
    } else {
      this.selectedCoupons.add(couponId);
    }
  }

  activateSelected() {
    if (this.selectedCoupons.size === 0) {
      return;
    }

    const couponIds = Array.from(this.selectedCoupons);
    this.rewardsService.batchActivateCoupons(couponIds).subscribe({
      next: () => {
        this.selectedCoupons.clear();
        this.loadCoupons();
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to activate coupons';
      }
    });
  }

  exportCoupons() {
    const params = {
      format: 'csv',
      search: this.searchTerm,
      status: this.statusFilter
    };

    this.rewardsService.exportCoupons(params).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `coupons-${Date.now()}.csv`;
        a.click();
      }
    });
  }
}
```

**Coupon Status Transitions:**
- `DRAFT` → `PRINTED` (when printed)
- `PRINTED` → `ACTIVE` (when activated)
- `ACTIVE` → `USED` (when scanned)
- `ACTIVE` → `EXPIRED` (when past expiration date)

---

### 14. CouponCreateComponent

**Path:** `components/rewards/coupon-create.component.ts`

**Purpose:** Generate coupons (single or batch).

**Key Features:**
- Single coupon creation
- Batch coupon creation (up to 10,000)
- Select product(s)
- Set points value
- Set expiration date
- Preview QR codes
- Credit cost calculation
- Batch activation option

**Form Structure:**
```typescript
export class CouponCreateComponent implements OnInit {
  couponForm: FormGroup;
  products: Product[] = [];
  creditBalance: number = 0;
  estimatedCost: number = 0;

  batchMode: boolean = false;

  constructor(
    private fb: FormBuilder,
    private rewardsService: RewardsService,
    private productsService: ProductsService,
    private creditService: CreditService
  ) {
    this.couponForm = this.fb.group({
      product_ids: [[], Validators.required],
      points: [0, [Validators.required, Validators.min(1)]],
      quantity: [1, [Validators.required, Validators.min(1), Validators.max(10000)]],
      expires_at: [''],
      activate_immediately: [false]
    });
  }

  ngOnInit() {
    this.loadProducts();
    this.loadCreditBalance();

    // Watch quantity changes to calculate cost
    this.couponForm.get('quantity')?.valueChanges.subscribe(quantity => {
      this.estimatedCost = quantity * 1;  // 1 credit per coupon
    });
  }

  toggleBatchMode() {
    this.batchMode = !this.batchMode;
    if (this.batchMode) {
      this.couponForm.get('quantity')?.setValue(10);
    } else {
      this.couponForm.get('quantity')?.setValue(1);
    }
  }

  loadCreditBalance() {
    this.creditService.getCreditBalance().subscribe({
      next: (response) => {
        this.creditBalance = response.data.balance;
      }
    });
  }

  onSubmit() {
    if (this.couponForm.invalid) {
      return;
    }

    if (this.estimatedCost > this.creditBalance) {
      this.error = 'Insufficient credits. Please request more credits.';
      return;
    }

    const data = this.couponForm.value;

    this.rewardsService.generateCoupons(data).subscribe({
      next: (response) => {
        this.success = `Successfully generated ${response.data.count} coupon(s)`;
        this.router.navigate(['/tenant/coupons']);
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to generate coupons';
      }
    });
  }
}
```

**Credit Cost:**
- 1 credit = 1 coupon
- Batch creation requires sufficient credits
- Validation before submission

---

### 15. VerificationAppListComponent

**Path:** `components/verification-app/verification-app-list.component.ts`

**Purpose:** Manage verification applications for the tenant.

**Key Features:**
- List all verification apps
- Create new app
- Edit app details
- View API configuration
- Generate API keys
- Toggle app status
- Delete app (with confirmation)

**Verification App Concept:**
A Verification App represents a separate application instance (e.g., mobile app, kiosk, website) that can scan coupons. Each app has its own:
- API key for authentication
- Configuration settings
- Scan history
- Associated products/coupons

**Component Implementation:**
```typescript
export class VerificationAppListComponent implements OnInit {
  apps$ = this.verificationAppsFacade.apps$;
  loading$ = this.verificationAppsFacade.loading$;

  constructor(
    private verificationAppsFacade: VerificationAppsFacade,
    private router: Router
  ) {}

  ngOnInit() {
    this.verificationAppsFacade.loadApps();
  }

  createApp() {
    this.router.navigate(['/tenant/verification-app/configure']);
  }

  editApp(appId: string) {
    this.router.navigate(['/tenant/verification-app/configure', appId]);
  }

  viewApiConfig(appId: string) {
    this.router.navigate(['/tenant/verification-app', appId, 'api-config']);
  }

  regenerateApiKey(appId: string) {
    if (confirm('Regenerate API key? This will invalidate the existing key.')) {
      this.verificationAppsFacade.regenerateApiKey(appId);
    }
  }

  deleteApp(appId: string) {
    if (confirm('Delete this verification app?')) {
      this.verificationAppsFacade.deleteApp(appId);
    }
  }
}
```

**NgRx Integration:**
Uses `VerificationAppsFacade` for state management.

---

### 16. VerificationAppConfigureComponent

**Path:** `components/verification-app/verification-app-configure.component.ts`

**Purpose:** Configure verification app settings.

**Key Features:**
- App name and description
- App type (Mobile, Web, Kiosk, POS)
- Webhook URL configuration
- Settings (allow duplicate scans, require user auth, etc.)
- Generate API key on creation

**Form Structure:**
```typescript
appForm = this.fb.group({
  app_name: ['', Validators.required],
  app_type: ['MOBILE', Validators.required],
  description: [''],
  webhook_url: ['', Validators.pattern(/^https?:\/\/.+/)],
  settings: this.fb.group({
    allow_duplicate_scans: [false],
    require_user_authentication: [true],
    scan_cooldown_seconds: [0, Validators.min(0)],
    max_scans_per_day: [0, Validators.min(0)]
  }),
  is_active: [true]
});
```

---

### 17. TenantUsersListComponent

**Path:** `components/tenant-users/tenant-users-list.component.ts`

**Purpose:** Manage users within the tenant.

**Key Features:**
- List all tenant users
- Filter by role (TENANT_ADMIN, TENANT_USER)
- Search by email/name
- Create new user
- Edit user
- Assign permissions
- Deactivate/activate user
- Delete user

**Component Structure:**
```typescript
export class TenantUsersListComponent implements OnInit {
  users: User[] = [];
  loading: boolean = false;
  searchTerm: string = '';
  roleFilter: string = '';

  constructor(
    private tenantUsersService: TenantUsersService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.tenantUsersService.getTenantUsers({
      search: this.searchTerm,
      role: this.roleFilter
    }).subscribe({
      next: (response) => {
        this.users = response.data.users;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message;
        this.loading = false;
      }
    });
  }

  managePermissions(userId: string) {
    this.router.navigate(['/tenant/users', userId, 'permissions']);
  }

  toggleUserStatus(user: User) {
    const newStatus = !user.is_active;
    this.tenantUsersService.updateUser(user.id, { is_active: newStatus })
      .subscribe({
        next: () => this.loadUsers(),
        error: (error) => this.error = error.error?.message
      });
  }

  deleteUser(userId: string) {
    if (confirm('Delete this user? This action cannot be undone.')) {
      this.tenantUsersService.deleteUser(userId).subscribe({
        next: () => this.loadUsers(),
        error: (error) => this.error = error.error?.message
      });
    }
  }
}
```

---

### 18. TenantUserFormComponent

**Path:** `components/tenant-users/tenant-user-form.component.ts`

**Purpose:** Create or edit tenant users.

**Key Features:**
- Email input (unique within tenant)
- Role selection (TENANT_ADMIN, TENANT_USER)
- Initial permission assignment
- Active status toggle

---

### 19. UserPermissionsComponent

**Path:** `components/tenant-users/user-permissions.component.ts`

**Purpose:** Manage user permissions.

**Key Features:**
- Grouped permission checkboxes
- Permission scope filter (Products, Coupons, Users, Analytics)
- Bulk assign/revoke
- Permission descriptions

**Permission Groups:**
```typescript
permissionGroups = [
  {
    scope: 'Products',
    permissions: [
      { code: 'VIEW_PRODUCTS', label: 'View Products', description: 'View product list' },
      { code: 'CREATE_PRODUCTS', label: 'Create Products', description: 'Create new products' },
      { code: 'EDIT_PRODUCTS', label: 'Edit Products', description: 'Edit existing products' },
      { code: 'DELETE_PRODUCTS', label: 'Delete Products', description: 'Delete products' }
    ]
  },
  {
    scope: 'Coupons',
    permissions: [
      { code: 'VIEW_COUPONS', label: 'View Coupons', description: 'View coupon list' },
      { code: 'CREATE_COUPONS', label: 'Create Coupons', description: 'Generate coupons' },
      { code: 'ACTIVATE_COUPONS', label: 'Activate Coupons', description: 'Activate draft coupons' },
      { code: 'DELETE_COUPONS', label: 'Delete Coupons', description: 'Delete coupons' }
    ]
  },
  {
    scope: 'Users',
    permissions: [
      { code: 'VIEW_TENANT_USERS', label: 'View Users', description: 'View user list' },
      { code: 'MANAGE_TENANT_USERS', label: 'Manage Users', description: 'Create/edit/delete users' },
      { code: 'ASSIGN_PERMISSIONS', label: 'Assign Permissions', description: 'Assign permissions to users' }
    ]
  },
  {
    scope: 'Analytics',
    permissions: [
      { code: 'VIEW_ANALYTICS', label: 'View Analytics', description: 'View analytics dashboard' },
      { code: 'EXPORT_REPORTS', label: 'Export Reports', description: 'Export analytics reports' }
    ]
  }
];
```

**Implementation:**
```typescript
export class UserPermissionsComponent implements OnInit {
  userId: string = '';
  userPermissions: Set<string> = new Set();
  availablePermissions: Permission[] = [];
  loading: boolean = false;

  constructor(
    private permissionsService: PermissionsService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.userId = params['id'];
      this.loadUserPermissions();
      this.loadAvailablePermissions();
    });
  }

  loadUserPermissions() {
    this.permissionsService.getUserPermissions(this.userId).subscribe({
      next: (response) => {
        this.userPermissions = new Set(
          response.data.permissions.map(p => p.permission_code)
        );
      }
    });
  }

  togglePermission(permissionCode: string) {
    if (this.userPermissions.has(permissionCode)) {
      this.revokePermission(permissionCode);
    } else {
      this.assignPermission(permissionCode);
    }
  }

  assignPermission(permissionCode: string) {
    this.permissionsService.assignPermission(this.userId, permissionCode)
      .subscribe({
        next: () => {
          this.userPermissions.add(permissionCode);
        }
      });
  }

  revokePermission(permissionCode: string) {
    this.permissionsService.revokePermission(this.userId, permissionCode)
      .subscribe({
        next: () => {
          this.userPermissions.delete(permissionCode);
        }
      });
  }
}
```

---

### 20. CreditRequestFormComponent

**Path:** `components/credit-management/credit-request-form.component.ts`

**Purpose:** Request credits from Super Admin.

**Key Features:**
- Amount input
- Justification textarea
- Current balance display
- Request history
- Pending request status

---

### 21. CreditTransactionHistoryComponent

**Path:** `components/credit-management/credit-transaction-history.component.ts`

**Purpose:** View credit transaction history.

**Key Features:**
- Transaction list (credits, debits, pending requests)
- Filter by type (CREDIT, DEBIT, PENDING)
- Date range filter
- Transaction details (amount, reason, approved_by, etc.)

---

### 22. TenantAnalyticsComponent

**Path:** `components/tenant-analytics/tenant-analytics.component.ts`

**Purpose:** Analytics dashboard for tenant.

**Key Features:**
- Coupon redemption rates (Chart.js)
- Product performance metrics
- Scan analytics by app
- User activity
- Date range selector
- Export reports

---

## Shared/Common Components

### 23. SharedHeaderComponent

**Path:** `components/shared-header/shared-header.component.ts`

**Purpose:** Application header with navigation and user menu.

**Key Features:**
- Tenant/Super Admin branding
- App selector (for tenants with multiple apps)
- User menu (Profile, Settings, Logout)
- Notifications
- Credit balance display (for tenants)

**Component Structure:**
```typescript
export class SharedHeaderComponent implements OnInit {
  currentUser$ = this.authService.currentUser$;
  isSuperAdmin$ = this.authService.isSuperAdmin$;
  creditBalance$ = this.creditService.creditBalance$;

  selectedApp$ = this.appContextService.selectedApp$;
  verificationApps$ = this.appContextService.verificationApps$;

  constructor(
    private authService: AuthService,
    private creditService: CreditService,
    private appContextService: AppContextService,
    private router: Router
  ) {}

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  selectApp(app: VerificationApp) {
    this.appContextService.selectApp(app);
  }
}
```

**Template:**
```html
<header class="app-header">
  <div class="header-left">
    <h1 *ngIf="(isSuperAdmin$ | async)">MScan Super Admin</h1>
    <h1 *ngIf="!(isSuperAdmin$ | async)">{{ (currentUser$ | async)?.tenant_name }}</h1>
  </div>

  <!-- App Selector for Tenants -->
  <div *ngIf="!(isSuperAdmin$ | async)" class="app-selector-container">
    <app-app-selector
      [apps]="verificationApps$ | async"
      [selectedApp]="selectedApp$ | async"
      (appSelected)="selectApp($event)"
    ></app-app-selector>
  </div>

  <div class="header-right">
    <!-- Credit Balance (Tenants only) -->
    <div *ngIf="!(isSuperAdmin$ | async)" class="credit-display">
      Credits: {{ (creditBalance$ | async) | number }}
    </div>

    <!-- User Menu -->
    <div class="user-menu">
      <span>{{ (currentUser$ | async)?.email }}</span>
      <button (click)="logout()">Logout</button>
    </div>
  </div>
</header>
```

---

### 24. SideNavComponent

**Path:** `components/side-nav/side-nav.component.ts`

**Purpose:** Side navigation menu.

**Key Features:**
- Role-based menu items
- Permission-based visibility
- Active route highlighting
- Collapsible sections

**Navigation Structure:**
```typescript
export class SideNavComponent implements OnInit {
  menuItems: MenuItem[] = [];
  isSuperAdmin: boolean = false;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.buildMenu();
  }

  buildMenu() {
    if (this.isSuperAdmin) {
      this.menuItems = [
        { label: 'Dashboard', route: '/super-admin/dashboard', icon: 'dashboard' },
        { label: 'Tenants', route: '/super-admin/tenants', icon: 'business' },
        { label: 'Tenant Admins', route: '/super-admin/tenant-admins', icon: 'people' },
        { label: 'Credit Approvals', route: '/super-admin/credits/pending', icon: 'approval' },
        { label: 'Transaction History', route: '/super-admin/credits/history', icon: 'history' }
      ];
    } else {
      this.menuItems = [
        { label: 'Dashboard', route: '/tenant/dashboard', icon: 'dashboard' },
        {
          label: 'Products',
          route: '/tenant/products',
          icon: 'inventory',
          permission: 'VIEW_PRODUCTS'
        },
        {
          label: 'Templates',
          route: '/tenant/templates',
          icon: 'template',
          permission: 'VIEW_PRODUCTS'
        },
        {
          label: 'Categories',
          route: '/tenant/categories',
          icon: 'category',
          permission: 'VIEW_PRODUCTS'
        },
        {
          label: 'Tags',
          route: '/tenant/tags',
          icon: 'label',
          permission: 'VIEW_PRODUCTS'
        },
        {
          label: 'Coupons',
          route: '/tenant/coupons',
          icon: 'card_giftcard',
          permission: 'VIEW_COUPONS'
        },
        {
          label: 'Verification Apps',
          route: '/tenant/verification-app',
          icon: 'apps',
          permission: 'VIEW_PRODUCTS'
        },
        {
          label: 'Users',
          route: '/tenant/users',
          icon: 'people',
          permission: 'VIEW_TENANT_USERS'
        },
        {
          label: 'Analytics',
          route: '/tenant/analytics',
          icon: 'analytics',
          permission: 'VIEW_ANALYTICS'
        },
        {
          label: 'Credits',
          route: '/tenant/credits',
          icon: 'account_balance_wallet'
        },
        {
          label: 'Scans',
          route: '/tenant/scans',
          icon: 'qr_code_scanner'
        }
      ];
    }
  }

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }
}
```

---

### 25. AppSelectorComponent

**Path:** `components/app-selector/app-selector.component.ts`

**Purpose:** Dropdown selector for verification apps.

**Component (Dumb):**
```typescript
@Component({
  selector: 'app-app-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <select [(ngModel)]="selectedAppId" (change)="onAppChange()">
      <option value="">Select App</option>
      <option *ngFor="let app of apps" [value]="app.id">
        {{ app.app_name }}
      </option>
    </select>
  `
})
export class AppSelectorComponent {
  @Input() apps: VerificationApp[] = [];
  @Input() selectedApp: VerificationApp | null = null;
  @Output() appSelected = new EventEmitter<VerificationApp>();

  selectedAppId: string = '';

  ngOnChanges() {
    this.selectedAppId = this.selectedApp?.id || '';
  }

  onAppChange() {
    const app = this.apps.find(a => a.id === this.selectedAppId);
    if (app) {
      this.appSelected.emit(app);
    }
  }
}
```

---

### 26. LoginComponent

**Path:** `components/login/login.component.ts`

**Purpose:** User authentication (OTP-based).

**Key Features:**
- Email input (step 1)
- OTP input (step 2)
- User type selector (for first login)
- Resend OTP
- Auto-redirect based on user type

**Two-Step Process:**
```typescript
export class LoginComponent implements OnInit {
  step: 'email' | 'otp' = 'email';
  email: string = '';
  otp: string = '';
  userType: string = 'TENANT_ADMIN';
  loading: boolean = false;
  error: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  requestOtp() {
    if (!this.email) {
      this.error = 'Email is required';
      return;
    }

    this.loading = true;
    this.authService.requestOtp(this.email, this.userType).subscribe({
      next: () => {
        this.step = 'otp';
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to send OTP';
        this.loading = false;
      }
    });
  }

  verifyOtp() {
    if (!this.otp) {
      this.error = 'OTP is required';
      return;
    }

    this.loading = true;
    this.authService.verifyOtp(this.email, this.otp).subscribe({
      next: (response) => {
        // Store tokens
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);

        // Redirect based on user type
        if (response.data.userType === 'SUPER_ADMIN') {
          this.router.navigate(['/super-admin/dashboard']);
        } else {
          this.router.navigate(['/tenant/dashboard']);
        }
      },
      error: (error) => {
        this.error = error.error?.message || 'Invalid OTP';
        this.loading = false;
      }
    });
  }

  resendOtp() {
    this.requestOtp();
  }
}
```

---

## Services

### HTTP Services

All services follow a consistent pattern:

```typescript
@Injectable({ providedIn: 'root' })
export class ProductsService {
  private apiUrl = environment.apiUrl + '/products';

  constructor(private http: HttpClient) {}

  getProducts(params?: any): Observable<ApiResponse<{ products: Product[]; total: number }>> {
    return this.http.get<ApiResponse>(this.apiUrl, { params });
  }

  getProductById(id: string): Observable<ApiResponse<Product>> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/${id}`);
  }

  createProduct(data: CreateProductDto): Observable<ApiResponse<Product>> {
    return this.http.post<ApiResponse>(this.apiUrl, data);
  }

  updateProduct(id: string, data: Partial<Product>): Observable<ApiResponse<Product>> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/${id}`, data);
  }

  deleteProduct(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`);
  }
}
```

**Key Services:**
- `AuthService` - Authentication and authorization
- `TenantService` - Tenant management
- `ProductsService` - Product CRUD
- `TemplateService` - Template management
- `RewardsService` - Coupons and verification apps
- `CreditService` - Credit management
- `CategoriesService` - Category management
- `TagService` - Tag management
- `TenantUsersService` - User management
- `PermissionsService` - Permission management
- `AnalyticsService` - Analytics data
- `AppContextService` - App context management

---

## State Management (NgRx)

### When to Use NgRx vs Direct Services

**Use NgRx for:**
- Complex state shared across many components
- State that needs to persist across route changes
- State with complex update logic
- Features requiring undo/redo
- Examples: Tenants list, Credit requests

**Use Direct Services for:**
- Simple CRUD operations
- Component-specific state
- One-time data fetches
- Examples: Product list, Coupon creation

### NgRx Structure

```
store/
├── actions/
│   ├── tenants.actions.ts
│   ├── credit-requests.actions.ts
│   ├── verification-apps.actions.ts
│   └── auth-context.actions.ts
│
├── reducers/
│   ├── tenants.reducer.ts
│   ├── credit-requests.reducer.ts
│   ├── verification-apps.reducer.ts
│   ├── auth-context.reducer.ts
│   └── index.ts  # Root reducer
│
├── effects/
│   ├── tenants.effects.ts
│   ├── credit-requests.effects.ts
│   ├── verification-apps.effects.ts
│   └── auth-context.effects.ts
│
├── selectors/
│   ├── tenants.selectors.ts
│   ├── credit-requests.selectors.ts
│   ├── verification-apps.selectors.ts
│   └── auth-context.selectors.ts
│
└── facades/
    ├── tenants.facade.ts
    ├── credit-requests.facade.ts
    ├── verification-apps.facade.ts
    └── auth-context.facade.ts
```

### Example: TenantsFacade

```typescript
@Injectable({ providedIn: 'root' })
export class TenantsFacade {
  // Selectors
  tenants$ = this.store.select(selectAllTenants);
  loading$ = this.store.select(selectTenantsLoading);
  error$ = this.store.select(selectTenantsError);
  selectedTenant$ = this.store.select(selectSelectedTenant);
  tenantAdmins$ = this.store.select(selectTenantAdmins);
  statistics$ = this.store.select(selectTenantStatistics);

  constructor(private store: Store) {}

  // Actions
  loadTenants(filters?: any) {
    this.store.dispatch(loadTenants({ filters }));
  }

  selectTenant(id: string) {
    this.store.dispatch(selectTenant({ id }));
  }

  createTenant(tenant: CreateTenantDto) {
    this.store.dispatch(createTenant({ tenant }));
  }

  updateTenant(id: string, changes: Partial<Tenant>) {
    this.store.dispatch(updateTenant({ id, changes }));
  }

  deleteTenant(id: string) {
    this.store.dispatch(deleteTenant({ id }));
  }

  loadTenantAdmins(tenantId: string) {
    this.store.dispatch(loadTenantAdmins({ tenantId }));
  }
}
```

---

## Routing

### Route Configuration

```typescript
// app.routes.ts
export const routes: Routes = [
  // Public routes
  { path: 'login', component: LoginComponent },

  // Dashboard router
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },

  // Super Admin routes
  {
    path: 'super-admin',
    canActivate: [AuthGuard],
    data: { requiredRole: 'SUPER_ADMIN' },
    children: [
      { path: 'dashboard', component: SuperAdminDashboardComponent },
      { path: 'tenants', component: TenantListComponent },
      { path: 'tenants/new', component: TenantFormComponent },
      { path: 'tenants/:id', component: TenantDetailComponent },
      { path: 'tenants/:id/edit', component: TenantFormComponent },
      { path: 'tenant-admins', component: TenantAdminDashboardComponent },
      { path: 'tenant-admins/add', component: AddTenantAdminComponent },
      { path: 'tenant-admins/tenant/:tenantId', component: TenantAdminDetailComponent },
      { path: 'credits/pending', component: CreditApprovalListComponent },
      { path: 'credits/history', component: CreditTransactionHistoryComponent }
    ]
  },

  // Tenant Admin routes
  {
    path: 'tenant',
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: TenantDashboardComponent },
      {
        path: 'products',
        canActivate: [PermissionGuard],
        data: { permission: 'VIEW_PRODUCTS' },
        component: ProductListComponent
      },
      {
        path: 'products/create',
        canActivate: [PermissionGuard],
        data: { permission: 'CREATE_PRODUCTS' },
        component: ProductFormComponent
      },
      {
        path: 'products/edit/:id',
        canActivate: [PermissionGuard],
        data: { permission: 'EDIT_PRODUCTS' },
        component: ProductFormComponent
      },
      {
        path: 'templates',
        canActivate: [PermissionGuard],
        data: { permission: 'VIEW_PRODUCTS' },
        component: TemplateListComponent
      },
      {
        path: 'coupons',
        canActivate: [PermissionGuard],
        data: { permission: 'VIEW_COUPONS' },
        component: CouponListComponent
      },
      {
        path: 'coupons/create',
        canActivate: [PermissionGuard],
        data: { permission: 'CREATE_COUPONS' },
        component: CouponCreateComponent
      },
      {
        path: 'verification-app',
        component: VerificationAppListComponent
      },
      {
        path: 'users',
        canActivate: [PermissionGuard],
        data: { permission: 'VIEW_TENANT_USERS' },
        component: TenantUsersListComponent
      },
      {
        path: 'users/create',
        canActivate: [PermissionGuard],
        data: { permission: 'MANAGE_TENANT_USERS' },
        component: TenantUserFormComponent
      },
      {
        path: 'users/:id/permissions',
        canActivate: [PermissionGuard],
        data: { permission: 'ASSIGN_PERMISSIONS' },
        component: UserPermissionsComponent
      },
      {
        path: 'analytics',
        canActivate: [PermissionGuard],
        data: { permission: 'VIEW_ANALYTICS' },
        component: TenantAnalyticsComponent
      },
      {
        path: 'credits',
        children: [
          { path: 'request', component: CreditRequestFormComponent },
          { path: 'history', component: CreditTransactionHistoryComponent }
        ]
      }
    ]
  },

  // Default redirect
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
```

### Route Guards

**AuthGuard:**
```typescript
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }

    const requiredRole = route.data['requiredRole'];
    if (requiredRole && !this.authService.hasRole(requiredRole)) {
      this.router.navigate(['/login']);
      return false;
    }

    return true;
  }
}
```

**PermissionGuard:**
```typescript
@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredPermission = route.data['permission'];

    if (requiredPermission && !this.authService.hasPermission(requiredPermission)) {
      this.router.navigate(['/tenant/dashboard']);
      return false;
    }

    return true;
  }
}
```

---

## Common Patterns

### 1. Loading States

```typescript
export class MyComponent {
  loading: boolean = false;
  error: string = '';

  loadData() {
    this.loading = true;
    this.service.getData().pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (data) => {
        this.data = data;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to load data';
      }
    });
  }
}
```

**Template:**
```html
<div *ngIf="loading" class="spinner">Loading...</div>
<div *ngIf="error" class="error">{{ error }}</div>
<div *ngIf="!loading && !error">
  <!-- Content -->
</div>
```

---

### 2. Form Validation

```typescript
isFieldInvalid(fieldName: string): boolean {
  const field = this.form.get(fieldName);
  return !!(field && field.invalid && (field.dirty || field.touched));
}

getFieldError(fieldName: string): string {
  const field = this.form.get(fieldName);
  if (field?.hasError('required')) {
    return 'This field is required';
  }
  if (field?.hasError('email')) {
    return 'Invalid email address';
  }
  if (field?.hasError('minlength')) {
    return `Minimum length is ${field.errors['minlength'].requiredLength}`;
  }
  return '';
}
```

**Template:**
```html
<div class="form-group">
  <label>Email</label>
  <input type="email" formControlName="email" />
  <div *ngIf="isFieldInvalid('email')" class="error">
    {{ getFieldError('email') }}
  </div>
</div>
```

---

### 3. Confirmation Dialogs

```typescript
deleteItem(id: string) {
  if (confirm('Are you sure you want to delete this item?')) {
    this.service.delete(id).subscribe({
      next: () => {
        this.loadItems();
        this.success = 'Item deleted successfully';
      },
      error: (error) => {
        this.error = error.error?.message;
      }
    });
  }
}
```

---

### 4. Pagination

```typescript
export class ListComponent {
  currentPage: number = 1;
  itemsPerPage: number = 20;
  totalItems: number = 0;

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadItems();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadItems();
    }
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.loadItems();
  }
}
```

---

### 5. Search with Debounce

```typescript
export class SearchComponent implements OnInit {
  searchControl = new FormControl('');

  ngOnInit() {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(searchTerm => {
        this.performSearch(searchTerm);
      });
  }

  performSearch(term: string) {
    this.service.search(term).subscribe({
      next: (results) => {
        this.results = results;
      }
    });
  }
}
```

---

## Component Reference

### Quick Reference Table

| Component | Path | Purpose | Key Features |
|-----------|------|---------|--------------|
| **SuperAdminDashboardComponent** | `super-admin/super-admin-dashboard.component.ts` | Super Admin main dashboard | System statistics, quick actions |
| **TenantListComponent** | `super-admin/tenant-list.component.ts` | Manage all tenants | Search, filter, CRUD operations |
| **TenantFormComponent** | `super-admin/tenant-form.component.ts` | Create/edit tenants | Subdomain validation, settings |
| **TenantDetailComponent** | `super-admin/tenant-detail.component.ts` | View tenant details | Stats, users, credits |
| **CreditApprovalListComponent** | `credit-management/credit-approval-list.component.ts` | Approve/reject credit requests | Filter by tenant, approve/reject |
| **AddTenantAdminComponent** | `super-admin/add-tenant-admin.component.ts` | Create tenant admins | Select tenant, email input |
| **TenantDashboardComponent** | `tenant-dashboard/tenant-dashboard.component.ts` | Tenant main dashboard | Credits, products, coupons stats |
| **ProductListComponent** | `products/product-list.component.ts` | Manage products | Search, filter, CRUD, app context |
| **ProductFormComponent** | `products/product-form.component.ts` | Create/edit products | Template-based, variants, attributes |
| **TemplateListComponent** | `templates/template-list.component.ts` | Manage product templates | List, create, edit templates |
| **TemplateFormComponent** | `templates/template-form.component.ts` | Create/edit templates | Attributes, variants, fields |
| **CouponListComponent** | `rewards/coupon-list.component.ts` | Manage coupons | Search, filter, batch actions |
| **CouponCreateComponent** | `rewards/coupon-create.component.ts` | Generate coupons | Single/batch, products, points |
| **VerificationAppListComponent** | `verification-app/verification-app-list.component.ts` | Manage verification apps | List, create, API keys |
| **VerificationAppConfigureComponent** | `verification-app/verification-app-configure.component.ts` | Configure apps | Name, type, webhooks, settings |
| **TenantUsersListComponent** | `tenant-users/tenant-users-list.component.ts` | Manage tenant users | List, create, permissions |
| **TenantUserFormComponent** | `tenant-users/tenant-user-form.component.ts` | Create/edit users | Email, role, permissions |
| **UserPermissionsComponent** | `tenant-users/user-permissions.component.ts` | Manage user permissions | Grouped permissions, assign/revoke |
| **CreditRequestFormComponent** | `credit-management/credit-request-form.component.ts` | Request credits | Amount, justification |
| **CreditTransactionHistoryComponent** | `credit-management/credit-transaction-history.component.ts` | View credit history | Transactions, filters |
| **TenantAnalyticsComponent** | `tenant-analytics/tenant-analytics.component.ts` | Tenant analytics | Charts, metrics, reports |
| **SharedHeaderComponent** | `shared-header/shared-header.component.ts` | App header | Navigation, app selector, user menu |
| **SideNavComponent** | `side-nav/side-nav.component.ts` | Side navigation | Role-based menu, permissions |
| **AppSelectorComponent** | `app-selector/app-selector.component.ts` | App dropdown | Select verification app |
| **LoginComponent** | `login/login.component.ts` | User login | OTP-based authentication |

---

**Document Version:** 1.0
**Last Updated:** 2026-01-26
**Maintained By:** MScan Development Team
