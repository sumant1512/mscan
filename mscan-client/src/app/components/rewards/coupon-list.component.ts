import { Component, OnInit, ChangeDetectorRef, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { RewardsService } from '../../services/rewards.service';
import { Coupon } from '../../models/rewards.model';
import { AppContextService } from '../../services/app-context.service';
import { VerificationAppsFacade } from '../../store/verification-apps';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../shared/services/loading.service';
import { ConfirmationService } from '../../shared/services/confirmation.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-coupon-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coupon-list.component.html',
  styleUrls: ['./coupon-list.component.css']
})
export class CouponListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  verificationAppsFacade = inject(VerificationAppsFacade);
  coupons: Coupon[] = [];
  verificationApps: any[] = [];
  private loadingService = inject(LoadingService);

  loading$ = this.loadingService.loading$;
  loadingMore = false;
  error = '';
  successMessage = '';

  statusFilter: 'all' | 'draft' | 'printed' | 'active' | 'used' | 'inactive' | 'expired' = 'all';
  searchQuery = '';

  currentPage = 1;
  hasMore = true;

  selectedCoupon?: Coupon;
  showQRModal = false;
  showRangeActivationModal = false;
  showDeactivationModal = false;

  // Bulk selection
  selectedCouponIds: Set<string> = new Set();
  selectAll = false;

  // Expanded state
  expandedCoupons: Set<string> = new Set();

  // Range activation form
  rangeActivation = {
    from_reference: '',
    to_reference: '',
    status_filter: 'printed',
    activation_note: ''
  };
  rangePreviewCount = 0;
  loadingPreview = false;
  rangeActivationError = '';

  // Deactivation form
  deactivation = {
    from_reference: '',
    to_reference: '',
    deactivation_reason: ''
  };
  deactivationError = '';

  // Permission flags
  canCreateCoupon = false;
  canEditCoupon = false;
  canDeleteCoupon = false;
  canViewCoupons = false;

  constructor(
    private rewardsService: RewardsService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private appContextService: AppContextService,
    private authService: AuthService,
    private confirmationService: ConfirmationService
  ) {
    // Initialize permission flags
    this.canCreateCoupon = this.authService.hasPermission('create_coupon');
    this.canEditCoupon = this.authService.hasPermission('edit_coupon');
    this.canDeleteCoupon = this.authService.hasPermission('delete_coupon');
    this.canViewCoupons = this.authService.hasPermission('view_coupons');
  }

  ngOnInit() {
    this.loadVerificationApps();
    this.loadCoupons();

    // Reload coupons when app selection changes
    this.appContextService.appContext$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadCoupons();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleCoupon(couponId: string) {
    if (this.expandedCoupons.has(couponId)) {
      this.expandedCoupons.delete(couponId);
    } else {
      this.expandedCoupons.add(couponId);
    }
  }

  isCouponExpanded(couponId: string): boolean {
    return this.expandedCoupons.has(couponId);
  }

  onScroll(event: any) {
    const element = event.target;
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;

    if (atBottom && !this.loadingMore && this.hasMore) {
      this.loadMoreCoupons();
    }
  }

  loadVerificationApps() {
    this.verificationAppsFacade.allApps$
      .pipe(takeUntil(this.destroy$))
      .subscribe(apps => {
        this.verificationApps = apps;
      });
  }

  loadCoupons() {
    this.error = '';
    this.successMessage = '';
    this.currentPage = 1;
    this.hasMore = true;

    const params: any = { page: this.currentPage, limit: 20 };
    if (this.statusFilter !== 'all') params.status = this.statusFilter;

    const selectedAppId = this.appContextService.getSelectedAppId();
    if (selectedAppId !== null) {
      params.verification_app_id = selectedAppId;
    }

    if (this.searchQuery) params.search = this.searchQuery;

    this.rewardsService.getCoupons(params)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.coupons = response?.data?.coupons || [];
          this.hasMore = response?.data?.pagination?.hasMore || false;
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to load coupons');
        }
      });
  }

  loadMoreCoupons() {
    if (!this.hasMore || this.loadingMore) return;

    this.loadingMore = true;
    this.currentPage++;

    const params: any = { page: this.currentPage, limit: 20 };
    if (this.statusFilter !== 'all') params.status = this.statusFilter;

    const selectedAppId = this.appContextService.getSelectedAppId();
    if (selectedAppId !== null) {
      params.verification_app_id = selectedAppId;
    }

    if (this.searchQuery) params.search = this.searchQuery;

    this.rewardsService.getCoupons(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.coupons = [...this.coupons, ...response?.data?.coupons || []];
          this.hasMore = response?.data?.pagination?.hasMore || false;
          this.loadingMore = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to load more coupons');
          this.loadingMore = false;
        }
      });
  }

  onFilterChange() {
    this.loadCoupons();
  }

  onSearch() {
    this.loadCoupons();
  }

  createCoupon() {
    this.router.navigate(['/tenant/coupons/create']);
  }

  showQRCode(coupon: Coupon) {
    this.selectedCoupon = coupon;
    this.showQRModal = true;
  }

  closeQRModal() {
    this.showQRModal = false;
    this.selectedCoupon = undefined;
  }

  toggleStatus(coupon: Coupon) {
    const newStatus = coupon.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';

    this.confirmationService
      .confirmToggle(action, `coupon ${coupon.coupon_code}`)
      .pipe(
        filter(confirmed => confirmed),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.rewardsService.updateCouponStatus(coupon.id, newStatus)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.successMessage = `Coupon ${action}d successfully`;
              this.loadCoupons();
            },
            error: (err) => {
              this.error = HttpErrorHandler.getMessage(err, 'Failed to update coupon status');
            }
          });
      });
  }

  getDiscountDisplay(coupon: Coupon): string {
    return `₹${coupon.discount_value} OFF`;
  }

  downloadQR() {
    if (this.selectedCoupon?.qr_code_url) {
      window.open(this.selectedCoupon.qr_code_url, '_blank');
    }
  }

  copyCode() {
    if (this.selectedCoupon) {
      navigator.clipboard.writeText(this.selectedCoupon.coupon_code);
      this.successMessage = 'Coupon code copied to clipboard!';
      setTimeout(() => this.successMessage = '', 3000);
    }
  }

  // Range activation methods
  openRangeActivationModal() {
    this.showRangeActivationModal = true;
    this.rangeActivation = {
      from_reference: '',
      to_reference: '',
      status_filter: 'printed',
      activation_note: ''
    };
    this.rangeActivationError = '';
  }

  closeRangeActivationModal() {
    this.showRangeActivationModal = false;
    this.rangeActivationError = '';
  }

  activateRange() {
    this.rangeActivationError = '';

    if (!this.rangeActivation.from_reference || !this.rangeActivation.to_reference) {
      this.rangeActivationError = 'Please enter both from and to coupon references';
      return;
    }

    this.rewardsService.activateCouponRange(this.rangeActivation)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          const message = `${response.activated_count} coupon(s) activated${response.skipped_count > 0 ? `, ${response.skipped_count} skipped` : ''}`;
          this.successMessage = message;
          this.closeRangeActivationModal();
          this.loadCoupons();
        },
        error: (err) => {
          this.rangeActivationError = HttpErrorHandler.getMessage(err, 'Failed to activate coupon range');
        }
      });
  }

  markAsPrinted(coupon: Coupon) {
    let confirmMessage = 'Mark this coupon as printed?';

    if (coupon.printed_at && coupon.printed_count && coupon.printed_count > 0) {
      confirmMessage = `This coupon has already been printed ${coupon.printed_count} time(s). Last printed: ${new Date(coupon.printed_at).toLocaleString()}. Mark as printed again?`;
    }

    this.confirmationService
      .confirm(confirmMessage, 'Mark as Printed')
      .pipe(
        filter(confirmed => confirmed),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.rewardsService.markCouponAsPrinted(coupon.id)
          .pipe(
            this.loadingService.wrapLoading(),
            takeUntil(this.destroy$)
          )
          .subscribe({
            next: (response) => {
              const printCount = response.coupon?.printed_count || 1;
              this.successMessage = `Coupon marked as printed (${printCount} time${printCount > 1 ? 's' : ''} total)`;
              this.loadCoupons();
            },
            error: (err) => {
              this.error = HttpErrorHandler.getMessage(err, 'Failed to mark coupon as printed');
            }
          });
      });
  }

  // Bulk selection methods
  toggleSelectAll() {
    this.selectAll = !this.selectAll;
    if (this.selectAll) {
      this.coupons.forEach(c => this.selectedCouponIds.add(c.id));
    } else {
      this.selectedCouponIds.clear();
    }
    this.cdr.detectChanges();
  }

  toggleCouponSelection(couponId: string) {
    if (this.selectedCouponIds.has(couponId)) {
      this.selectedCouponIds.delete(couponId);
    } else {
      this.selectedCouponIds.add(couponId);
    }
    this.selectAll = this.selectedCouponIds.size === this.coupons.length;
    this.cdr.detectChanges();
  }

  isCouponSelected(couponId: string): boolean {
    return this.selectedCouponIds.has(couponId);
  }

  getSelectedCount(): number {
    return this.selectedCouponIds.size;
  }

  clearSelection() {
    this.selectedCouponIds.clear();
    this.selectAll = false;
    this.cdr.detectChanges();
  }

  // Bulk operations
  bulkPrint() {
    if (this.selectedCouponIds.size === 0) {
      this.error = 'Please select coupons to print';
      return;
    }

    const selectedDraftCoupons = this.coupons.filter(
      c => this.selectedCouponIds.has(c.id) && c.status === 'draft'
    );

    const selectedPrintedCoupons = this.coupons.filter(
      c => this.selectedCouponIds.has(c.id) && c.status === 'printed'
    );

    if (selectedDraftCoupons.length === 0) {
      if (selectedPrintedCoupons.length > 0) {
        this.error = 'The selected coupons are already marked as printed. To activate them, use the "Activate Selected" button or "Activate Range" feature.';
      } else {
        this.error = 'Please select draft coupons to mark as printed';
      }
      return;
    }

    if (selectedPrintedCoupons.length > 0) {
      this.successMessage = `${selectedDraftCoupons.length} draft coupon(s) will be shown in print preview. ${selectedPrintedCoupons.length} already printed coupon(s) will be skipped.`;
    }

    // Navigate to print page with selected draft coupons
    this.router.navigate(['/tenant/coupons/print'], {
      state: { coupons: selectedDraftCoupons }
    });
  }

  bulkActivate() {
    if (this.selectedCouponIds.size === 0) {
      this.error = 'Please select coupons to activate';
      return;
    }

    const selectedPrintedCoupons = this.coupons.filter(
      c => this.selectedCouponIds.has(c.id) && c.status === 'printed'
    );

    if (selectedPrintedCoupons.length === 0) {
      this.error = 'Please select printed coupons to activate';
      return;
    }

    this.confirmationService
      .confirm(`Activate ${selectedPrintedCoupons.length} coupon(s)?`, 'Bulk Activation')
      .pipe(
        filter(confirmed => confirmed),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        const couponIds = selectedPrintedCoupons.map(c => c.id);

        this.rewardsService.bulkActivateCoupons(couponIds, 'Bulk activation from selection')
          .pipe(
            this.loadingService.wrapLoading(),
            takeUntil(this.destroy$)
          )
          .subscribe({
            next: (response) => {
              let message = `${response.activated_count} coupon(s) activated`;
              if (response.skipped_count > 0) {
                message += `, ${response.skipped_count} skipped (already active or invalid status)`;
              }
              this.successMessage = message;
              this.clearSelection();
              this.loadCoupons();
            },
            error: (err) => {
              this.error = HttpErrorHandler.getMessage(err, 'Failed to activate coupons');
            }
          });
      });
  }

  // Deactivation methods
  openDeactivationModal() {
    this.showDeactivationModal = true;
    this.deactivation = {
      from_reference: '',
      to_reference: '',
      deactivation_reason: ''
    };
    this.deactivationError = '';
  }

  closeDeactivationModal() {
    this.showDeactivationModal = false;
    this.deactivationError = '';
  }

  deactivateRange() {
    this.deactivationError = '';

    if (!this.deactivation.from_reference || !this.deactivation.to_reference) {
      this.deactivationError = 'Please enter both from and to coupon references';
      return;
    }

    if (!this.deactivation.deactivation_reason.trim()) {
      this.deactivationError = 'Please provide a reason for deactivation';
      return;
    }

    this.confirmationService
      .confirm('Are you sure you want to deactivate these coupons? This action cannot be undone.', 'Deactivate Range')
      .pipe(
        filter(confirmed => confirmed),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.rewardsService.deactivateCouponRange(this.deactivation)
          .pipe(
            this.loadingService.wrapLoading(),
            takeUntil(this.destroy$)
          )
          .subscribe({
            next: (response) => {
              this.successMessage = `${response.deactivated_count} coupon(s) deactivated`;
              this.closeDeactivationModal();
              this.loadCoupons();
            },
            error: (err) => {
              this.deactivationError = HttpErrorHandler.getMessage(err, 'Failed to deactivate coupon range');
            }
          });
      });
  }

  // Preview count for range activation
  onRangeInputChange() {
    if (this.rangeActivation.from_reference && this.rangeActivation.to_reference) {
      this.loadPreviewCount();
    } else {
      this.rangePreviewCount = 0;
    }
  }

  private loadPreviewCount() {
    // Estimate based on reference pattern (CP-###)
    const fromMatch = this.rangeActivation.from_reference.match(/(\d+)$/);
    const toMatch = this.rangeActivation.to_reference.match(/(\d+)$/);

    if (fromMatch && toMatch) {
      const fromNum = parseInt(fromMatch[1]);
      const toNum = parseInt(toMatch[1]);
      if (fromNum <= toNum) {
        this.rangePreviewCount = toNum - fromNum + 1;
      } else {
        this.rangePreviewCount = 0;
      }
    } else {
      this.rangePreviewCount = 0;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'draft':
        return 'status-draft';
      case 'printed':
        return 'status-printed';
      case 'active':
        return 'status-active';
      case 'used':
        return 'status-used';
      case 'expired':
        return 'status-expired';
      case 'exhausted':
        return 'status-exhausted';
      case 'inactive':
        return 'status-inactive';
      default:
        return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'draft':
        return '📝';
      case 'printed':
        return '🖨️';
      case 'active':
        return '✅';
      case 'used':
        return '☑️';
      case 'expired':
        return '⏱️';
      case 'exhausted':
        return '❌';
      case 'inactive':
        return '🚫';
      default:
        return '';
    }
  }
}
