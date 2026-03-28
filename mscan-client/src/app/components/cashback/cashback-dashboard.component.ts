import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CashbackService, CashbackTransaction } from '../../services/cashback.service';
import { LoadingService } from '../../shared/services/loading.service';

@Component({
  selector: 'app-cashback-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cashback-dashboard.component.html',
  styleUrls: ['./cashback-dashboard.component.css']
})
export class CashbackDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private cashbackService = inject(CashbackService);
  private loadingService = inject(LoadingService);

  loading$ = this.loadingService.loading$;

  transactions = signal<CashbackTransaction[]>([]);
  total = signal<number>(0);
  error = signal<string>('');

  // Pagination
  page = signal<number>(1);
  limit = 15;

  get totalPages(): number { return Math.ceil(this.total() / this.limit); }
  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // Filter form
  filterForm: FormGroup = this.fb.group({
    status: [''],
    from: [''],
    to: ['']
  });

  // Summary stats derived from loaded data
  get completedCount(): number { return this.transactions().filter(t => t.status === 'COMPLETED').length; }
  get failedCount(): number { return this.transactions().filter(t => t.status === 'FAILED').length; }
  get processingCount(): number { return this.transactions().filter(t => t.status === 'PROCESSING').length; }
  get totalAmount(): number {
    return this.transactions()
      .filter(t => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.error.set('');
    const { status, from, to } = this.filterForm.value;

    this.cashbackService.getTransactions({
      page: this.page(),
      limit: this.limit,
      status: status || undefined,
      from: from || undefined,
      to: to || undefined
    })
    .pipe(this.loadingService.wrapLoading(), takeUntil(this.destroy$))
    .subscribe({
      next: (res: any) => {
        const data = res.data || res;
        this.transactions.set(data.transactions || []);
        this.total.set(data.total || 0);
      },
      error: (err: any) => {
        const msg = err?.error?.message || 'Failed to load cashback transactions.';
        this.error.set(msg);
      }
    });
  }

  applyFilter(): void {
    this.page.set(1);
    this.load();
  }

  clearFilter(): void {
    this.filterForm.reset({ status: '', from: '', to: '' });
    this.page.set(1);
    this.load();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page.set(p);
    this.load();
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      PROCESSING: 'Processing',
      COMPLETED: 'Completed',
      FAILED: 'Failed',
      REVERSED: 'Reversed'
    };
    return labels[status] || status;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}
