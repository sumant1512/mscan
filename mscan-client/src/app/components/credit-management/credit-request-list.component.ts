import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CreditRequest } from '../../models/rewards.model';
import { CreditService } from '../../services/credit.service';
import { AuthService } from '../../services/auth.service';
import { Tenant } from '../../models/tenant-admin.model';
import { TenantsFacade } from '../../store/tenants';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-credit-request-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './credit-request-list.component.html',
  styleUrls: ['./credit-request-list.component.css']
})
export class CreditRequestListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  requests: CreditRequest[] = [];
  filteredRequests: CreditRequest[] = [];
  tenants$!: Observable<Tenant[]>;
  loading = false;
  error: string | null = null;
  isSuperAdmin = false;

  // Filtering
  statusFilter: string = 'all';
  tenantFilter: string = '';

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalRequests = 0;

  constructor(
    private readonly creditService: CreditService,
    private readonly authService: AuthService,
    private readonly tenantsFacade: TenantsFacade,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.tenants$ = this.tenantsFacade.allTenants$;
  }

  ngOnInit() {
    this.isSuperAdmin = this.authService.isSuperAdmin();

    this.loadRequests();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRequests() {
    this.loading = true;
    this.error = null;

    const params: any = {
      status: this.statusFilter,
      page: this.currentPage,
      limit: this.pageSize
    };

    // Super admin can filter by tenant
    if (this.isSuperAdmin && this.tenantFilter && this.tenantFilter !== '') {
      params.tenant_id = this.tenantFilter;
    }

    // Use unified getRequests method for both super admin and tenant admin
    // Tenant isolation is handled automatically by backend
    this.creditService.getRequests(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.requests = response.requests || [];
          this.filteredRequests = this.requests;
          this.totalRequests = response.pagination?.total || 0;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err.error?.error || 'Failed to load requests';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters() {
    // No longer needed - filtering done server-side
    // Kept for backward compatibility but now just triggers reload
    this.loadRequests();
  }

  onStatusFilterChange() {
    // For both super admin and tenant admin, reload from server with new status
    this.currentPage = 1;
    this.loadRequests();
  }

  onTenantFilterChange() {
    // Reset to first page when tenant filter changes
    this.currentPage = 1;
    this.loadRequests();
  }

  onPageChange(newPage: number) {
    this.currentPage = newPage;
    this.loadRequests();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  get totalPages(): number {
    return Math.ceil(this.totalRequests / this.pageSize);
  }

  get hasNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  get hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  hasAnyRejectionReasons(): boolean {
    return this.filteredRequests.some(r => r.rejection_reason);
  }
}
