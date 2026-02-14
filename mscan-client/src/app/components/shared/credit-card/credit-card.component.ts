import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CreditCardData {
  id: string | number;
  type: 'CREDIT' | 'DEBIT' | 'PENDING' | 'REJECTED' | 'APPROVED' | 'REFUND';
  amount: number;
  created_at: string;
  requested_at?: string;
  balance_before?: number;
  balance_after?: number;
  description?: string;
  justification?: string;
  rejection_reason?: string;
  reference_type?: string;
  reference_id?: string | number;
  created_by_name?: string;
  requested_by_name?: string;
  requested_by_email?: string;
  tenant_name?: string;
  processed_by_name?: string;
  created_by_email?: string;
}

@Component({
  selector: 'app-credit-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './credit-card.component.html',
  styleUrls: ['./credit-card.component.css']
})
export class CreditCardComponent {
  @Input() data!: CreditCardData;
  @Input() showTenantInfo: boolean = false;

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('en-US');
  }

  getTransactionTypeClass(): string {
    switch (this.data.type) {
      case 'CREDIT':
      case 'APPROVED':
      case 'REFUND':
        return 'type-credit';
      case 'DEBIT':
        return 'type-debit';
      case 'PENDING':
        return 'type-pending';
      case 'REJECTED':
        return 'type-rejected';
      default:
        return '';
    }
  }

  getAmountClass(): string {
    switch (this.data.type) {
      case 'CREDIT':
      case 'APPROVED':
      case 'REFUND':
        return 'approved-amount';
      case 'PENDING':
        return 'pending-amount';
      case 'DEBIT':
      case 'REJECTED':
        return 'rejected-amount';
      default:
        return '';
    }
  }

  getStatusClass(): string {
    switch (this.data.type) {
      case 'CREDIT':
      case 'APPROVED':
      case 'REFUND':
        return 'approved-status';
      case 'PENDING':
        return 'pending-status';
      case 'REJECTED':
        return 'rejected-status';
      default:
        return '';
    }
  }

  getAmountLabel(): string {
    if (this.data.type === 'PENDING' || this.data.type === 'REJECTED') {
      return 'Requested Amount';
    }
    return 'Amount';
  }

  getDescriptionLabel(): string {
    if (this.data.type === 'PENDING' || this.data.type === 'REJECTED') {
      return 'Justification:';
    }
    return 'Description:';
  }

  getStatusText(): string {
    switch (this.data.type) {
      case 'APPROVED':
        return 'Approved';
      case 'PENDING':
        return 'Awaiting Approval';
      case 'REJECTED':
        return 'Rejected';
      case 'REFUND':
        return 'Refunded';
      default:
        return this.data.type;
    }
  }

  shouldShowBalanceInfo(): boolean {
    return this.data.type === 'CREDIT' || this.data.type === 'DEBIT';
  }

  shouldShowStatusInfo(): boolean {
    return this.data.type === 'PENDING' || this.data.type === 'APPROVED';
  }

  shouldShowRejectionReason(): boolean {
    return this.data.type === 'REJECTED' && !!this.data.rejection_reason;
  }

  getDescription(): string {
    return this.data.justification || this.data.description || '';
  }
}
