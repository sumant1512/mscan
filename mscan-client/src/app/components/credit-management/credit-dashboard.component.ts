import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CreditService } from '../../services/credit.service';
import { AuthService } from '../../services/auth.service';
import { AppContextService } from '../../services/app-context.service';
import { CreditBalance, CreditRequest } from '../../models/rewards.model';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-credit-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './credit-dashboard.component.html',
  styleUrls: ['./credit-dashboard.component.css']
})
export class CreditDashboardComponent implements OnInit, OnDestroy {
  balance?: CreditBalance;
  recentRequests: CreditRequest[] = [];
  loading = false;
  error = '';
  isSuperAdmin = false;
  private appContextSubscription?: Subscription;

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
    this.appContextSubscription = this.appContextService.appContext$.subscribe(() => {
      this.loadData();
    });
  }

  ngOnDestroy() {
    this.appContextSubscription?.unsubscribe();
  }

  loadData() {
    this.loading = true;
    this.error = '';

    if (this.isSuperAdmin) {
      // Super Admin: Load all requests (no balance endpoint for super admin)
      this.creditService.getAllRequests('pending', 1, 5)
        .pipe(finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }))
        .subscribe({
          next: (response) => {
            this.recentRequests = response.requests.slice(0, 5);
          },
          error: (err) => {
            console.error('Load requests error:', err);
            this.error = err.error?.error || err.message || 'Failed to load requests';
          }
        });
    } else {
      // Tenant Admin: Load balance and own requests
      // Load balance
      this.creditService.getBalance().subscribe({
        next: (balance) => {
          this.balance = balance;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Load balance error:', err);
          this.error = err.error?.error || err.message || 'Failed to load credit data';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });

      // Load recent requests
      this.creditService.getMyRequests()
        .pipe(finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }))
        .subscribe({
          next: (response) => {
            this.recentRequests = response.requests.slice(0, 5);
          },
          error: (err) => {
            console.error('Load requests error:', err);
            this.error = err.error?.error || err.message || 'Failed to load requests';
          }
        });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  }
}
