import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CreditService } from '../../services/credit.service';
import { AuthService } from '../../services/auth.service';
import { AppContextService } from '../../services/app-context.service';
import { CreditBalance, CreditRequest } from '../../models/rewards.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';
import { LoadingService } from '../../shared/services/loading.service';

@Component({
  selector: 'app-credit-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './credit-dashboard.component.html',
  styleUrls: ['./credit-dashboard.component.css']
})
export class CreditDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private loadingService = inject(LoadingService);

  balance?: CreditBalance;
  recentRequests: CreditRequest[] = [];
  loading$ = this.loadingService.loading$;
  isSuperAdmin = false;
  errorMessage = '';

  constructor(
    private creditService: CreditService,
    private authService: AuthService,
    private appContextService: AppContextService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Check if user is super admin
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.loadData();

    // Note: Credit balance is tenant-wide and NOT filtered by app
    // But we reload on app change to show consistency with other pages
    this.appContextService.appContext$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadData();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    if (this.isSuperAdmin) {
      // Super Admin: Load all pending requests (no balance endpoint for super admin)
      this.creditService.getRequests({ status: 'pending', page: 1, limit: 5 })
        .pipe(
          this.loadingService.wrapLoading(),
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: (response) => {
            this.recentRequests = response.requests.slice(0, 5);
            this.errorMessage = '';
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.errorMessage = HttpErrorHandler.getMessage(err, 'Failed to load pending requests');
          }
        });
    } else {
      // Tenant Admin: Load balance and own requests
      // Load balance
      this.creditService.getBalance()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (balance) => {
            this.balance = balance;
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.errorMessage = HttpErrorHandler.getMessage(err, 'Failed to load credit balance');
          }
        });

      // Load recent requests (all statuses)
      this.creditService.getRequests({ status: 'all', page: 1, limit: 5 })
        .pipe(
          this.loadingService.wrapLoading(),
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: (response) => {
            this.recentRequests = response.requests.slice(0, 5);
            this.errorMessage = '';
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.errorMessage = HttpErrorHandler.getMessage(err, 'Failed to load recent requests');
          }
        });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  }
}
