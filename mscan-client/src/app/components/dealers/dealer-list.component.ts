/**
 * Dealer List Component
 * Displays and manages dealers for tenant admin
 */
import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DealerService } from '../../services/dealer.service';
import { AuthService } from '../../services/auth.service';
import { Dealer } from '../../models';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-dealer-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dealer-list.component.html',
  styleUrls: ['./dealer-list.component.css']
})
export class DealerListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private loadingService = inject(LoadingService);

  dealers: Dealer[] = [];
  loading$ = this.loadingService.loading$;
  error = '';
  successMessage = '';
  searchQuery = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;
  totalDealers = 0;

  // Toggle status modal
  selectedDealer: Dealer | null = null;
  showToggleModal = false;

  constructor(
    private dealerService: DealerService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadDealers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDealers() {
    this.error = '';
    this.successMessage = '';

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.tenant?.id) {
      this.error = 'No tenant context available';
      return;
    }

    const filters = {
      search: this.searchQuery || undefined,
      page: this.currentPage,
      limit: this.itemsPerPage
    };

    this.dealerService.listDealers(currentUser.tenant.id, filters)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          if (response.status && response.data) {
            this.dealers = response.data.dealers || [];
            this.totalDealers = response.data.pagination.total;
            this.totalPages = response.data.pagination.pages;
            this.currentPage = response.data.pagination.page;
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to load dealers');
          this.dealers = [];
          this.cdr.detectChanges();
        }
      });
  }

  onSearch() {
    this.currentPage = 1;
    this.loadDealers();
  }

  createDealer() {
    this.router.navigate(['/tenant/dealers/create']);
  }

  editDealer(dealer: Dealer) {
    this.router.navigate(['/tenant/dealers/edit', dealer.id]);
  }

  viewDealer(dealer: Dealer) {
    this.router.navigate(['/tenant/dealers', dealer.id]);
  }

  confirmToggleStatus(dealer: Dealer) {
    this.selectedDealer = dealer;
    this.showToggleModal = true;
  }

  closeToggleModal() {
    this.selectedDealer = null;
    this.showToggleModal = false;
  }

  toggleStatus() {
    if (!this.selectedDealer) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.tenant?.id) {
      this.error = 'No tenant context available';
      return;
    }

    const newStatus = !this.selectedDealer.is_active;

    this.dealerService.toggleDealerStatus(currentUser.tenant.id, this.selectedDealer.id, newStatus)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          if (response.status) {
            this.successMessage = `Dealer "${this.selectedDealer?.shop_name}" ${newStatus ? 'activated' : 'deactivated'} successfully`;
            this.closeToggleModal();
            this.loadDealers();
          }
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to update dealer status');
          this.closeToggleModal();
          this.cdr.detectChanges();
        }
      });
  }

  // Pagination
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadDealers();
    }
  }

  nextPage() {
    this.goToPage(this.currentPage + 1);
  }

  previousPage() {
    this.goToPage(this.currentPage - 1);
  }

  getStatusBadgeClass(dealer: Dealer): string {
    return dealer.is_active ? 'status-badge active' : 'status-badge inactive';
  }

  getStatusText(dealer: Dealer): string {
    return dealer.is_active ? 'Active' : 'Inactive';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
