import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CreditRequest } from '../../models/rewards.model';
import { TenantsFacade } from '../../store/tenants';
import { CreditRequestsFacade } from '../../store/credit-requests';
import { Tenant } from '../../models/tenant-admin.model';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-credit-approval-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  private tenantFilterSubject = new BehaviorSubject<string>('all');
  
  selectedRequest?: CreditRequest;
  showRejectModal = false;
  rejectReason = '';
  processingId?: number;

  constructor(
    private readonly creditRequestsFacade: CreditRequestsFacade,
    private readonly tenantsFacade: TenantsFacade,
    private readonly cdr: ChangeDetectorRef,
    private router: Router
  ) {
    // Initialize observables
    this.loading$ = this.creditRequestsFacade.loading$;
    this.error$ = this.creditRequestsFacade.error$;
    this.tenants$ = this.tenantsFacade.allTenants$;
    
    // Setup filtering via facade selector
    this.pendingRequests$ = this.tenantFilterSubject.pipe(
      switchMap(tenantId => this.creditRequestsFacade.getPendingRequestsByTenant(tenantId))
    );
  }

  ngOnInit() {
    // Load data
    this.tenantsFacade.loadTenants();
    this.creditRequestsFacade.loadPendingRequests();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTenantFilterChange() {
    this.tenantFilterSubject.next(this.tenantFilter);
  }

  approveRequest(request: CreditRequest) {
    if (!confirm(`Approve credit request for ${request.requested_amount} credits to ${request.tenant_name}?`)) {
      return;
    }

    this.processingId = request.id;
    this.creditRequestsFacade.approveRequest(request.id);
    
    // Reset processing after a delay
    setTimeout(() => {
      this.processingId = undefined;
      this.cdr.detectChanges();
    }, 1000);
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
      alert('Please provide a rejection reason');
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

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  }
}
