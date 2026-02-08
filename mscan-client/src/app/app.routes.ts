import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CustomerRegistrationComponent } from './components/customer-registration/customer-registration.component';
import { authGuard, superAdminGuard } from './guards/auth.guard';
import { subdomainGuard } from './guards/subdomain.guard';
import { PermissionGuard } from './guards/permission.guard';
import { userContextGuard } from './guards/user-context.guard';

// Tenant Management
import { TenantListComponent } from './components/tenant-management/tenant-list.component';
import { TenantFormComponent } from './components/tenant-management/tenant-form.component';
import { TenantDetailComponent } from './components/tenant-management/tenant-detail.component';

// Credit Management
import { CreditRequestFormComponent } from './components/credit-management/credit-request-form.component';
import { CreditApprovalListComponent } from './components/credit-management/credit-approval-list.component';
import { CreditDashboardComponent } from './components/credit-management/credit-dashboard.component';
import { CreditTransactionHistoryComponent } from './components/credit-management/credit-transaction-history.component';
import { CreditRequestListComponent } from './components/credit-management/credit-request-list.component';

// Rewards
import { CouponCreateComponent } from './components/rewards/coupon-create.component';
import { CouponListComponent } from './components/rewards/coupon-list.component';
import { CouponPrintPageComponent } from './components/rewards/coupon-print-page.component';

// Products
import { ProductListComponent } from './components/products/product-list.component';
import { ProductFormComponent } from './components/products/product-form.component';
import { TemplateProductFormComponent } from './components/products/template-product-form.component';

// Templates
import { TemplateListComponent } from './components/templates/template-list.component';
import { TemplateFormComponent } from './components/templates/template-form.component';
import { TemplateDetailComponent } from './components/templates/template-detail.component';

// Tags
import { TagListComponent } from './components/tags/tag-list.component';
import { TagFormComponent } from './components/tags/tag-form.component';

// Verification App
import { VerificationAppListComponent } from './components/verification-app/verification-app-list.component';
import { VerificationAppConfigureComponent } from './components/verification-app/verification-app-configure.component';
import { ApiConfigurationComponent } from './components/verification-app/api-configuration.component';

// Scans
import { ScanHistoryComponent } from './components/scans/scan-history.component';

// Profile
import { ProfileComponent } from './components/profile/profile.component';

// Settings
import { SettingsComponent } from './components/settings/settings.component';

// New Features - Batch Workflow
import { BatchWizardComponent } from './components/batch-wizard/batch-wizard.component';

// Tenant User Management
import { TenantUsersListComponent } from './components/tenant-users/tenant-users-list.component';
import { TenantUserFormComponent } from './components/tenant-users/tenant-user-form.component';
import { UserPermissionsComponent } from './components/tenant-users/user-permissions.component';

// Tenant Admin Management (Super Admin)
import { TenantAdminDashboardComponent } from './components/super-admin/tenant-admins/tenant-admin-dashboard.component';
import { AddTenantAdminComponent } from './components/super-admin/tenant-admins/add-tenant-admin.component';
import { TenantAdminDetailComponent } from './components/super-admin/tenant-admins/tenant-admin-detail.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  
  // Super Admin Routes
  {
    path: 'super-admin',
    canActivate: [authGuard, userContextGuard, superAdminGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'tenants', component: TenantListComponent },
      { path: 'tenants/new', component: TenantFormComponent },
      { path: 'tenants/:id', component: TenantDetailComponent },
      { path: 'tenants/:id/edit', component: TenantFormComponent },
      { path: 'tenant-admins', component: TenantAdminDashboardComponent },
      { path: 'tenant-admins/add', component: AddTenantAdminComponent },
      { path: 'tenant-admins/tenant/:tenantId', component: TenantAdminDetailComponent },
      { path: 'credits/pending', component: CreditApprovalListComponent },
      { path: 'credits/requests', component: CreditRequestListComponent },
      { path: 'credits/history', component: CreditTransactionHistoryComponent },
      { path: 'customers', component: CustomerRegistrationComponent },
      { path: 'settings', component: SettingsComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  
  // Tenant Routes (subdomain protected)
  {
    path: 'tenant',
    canActivate: [authGuard, subdomainGuard, userContextGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'credits', component: CreditDashboardComponent },
      { path: 'credits/balance', component: CreditDashboardComponent },
      {
        path: 'credits/request',
        component: CreditRequestFormComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'request_credits' }
      },
      { path: 'credits/requests', component: CreditRequestListComponent },
      { path: 'credits/history', component: CreditTransactionHistoryComponent },
      { path: 'verification-app', component: VerificationAppListComponent },
      {
        path: 'verification-app/configure',
        component: VerificationAppConfigureComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'create_app' }
      },
      {
        path: 'verification-app/configure/:id',
        component: VerificationAppConfigureComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'edit_app' }
      },
      {
        path: 'verification-app/:id/api-config',
        component: ApiConfigurationComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'edit_app' }
      },
      { path: 'coupons', component: CouponListComponent },
      {
        path: 'coupons/create',
        component: CouponCreateComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'create_coupon' }
      },
      { path: 'coupons/print', component: CouponPrintPageComponent },
      { path: 'products', component: ProductListComponent },
      {
        path: 'products/create',
        component: TemplateProductFormComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'create_product' }
      },
      {
        path: 'products/edit/:id',
        component: TemplateProductFormComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'edit_product' }
      },
      { path: 'templates', component: TemplateListComponent },
      {
        path: 'templates/create',
        component: TemplateFormComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'create_template' }
      },
      { path: 'templates/:id', component: TemplateDetailComponent },
      {
        path: 'templates/:id/edit',
        component: TemplateFormComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'edit_template' }
      },
      // Tags
      { path: 'tags', component: TagListComponent },
      {
        path: 'tags/create',
        component: TagFormComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'create_product' }
      },
      {
        path: 'tags/:id/edit',
        component: TagFormComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'edit_product' }
      },
      { path: 'scans/history', component: ScanHistoryComponent },
      // New: Batch Creation Wizard (7-step workflow)
      {
        path: 'batches/create',
        component: BatchWizardComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'create_batch' }
      },
      // Tenant User Management
      { path: 'users', component: TenantUsersListComponent },
      {
        path: 'users/create',
        component: TenantUserFormComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'create_tenant_user' }
      },
      {
        path: 'users/edit/:id',
        component: TenantUserFormComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'edit_tenant_user' }
      },
      {
        path: 'users/:id/permissions',
        component: UserPermissionsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'assign_permissions' }
      },
      { path: 'profile', component: ProfileComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  
  { path: 'unauthorized', component: LoginComponent }, // Redirect to login for unauthorized access
  { path: '**', redirectTo: '/login' }
];
