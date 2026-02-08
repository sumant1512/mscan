import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CreditRequest } from '../../models/rewards.model';
import { CreditService } from '../../services/credit.service';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
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
  loading = false;
  error: string | null = null;
  isSuperAdmin = false;

  // Filtering
  statusFilter: string = 'all';

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalRequests = 0;

  constructor(
    private readonly creditService: CreditService,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef
  ) {}

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

    if (this.isSuperAdmin) {
      // Super admin: get all requests with pagination
      this.creditService.getAllRequests(this.statusFilter, this.currentPage, this.pageSize)
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
    } else {
      // Tenant admin: get own requests (all statuses)
      this.creditService.getMyRequests()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.requests = response.requests || [];
            this.applyFilters();
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
  }

  applyFilters() {
    let filtered = [...this.requests];

    // Filter by status
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === this.statusFilter);
    }

    this.filteredRequests = filtered;
    this.totalRequests = filtered.length;
  }

  onStatusFilterChange() {
    if (this.isSuperAdmin) {
      // For super admin, reload from server with new status
      this.currentPage = 1;
      this.loadRequests();
    } else {
      // For tenant admin, filter client-side
      this.applyFilters();
    }
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
