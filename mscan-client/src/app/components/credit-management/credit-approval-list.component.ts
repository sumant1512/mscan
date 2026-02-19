import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CreditRequest } from '../../models/rewards.model';
import { TenantsFacade } from '../../store/tenants';
import { CreditRequestsFacade } from '../../store/credit-requests';
import { Tenant } from '../../models/tenant-admin.model';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { StatusDisplayPipe } from '../../shared/pipes/status-display.pipe';
import { ConfirmationService } from '../../shared/services/confirmation.service';

@Component({
  selector: 'app-credit-approval-list',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusDisplayPipe],
  templateUrl: './credit-approval-list.component.html',
  styleUrls: ['./credit-approval-list.component.css']
})
export class CreditApprovalListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Observable streams
  pendingRequests$: Observable<CreditRequest[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  tenants$: Observable<Tenant[]>;

  tenantFilter: string = 'all';

  selectedRequest?: CreditRequest;
  showRejectModal = false;
  rejectReason = '';
  processingId?: string;

  constructor(
    private readonly creditRequestsFacade: CreditRequestsFacade,
    private readonly tenantsFacade: TenantsFacade,
    private readonly cdr: ChangeDetectorRef,
    private readonly confirmationService: ConfirmationService,
    private router: Router
  ) {
    // Initialize observables
    this.loading$ = this.creditRequestsFacade.loading$;
    this.error$ = this.creditRequestsFacade.error$;
    this.tenants$ = this.tenantsFacade.allTenants$;
    this.pendingRequests$ = this.creditRequestsFacade.pendingRequests$;
  }

  ngOnInit() {
    // Load data
    this.loadPendingRequests();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPendingRequests() {
    // Pass tenant_id to API if not 'all'
    const tenantId = this.tenantFilter !== 'all' ? this.tenantFilter : undefined;
    this.creditRequestsFacade.loadPendingRequests(tenantId);
  }

  onTenantFilterChange() {
    this.loadPendingRequests();
  }

  approveRequest(request: CreditRequest) {
    this.confirmationService
      .confirmApprove(`credit request for ${request.requested_amount} credits to ${request.tenant_name}`)
      .pipe(filter(confirmed => confirmed))
      .subscribe(() => {
        this.processingId = request.id;
        this.creditRequestsFacade.approveRequest(request.id);

        // Reset processing after a delay
        setTimeout(() => {
          this.processingId = undefined;
          this.cdr.detectChanges();
        }, 1000);
      });
  }

  openRejectModal(request: CreditRequest) {
    this.selectedRequest = request;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal() {
    this.showRejectModal = false;
    this.selectedRequest = undefined;
    this.rejectReason = '';
  }

  confirmReject() {
    if (!this.selectedRequest || !this.rejectReason.trim()) {
      this.confirmationService.alertError('Please provide a rejection reason').subscribe();
      return;
    }

    this.processingId = this.selectedRequest.id;
    this.creditRequestsFacade.rejectRequest(this.selectedRequest.id, this.rejectReason);
    this.closeRejectModal();

    // Reset processing after a delay
    setTimeout(() => {
      this.processingId = undefined;
      this.cdr.detectChanges();
    }, 1000);
  }
}
