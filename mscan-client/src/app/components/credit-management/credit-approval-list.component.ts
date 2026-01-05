import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CreditService } from '../../services/credit.service';
import { CreditRequest } from '../../models/rewards.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-credit-approval-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './credit-approval-list.component.html',
  styleUrls: ['./credit-approval-list.component.css']
})
export class CreditApprovalListComponent implements OnInit {
  requests: CreditRequest[] = [];
  loading = false;
  error = '';
  
  statusFilter: 'all' | 'pending' | 'approved' | 'rejected' = 'pending';
  
  selectedRequest?: CreditRequest;
  showRejectModal = false;
  rejectReason = '';
  processingId?: number;

  constructor(
    private creditService: CreditService, 
    private readonly cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    // Set initial filter based on route
    if (this.router.url.includes('/credits/history')) {
      this.statusFilter = 'all';
    } else {
      this.statusFilter = 'pending';
    }
    this.loadRequests();
  }

  loadRequests() {
    this.loading = true;
    this.error = '';
    
    this.creditService.getAllRequests(this.statusFilter)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.requests = response.requests;
        },
        error: (err) => {
          console.error('Load credit requests error:', err);
          this.error = err.error?.error || err.message || 'Failed to load credit requests';
        }
      });
  }

  onFilterChange() {
    this.loadRequests();
  }

  approveRequest(request: CreditRequest) {
    if (!confirm(`Approve credit request for ${request.requested_amount} credits to ${request.tenant_name}?`)) {
      return;
    }

    this.processingId = request.id;
    this.creditService.approveRequest(request.id).subscribe({
      next: () => {
        this.loadRequests();
        this.processingId = undefined;
      },
      error: (err) => {
        console.error('Approve request error:', err);
        alert(err.error?.error || err.message || 'Failed to approve request');
        this.processingId = undefined;
      }
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
      alert('Please provide a rejection reason');
      return;
    }

    this.processingId = this.selectedRequest.id;
    this.creditService.rejectRequest(this.selectedRequest.id, this.rejectReason).subscribe({
      next: () => {
        this.loadRequests();
        this.closeRejectModal();
        this.processingId = undefined;
      },
      error: (err) => {
        console.error('Reject request error:', err);
        alert(err.error?.error || err.message || 'Failed to reject request');
        this.processingId = undefined;
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
