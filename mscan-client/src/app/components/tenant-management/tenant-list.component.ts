import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { TenantService } from '../../services/tenant.service';
import { TenantsFacade } from '../../store/tenants';
import { Tenant } from '../../models/tenant-admin.model';
import { ConfirmationService } from '../../shared/services/confirmation.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-tenant-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenant-list.component.html',
  styleUrls: ['./tenant-list.component.css'],
})
export class TenantListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private tenantsFacade = inject(TenantsFacade);
  private tenantService = inject(TenantService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);

  // NgRx observables
  tenants$: Observable<Tenant[]> = this.tenantsFacade.filteredTenants$;
  loading$: Observable<boolean> = this.tenantsFacade.loading$;
  error$: Observable<string | null> = this.tenantsFacade.error$;
  filters$ = this.tenantsFacade.filters$;

  errorMessage = '';

  ngOnInit() {
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    const action = tenant.status === 'active' ? 'deactivate' : 'activate';
    this.confirmationService
      .confirm(
        `Are you sure you want to ${action} ${tenant.tenant_name}?`,
        `${action.charAt(0).toUpperCase() + action.slice(1)} Tenant`
      )
      .pipe(
        filter(confirmed => confirmed),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.errorMessage = '';
        this.tenantService.toggleTenantStatus(tenant.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              // Reload tenants after status change
              this.tenantsFacade.loadTenants();
            },
            error: (err) => {
              this.errorMessage = HttpErrorHandler.getMessage(err, 'Failed to update tenant status');
            },
          });
      });
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
