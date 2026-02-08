import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreditTransaction, CreditRequest } from '../../models/rewards.model';
import { CreditService } from '../../services/credit.service';
import { AuthService } from '../../services/auth.service';
import { TenantService } from '../../services/tenant.service';
import { AppContextService } from '../../services/app-context.service';
import { Tenant } from '../../models/tenant-admin.model';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Display item for unified transaction/request view
interface TransactionDisplayItem {
  id: number;
  type: 'CREDIT' | 'DEBIT' | 'PENDING' | 'REJECTED';
  amount: number;
  balance_before?: number;
  balance_after?: number;
  description?: string;
  reference_type?: string;
  reference_id?: number;
  created_at: string;
  created_by_name?: string;
  // For rejected requests
  justification?: string;
  rejection_reason?: string;
  status?: string;
}

@Component({
  selector: 'app-credit-transaction-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './credit-transaction-history.component.html',
  styleUrls: ['./credit-transaction-history.component.css'],
})
export class CreditTransactionHistoryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Component state
  displayItems: TransactionDisplayItem[] = [];
  tenants: Tenant[] = [];
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
    private readonly tenantService: TenantService,
    private readonly appContextService: AppContextService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Check if user is super admin
    this.isSuperAdmin = this.authService.isSuperAdmin();

    // Load tenants only for super admin
    if (this.isSuperAdmin) {
      this.loadTenants();
    }

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

  loadTenants() {
    this.tenantService.getAllTenants()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.tenants = response.tenants || [];
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error loading tenants:', err);
        }
      });
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

    // Only super admin can filter by tenant
    if (this.isSuperAdmin && this.tenantFilter) {
      transactionParams.tenant_id = this.tenantFilter;
    }

    // Only add app_id filter if a specific app is selected
    if (selectedAppId !== null) {
      transactionParams.app_id = selectedAppId;
    }

    // Load ONLY transactions (not requests)
    // Transaction history should only show actual credit/debit transactions
    this.creditService.getTransactions(transactionParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Map transactions to display items
          this.displayItems = (response.transactions || []).map(t => ({
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
