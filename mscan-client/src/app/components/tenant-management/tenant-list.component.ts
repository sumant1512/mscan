import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TenantService } from '../../services/tenant.service';
import { TenantsFacade } from '../../store/tenants';
import { Tenant } from '../../models/tenant-admin.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-tenant-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenant-list.component.html',
  styleUrls: ['./tenant-list.component.css'],
})
export class TenantListComponent implements OnInit {
  private tenantsFacade = inject(TenantsFacade);
  private tenantService = inject(TenantService);
  private router = inject(Router);

  // NgRx observables
  tenants$: Observable<Tenant[]> = this.tenantsFacade.filteredTenants$;
  loading$: Observable<boolean> = this.tenantsFacade.loading$;
  error$: Observable<string | null> = this.tenantsFacade.error$;
  filters$ = this.tenantsFacade.filters$;

  ngOnInit() {
    this.tenantsFacade.loadTenants();
  }

  onSearch(searchQuery: string) {
    this.tenantsFacade.setSearchQuery(searchQuery);
  }

  onStatusFilterChange(statusFilter: 'all' | 'active' | 'inactive') {
    this.tenantsFacade.setStatusFilter(statusFilter);
  }

  onSortByChange(sortBy: 'name' | 'created_at') {
    this.tenantsFacade.setSortBy(sortBy);
  }

  onSortOrderChange(sortOrder: 'asc' | 'desc') {
    this.tenantsFacade.setSortOrder(sortOrder);
  }

  toggleSortOrder() {
    this.tenantsFacade.toggleSortOrder();
  }

  resetFilters() {
    this.tenantsFacade.resetFilters();
  }

  viewTenant(id: string) {
    this.router.navigate(['/super-admin/tenants', id]);
  }

  editTenant(id: string) {
    this.router.navigate(['/super-admin/tenants', id, 'edit']);
  }

  createTenant() {
    this.router.navigate(['/super-admin/tenants/new']);
  }

  toggleStatus(tenant: Tenant) {
    if (
      confirm(
        `Are you sure you want to ${tenant.status === 'active' ? 'deactivate' : 'activate'} ${
          tenant.tenant_name
        }?`
      )
    ) {
      this.tenantService.toggleTenantStatus(tenant.id).subscribe({
        next: () => {
          // Reload tenants after status change
          this.tenantsFacade.loadTenants();
        },
        error: (err) => {
          console.error('Toggle status error:', err);
          alert(err.error?.error || err.message || 'Failed to update tenant status');
        },
      });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'suspended':
        return 'status-suspended';
      default:
        return '';
    }
  }
}
