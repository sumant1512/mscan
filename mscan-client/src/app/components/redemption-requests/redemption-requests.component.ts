import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  RedemptionService,
  RedemptionRequest,
  RedemptionSummaryApp
} from '../../services/redemption.service';

@Component({
  selector: 'app-redemption-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './redemption-requests.component.html',
  styleUrls: ['./redemption-requests.component.css']
})
export class RedemptionRequestsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private redemptionService = inject(RedemptionService);

  // State
  requests = signal<RedemptionRequest[]>([]);
  summaryApps = signal<RedemptionSummaryApp[]>([]);
  total = signal<number>(0);
  loading = signal<boolean>(false);
  error = signal<string>('');
  processingId = signal<string>('');

  // Filters
  filterAppId = '';
  filterStatus = '';

  // Pagination
  page = signal<number>(1);
  readonly limit = 20;

  get totalPages(): number { return Math.ceil(this.total() / this.limit); }
  get pages(): number[] {
    return Array.from({ length: Math.min(this.totalPages, 7) }, (_, i) => i + 1);
  }

  // Reject modal
  showRejectModal = false;
  selectedRequest: RedemptionRequest | null = null;
  rejectReason = '';
  rejectError = '';

  ngOnInit(): void {
    this.loadSummary();
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSummary(): void {
    this.redemptionService.getSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const data = res.data || res;
          this.summaryApps.set(data.apps || []);
        },
        error: () => {}
      });
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.redemptionService.listRequests({
      app_id: this.filterAppId || undefined,
      status: this.filterStatus || undefined,
      page: this.page(),
      limit: this.limit
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res: any) => {
        const data = res.data || res;
        this.requests.set(data.requests || []);
        this.total.set(data.pagination?.total || 0);
        this.loading.set(false);
      },
      error: (err: any) => {
        const msg = err?.error?.message || 'Failed to load redemption requests.';
        this.error.set(msg);
        this.loading.set(false);
      }
    });
  }

  applyFilter(): void {
    this.page.set(1);
    this.load();
  }

  clearFilter(): void {
    this.filterAppId = '';
    this.filterStatus = '';
    this.page.set(1);
    this.load();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page.set(p);
    this.load();
  }

  approve(request: RedemptionRequest): void {
    if (!confirm(`Approve redemption of ${request.points_requested} points for ${request.customer.name || request.customer.phone}?`)) return;

    this.processingId.set(request.id);
    this.redemptionService.approveRequest(request.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.processingId.set('');
          this.loadSummary();
          this.load();
        },
        error: (err: any) => {
          const msg = err?.error?.message || 'Failed to approve request.';
          this.error.set(msg);
          this.processingId.set('');
        }
      });
  }

  openRejectModal(request: RedemptionRequest): void {
    this.selectedRequest = request;
    this.rejectReason = '';
    this.rejectError = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedRequest = null;
    this.rejectReason = '';
    this.rejectError = '';
  }

  confirmReject(): void {
    if (!this.selectedRequest) return;
    this.rejectError = '';

    this.processingId.set(this.selectedRequest.id);
    const id = this.selectedRequest.id;
    const reason = this.rejectReason.trim() || undefined;

    this.redemptionService.rejectRequest(id, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.processingId.set('');
          this.closeRejectModal();
          this.loadSummary();
          this.load();
        },
        error: (err: any) => {
          const msg = err?.error?.message || 'Failed to reject request.';
          this.rejectError = msg;
          this.processingId.set('');
        }
      });
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected'
    };
    return labels[status] || status;
  }

  pendingCount(): number {
    return this.summaryApps().reduce((sum, a) => sum + (a.pending || 0), 0);
  }

  approvedCount(): number {
    return this.summaryApps().reduce((sum, a) => sum + (a.approved || 0), 0);
  }

  rejectedCount(): number {
    return this.summaryApps().reduce((sum, a) => sum + (a.rejected || 0), 0);
  }
}
