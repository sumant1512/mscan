import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CustomerRegistrationComponent } from './components/customer-registration/customer-registration.component';
import { authGuard, superAdminGuard } from './guards/auth.guard';
import { subdomainGuard } from './guards/subdomain.guard';

// Tenant Management
import { TenantListComponent } from './components/tenant-management/tenant-list.component';
import { TenantFormComponent } from './components/tenant-management/tenant-form.component';
import { TenantDetailComponent } from './components/tenant-management/tenant-detail.component';

// Credit Management
import { CreditRequestFormComponent } from './components/credit-management/credit-request-form.component';
import { CreditApprovalListComponent } from './components/credit-management/credit-approval-list.component';
import { CreditDashboardComponent } from './components/credit-management/credit-dashboard.component';
import { CreditTransactionHistoryComponent } from './components/credit-management/credit-transaction-history.component';

// Rewards
import { CouponCreateComponent } from './components/rewards/coupon-create.component';
import { CouponListComponent } from './components/rewards/coupon-list.component';

// Products
import { ProductListComponent } from './components/products/product-list.component';
import { ProductFormComponent } from './components/products/product-form.component';

// Categories
import { CategoryListComponent } from './components/categories/category-list.component';
import { CategoryFormComponent } from './components/categories/category-form.component';

// Verification App
import { VerificationAppListComponent } from './components/verification-app/verification-app-list.component';
import { VerificationAppConfigureComponent } from './components/verification-app/verification-app-configure.component';

// Scans
import { ScanHistoryComponent } from './components/scans/scan-history.component';
import { ScanAnalyticsComponent } from './components/scans/scan-analytics.component';

// Profile
import { ProfileComponent } from './components/profile/profile.component';

// Settings
import { SettingsComponent } from './components/settings/settings.component';

// New Features - Batch Workflow & Analytics
import { CategoryManagementComponent } from './components/category-management/category-management.component';
import { BatchWizardComponent } from './components/batch-wizard/batch-wizard.component';
import { TenantAnalyticsComponent } from './components/tenant-analytics/tenant-analytics.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  
  // Super Admin Routes
  { 
    path: 'super-admin',
    canActivate: [authGuard, superAdminGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'tenants', component: TenantListComponent },
      { path: 'tenants/new', component: TenantFormComponent },
      { path: 'tenants/:id', component: TenantDetailComponent },
      { path: 'tenants/:id/edit', component: TenantFormComponent },
      { path: 'credits/pending', component: CreditApprovalListComponent },
      { path: 'credits/history', component: CreditApprovalListComponent },
      { path: 'customers', component: CustomerRegistrationComponent },
      { path: 'settings', component: SettingsComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  
  // Tenant Routes (subdomain protected)
  {
    path: 'tenant',
    canActivate: [authGuard, subdomainGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'credits', component: CreditDashboardComponent },
      { path: 'credits/balance', component: CreditDashboardComponent },
      { path: 'credits/request', component: CreditRequestFormComponent },
      { path: 'credits/history', component: CreditTransactionHistoryComponent },
      { path: 'verification-app', component: VerificationAppListComponent },
      { path: 'verification-app/configure', component: VerificationAppConfigureComponent },
      { path: 'verification-app/configure/:id', component: VerificationAppConfigureComponent },
      { path: 'coupons', component: CouponListComponent },
      { path: 'coupons/create', component: CouponCreateComponent },
      { path: 'products', component: ProductListComponent },
      { path: 'products/create', component: ProductFormComponent },
      { path: 'products/edit/:id', component: ProductFormComponent },        { path: 'categories', component: CategoryListComponent },
        { path: 'categories/create', component: CategoryFormComponent },
        { path: 'categories/edit/:id', component: CategoryFormComponent },      { path: 'scans/history', component: ScanHistoryComponent },
      { path: 'scans/analytics', component: ScanAnalyticsComponent },
      // New: Category Management
      { path: 'categories', component: CategoryManagementComponent },
      // New: Batch Creation Wizard (7-step workflow)
      { path: 'batches/create', component: BatchWizardComponent },
      // New: Analytics Dashboard
      { path: 'analytics', component: TenantAnalyticsComponent },
      { path: 'profile', component: ProfileComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  
  { path: 'unauthorized', component: LoginComponent }, // Redirect to login for unauthorized access
  { path: '**', redirectTo: '/login' }
];
