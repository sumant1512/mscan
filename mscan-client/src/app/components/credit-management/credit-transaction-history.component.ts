import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreditTransaction, CreditRequest } from '../../models/rewards.model';
import { CreditService } from '../../services/credit.service';
import { AuthService } from '../../services/auth.service';
import { AppContextService } from '../../services/app-context.service';
import { Tenant } from '../../models/tenant-admin.model';
import { TenantsFacade } from '../../store/tenants';
import { CreditCardComponent, CreditCardData } from '../shared/credit-card/credit-card.component';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Display item for unified transaction/request view
interface TransactionDisplayItem {
  id: number;
  type: 'CREDIT' | 'DEBIT' | 'PENDING' | 'REJECTED' | 'REFUND';
  amount: number;
  balance_before?: number;
  balance_after?: number;
  description?: string;
  reference_type?: string;
  reference_id?: number;
  created_at: string;
  created_by_name?: string;
  created_by_email?: string;
  processed_by_name?: string;
  // For rejected requests
  justification?: string;
  rejection_reason?: string;
  status?: string;
}

@Component({
  selector: 'app-credit-transaction-history',
  standalone: true,
  imports: [CommonModule, FormsModule, CreditCardComponent],
  templateUrl: './credit-transaction-history.component.html',
  styleUrls: ['./credit-transaction-history.component.css'],
})
export class CreditTransactionHistoryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Component state
  displayItems: TransactionDisplayItem[] = [];
  cardData: CreditCardData[] = [];
  tenants$!: Observable<Tenant[]>;
  loading = false;
  error: string | null = null;

  // Filtering
  tenantFilter: string = '';
  isSuperAdmin = false;

  // Pagination
  currentPage = 1;
  pageSize = 20;

  constructor(
    private readonly creditService: CreditService,
    private readonly authService: AuthService,
    private readonly tenantsFacade: TenantsFacade,
    private readonly appContextService: AppContextService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.tenants$ = this.tenantsFacade.allTenants$;
  }

  ngOnInit() {
    // Check if user is super admin
    this.isSuperAdmin = this.authService.isSuperAdmin();
    
    // Load transactions and pending requests
    this.loadData();

    // Reload transactions when app selection changes
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
    this.loading = true;
    this.error = null;

    // Get selected app ID
    const selectedAppId = this.appContextService.getSelectedAppId();

    const transactionParams: any = {
      page: this.currentPage,
      limit: this.pageSize
    };

    // Super admin can filter by tenant (pass tenant_id only if not empty/all)
    if (this.isSuperAdmin && this.tenantFilter && this.tenantFilter !== '') {
      transactionParams.tenant_id = this.tenantFilter;
    }

    // Only add app_id filter if a specific app is selected
    if (selectedAppId !== null) {
      transactionParams.app_id = selectedAppId;
    }

    // Load transactions using unified service method
    // Transaction history shows actual credit/debit transactions + rejected requests
    this.creditService.getTransactions(transactionParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const transactions = response.transactions || [];

          // Map transactions to display items (legacy support)
          this.displayItems = transactions.map(t => ({
            id: t.id,
            type: t.transaction_type,
            amount: t.amount,
            balance_before: t.balance_before,
            balance_after: t.balance_after,
            description: t.description,
            reference_type: t.reference_type,
            reference_id: t.reference_id,
            created_at: t.created_at,
            created_by_name: t.created_by_name
          }));

          // Convert to CreditCardData format
          this.cardData = transactions.map(t => ({
            id: t.id,
            type: t.transaction_type as any,
            amount: t.amount,
            balance_before: t.balance_before,
            balance_after: t.balance_after,
            description: t.description,
            reference_type: t.reference_type,
            reference_id: t.reference_id,
            created_at: t.created_at,
            created_by_name: t.created_by_name,
            justification: (t as any).justification,
            rejection_reason: (t as any).rejection_reason,
            tenant_name: (t as any).tenant_name
          }));

          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err.error?.error || 'Failed to load data';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  onTenantFilterChange() {
    this.currentPage = 1; // Reset to first page
    this.loadData();
  }

  getTransactionTypeClass(type: string): string {
    if (type === 'PENDING') return 'type-pending';
    if (type === 'REJECTED') return 'type-rejected';
    return type === 'CREDIT' ? 'type-credit' : 'type-debit';
  }

  formatCurrency(amount: number): string {
    return amount.toFixed(2);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }
}
