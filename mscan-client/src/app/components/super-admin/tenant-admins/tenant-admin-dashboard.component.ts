/**
 * Tenant Admin Dashboard Component
 * Super Admin view of all tenants with their Tenant Admin counts
 */
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TenantsFacade } from '../../../store/tenants';
import { Tenant } from '../../../models/tenant-admin.model';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-tenant-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenant-admin-dashboard.component.html',
  styleUrls: ['./tenant-admin-dashboard.component.css'],
})
export class TenantAdminDashboardComponent implements OnInit {
  private router = inject(Router);
  tenantsFacade = inject(TenantsFacade); // Make public for template access

  // NgRx observables
  tenants$: Observable<Tenant[]> = this.tenantsFacade.filteredTenants$;
  loading$: Observable<boolean> = this.tenantsFacade.loading$;
  error$: Observable<string | null> = this.tenantsFacade.error$;
  stats$ = this.tenantsFacade.stats$;
  filters$ = this.tenantsFacade.filters$;

  // Specific filtered views
  tenantsWithoutAdmins$: Observable<Tenant[]> =
    this.tenantsFacade.filteredTenants$.pipe(
      map((tenants) => tenants.filter((t) => !t.tenant_admin_count || t.tenant_admin_count === 0))
    );

  tenantsWithAdmins$: Observable<Tenant[]> = this.tenantsFacade.filteredTenants$.pipe(
    map((tenants) => tenants.filter((t) => t.tenant_admin_count && t.tenant_admin_count > 0))
  );

  ngOnInit() {
  }

  onSearchChange(searchTerm: string) {
    this.tenantsFacade.setSearchQuery(searchTerm);
  }

  onFilterChange(filterType: 'all' | 'withAdmins' | 'withoutAdmins') {
    // Update which observable we use based on filter
    if (filterType === 'withAdmins') {
      this.tenants$ = this.tenantsWithAdmins$;
    } else if (filterType === 'withoutAdmins') {
      this.tenants$ = this.tenantsWithoutAdmins$;
    } else {
      this.tenants$ = this.tenantsFacade.filteredTenants$;
    }
  }

  navigateToAddAdmin(tenant?: Tenant) {
    if (tenant) {
      this.router.navigate(['/super-admin/tenant-admins/add'], {
        queryParams: { tenantId: tenant.id, tenantName: tenant.tenant_name },
      });
    } else {
      this.router.navigate(['/super-admin/tenant-admins/add']);
    }
  }

  viewTenantAdmins(tenantId: string) {
    this.router.navigate(['/super-admin/tenant-admins/tenant', tenantId]);
  }

  viewTenantDashboard(tenantId: string) {
    this.router.navigate(['/super-admin/tenants', tenantId]);
  }

  getTenantAdminCount(tenant: Tenant): number {
    return tenant.tenant_admin_count || 0;
  }

  hasNoAdmins(tenant: Tenant): boolean {
    return this.getTenantAdminCount(tenant) === 0;
  }

  getSubdomainUrl(tenant: Tenant): string {
    const protocol = window.location.protocol;
    const baseDomain = window.location.hostname.includes('localhost')
      ? 'localhost:4200'
      : window.location.hostname.replace(/^[^.]+\./, '');
    return `${protocol}//${tenant.subdomain_slug}.${baseDomain}`;
  }
}
