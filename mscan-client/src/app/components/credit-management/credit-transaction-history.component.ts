import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreditService } from '../../services/credit.service';
import { CreditTransaction } from '../../models/rewards.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-credit-transaction-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './credit-transaction-history.component.html',
  styleUrls: ['./credit-transaction-history.component.css']
})
export class CreditTransactionHistoryComponent implements OnInit {
  transactions: CreditTransaction[] = [];
  loading = false;
  error = '';
  
  typeFilter: 'all' | 'CREDIT' | 'DEBIT' = 'all';
  currentPage = 1;
  hasMore = true;
  loadingMore = false;

  constructor(
    private creditService: CreditService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadTransactions();
  }

  loadTransactions() {
    this.loading = true;
    this.error = '';
    this.currentPage = 1;
    this.hasMore = true;
    
    const params: any = { page: this.currentPage, limit: 20 };
    if (this.typeFilter !== 'all') params.type = this.typeFilter;
    
    this.creditService.getTransactions(params)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.transactions = response.transactions;
          this.hasMore = response.transactions.length === 20;
        },
        error: (err) => {
          console.error('Load transactions error:', err);
          this.error = err.error?.error || err.message || 'Failed to load transactions';
        }
      });
  }

  onFilterChange() {
    this.loadTransactions();
  }

  onScroll(event: any) {
    const element = event.target;
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    
    if (atBottom && !this.loadingMore && this.hasMore && !this.loading) {
      this.loadMoreTransactions();
    }
  }

  loadMoreTransactions() {
    if (!this.hasMore || this.loadingMore) return;
    
    this.loadingMore = true;
    this.currentPage++;
    
    const params: any = { page: this.currentPage, limit: 20 };
    if (this.typeFilter !== 'all') params.type = this.typeFilter;
    
    this.creditService.getTransactions(params)
      .pipe(finalize(() => {
        this.loadingMore = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.transactions = [...this.transactions, ...response.transactions];
          this.hasMore = response.transactions.length === 20;
        },
        error: (err) => {
          console.error('Load more transactions error:', err);
          this.error = err.error?.error || err.message || 'Failed to load more transactions';
        }
      });
  }

  getTransactionTypeClass(type: string): string {
    return type === 'CREDIT' ? 'transaction-credit' : 'transaction-debit';
  }

  getTransactionIcon(type: string): string {
    return type === 'CREDIT' ? '📥' : '📤';
  }

  getTransactionSign(type: string): string {
    return type === 'CREDIT' ? '+' : '-';
  }
}
