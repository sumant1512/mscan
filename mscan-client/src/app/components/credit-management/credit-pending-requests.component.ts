import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CreditService } from '../../services/credit.service';
import { AuthService } from '../../services/auth.service';
import { CreditRequest } from '../../models/rewards.model';
import { CreditCardComponent, CreditCardData } from '../shared/credit-card/credit-card.component';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-credit-pending-requests',
  standalone: true,
  imports: [CommonModule, RouterLink, CreditCardComponent],
  templateUrl: './credit-pending-requests.component.html',
  styleUrls: ['./credit-pending-requests.component.css']
})
export class CreditPendingRequestsComponent implements OnInit {
  private loadingService = inject(LoadingService);

  pendingRequests: CreditRequest[] = [];
  cardData: CreditCardData[] = [];
  loading$ = this.loadingService.loading$;
  error = '';
  count = 0;

  constructor(
    private creditService: CreditService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Only tenant admins can access this component
    if (this.authService.isSuperAdmin()) {
      this.error = 'This page is only accessible to tenant administrators.';
      return;
    }

    this.loadPendingRequests();
  }

  loadPendingRequests() {
    this.error = '';

    // Use unified getRequests method with status='pending'
    this.creditService.getRequests({ status: 'pending', page: 1, limit: 100 })
      .pipe(this.loadingService.wrapLoading())
      .subscribe({
        next: (response) => {
          this.pendingRequests = response.requests || [];
          this.count = this.pendingRequests.length;

          // Convert to CreditCardData format
          this.cardData = this.pendingRequests.map(request => ({
            id: request.id,
            type: 'PENDING' as const,
            amount: request.requested_amount,
            created_at: request.created_at || request.requested_at,
            requested_at: request.requested_at,
            justification: request.justification,
            requested_by_name: request.requested_by_name,
            requested_by_email: request.requested_by_email,
            tenant_name: request.tenant_name
          }));

          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to load pending requests');
          this.cdr.detectChanges();
        }
      });
  }

  refresh() {
    this.loadPendingRequests();
  }
}
