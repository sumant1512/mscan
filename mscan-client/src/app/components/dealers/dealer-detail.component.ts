/**
 * Dealer Detail Component
 * View dealer information, points balance, and transaction history
 */
import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DealerService } from '../../services/dealer.service';
import { AuthService } from '../../services/auth.service';
import { DealerDetail, DealerPoints, DealerPointTransaction } from '../../models';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-dealer-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dealer-detail.component.html',
  styleUrls: ['./dealer-detail.component.css']
})
export class DealerDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private loadingService = inject(LoadingService);

  dealerId: string | null = null;
  dealer: DealerDetail | null = null;
  points: DealerPoints | null = null;
  transactions: DealerPointTransaction[] = [];

  loading$ = this.loadingService.loading$;
  loadingTransactions = false;
  error = '';

  // Transaction pagination
  txPage = 1;
  txLimit = 10;
  txTotalPages = 1;
  txTotal = 0;

  constructor(
    private dealerService: DealerService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['id']) {
          this.dealerId = params['id'];
          this.loadDealer();
          this.loadPoints();
          this.loadTransactions();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getTenantId(): string | null {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.tenant?.id || null;
  }

  loadDealer() {
    const tenantId = this.getTenantId();
    if (!tenantId || !this.dealerId) {
      this.error = 'No tenant context available';
      return;
    }

    this.dealerService.getDealer(tenantId, this.dealerId)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          if (response.status && response.data) {
            this.dealer = response.data;
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to load dealer');
          this.cdr.detectChanges();
        }
      });
  }

  loadPoints() {
    const tenantId = this.getTenantId();
    if (!tenantId || !this.dealerId) return;

    this.dealerService.getDealerPoints(tenantId, this.dealerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status && response.data) {
            this.points = response.data;
          }
          this.cdr.detectChanges();
        },
        error: () => {
          // Points load failure is non-critical
        }
      });
  }

  loadTransactions() {
    const tenantId = this.getTenantId();
    if (!tenantId || !this.dealerId) return;

    this.loadingTransactions = true;

    this.dealerService.getDealerTransactions(tenantId, this.dealerId, this.txPage, this.txLimit)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status && response.data) {
            this.transactions = response.data.transactions || [];
            this.txTotal = response.data.pagination.total;
            this.txTotalPages = response.data.pagination.pages;
          }
          this.loadingTransactions = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingTransactions = false;
          this.cdr.detectChanges();
        }
      });
  }

  editDealer() {
    if (this.dealerId) {
      this.router.navigate(['/tenant/dealers/edit', this.dealerId]);
    }
  }

  goBack() {
    this.router.navigate(['/tenant/dealers']);
  }

  // Transaction pagination
  txNextPage() {
    if (this.txPage < this.txTotalPages) {
      this.txPage++;
      this.loadTransactions();
    }
  }

  txPreviousPage() {
    if (this.txPage > 1) {
      this.txPage--;
      this.loadTransactions();
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  formatAmount(amount: number, type: string): string {
    return type === 'CREDIT' ? `+${amount}` : `-${amount}`;
  }
}
