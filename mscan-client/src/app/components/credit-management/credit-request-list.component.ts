import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
import { StatusDisplayPipe } from '../../shared/pipes/status-display.pipe';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';
import { LoadingService } from '../../shared/services/loading.service';

@Component({
  selector: 'app-credit-request-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusDisplayPipe],
  templateUrl: './credit-request-list.component.html',
  styleUrls: ['./credit-request-list.component.css']
})
export class CreditRequestListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  requests: CreditRequest[] = [];
  filteredRequests: CreditRequest[] = [];
  tenants$!: Observable<Tenant[]>;
  private loadingService = inject(LoadingService);

  loading$ = this.loadingService.loading$;
  isSuperAdmin = false;
  errorMessage = '';

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
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.requests = response.requests || [];
          this.filteredRequests = this.requests;
          this.totalRequests = response.pagination?.total || 0;
          this.errorMessage = '';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage = HttpErrorHandler.getMessage(err, 'Failed to load credit requests');
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
