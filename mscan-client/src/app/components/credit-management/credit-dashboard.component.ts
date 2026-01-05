import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CreditService } from '../../services/credit.service';
import { CreditBalance, CreditRequest } from '../../models/rewards.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-credit-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './credit-dashboard.component.html',
  styleUrls: ['./credit-dashboard.component.css']
})
export class CreditDashboardComponent implements OnInit {
  balance?: CreditBalance;
  recentRequests: CreditRequest[] = [];
  loading = false;
  error = '';

  constructor(
    private creditService: CreditService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.error = '';

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

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  }
}
