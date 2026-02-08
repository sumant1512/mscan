import { Component, OnInit, ChangeDetectorRef, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { RewardsService } from '../../services/rewards.service';
import { Coupon } from '../../models/rewards.model';
import { finalize } from 'rxjs/operators';
import { AppContextService } from '../../services/app-context.service';
import { VerificationAppsFacade } from '../../store/verification-apps';
import { AuthService } from '../../services/auth.service';
@Component({
  selector: 'app-coupon-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coupon-list.component.html',
  styleUrls: ['./coupon-list.component.css']
})
export class CouponListComponent implements OnInit, OnDestroy {
  subscription = new Subscription();
  verificationAppsFacade = inject(VerificationAppsFacade);
  coupons: Coupon[] = [];
  verificationApps: any[] = [];
  loading = false;
  loadingMore = false;
  error = '';

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

  // Deactivation form
  deactivation = {
    from_reference: '',
    to_reference: '',
    deactivation_reason: ''
  };

  // Permission flags
  canCreateCoupon = false;
  canEditCoupon = false;
  canDeleteCoupon = false;
  canViewCoupons = false;

  private appContextSubscription?: Subscription;

  constructor(
    private rewardsService: RewardsService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private appContextService: AppContextService,
    private authService: AuthService,
  ) {
    // Initialize permission flags
    this.canCreateCoupon = this.authService.hasPermission('create_coupon');
    this.canEditCoupon = this.authService.hasPermission('edit_coupon');
    this.canDeleteCoupon = this.authService.hasPermission('delete_coupon');
    this.canViewCoupons = this.authService.hasPermission('view_coupons');
    console.log('Permission Flags:', {
      canCreateCoupon: this.canCreateCoupon,
      canEditCoupon: this.canEditCoupon,
      canDeleteCoupon: this.canDeleteCoupon,
      canViewCoupons: this.canViewCoupons
    });
  }

  ngOnInit() {
    this.loadVerificationApps();
    this.loadCoupons();

    // Reload coupons when app selection changes
    this.appContextSubscription = this.appContextService.appContext$.subscribe(() => {
      this.loadCoupons();
    });
  }

  ngOnDestroy() {
    this.appContextSubscription?.unsubscribe();
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

    if (atBottom && !this.loadingMore && this.hasMore && !this.loading) {
      this.loadMoreCoupons();
    }
  }

  loadVerificationApps() {
    this.subscription.add(
      this.verificationAppsFacade.allApps$.subscribe(apps => {
        this.verificationApps = apps;
      })
    )
  }

  loadCoupons() {
    this.loading = true;
    this.error = '';
    this.currentPage = 1;
    this.hasMore = true;

    const params: any = { page: this.currentPage, limit: 20 };
    if (this.statusFilter !== 'all') params.status = this.statusFilter;

    // Use app context service instead of appFilter
    const selectedAppId = this.appContextService.getSelectedAppId();
    if (selectedAppId !== null) {
      params.verification_app_id = selectedAppId;
    }

    if (this.searchQuery) params.search = this.searchQuery;

    this.rewardsService.getCoupons(params)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.coupons = response.coupons;
          this.hasMore = response.pagination?.hasMore || false;
        },
        error: (err) => {
          console.error('Load coupons error:', err);
          this.error = err.error?.error || err.message || 'Failed to load coupons';
        }
      });
  }

  loadMoreCoupons() {
    if (!this.hasMore || this.loadingMore) return;

    this.loadingMore = true;
    this.currentPage++;

    const params: any = { page: this.currentPage, limit: 20 };
    if (this.statusFilter !== 'all') params.status = this.statusFilter;

    // Use app context service instead of appFilter
    const selectedAppId = this.appContextService.getSelectedAppId();
    if (selectedAppId !== null) {
      params.verification_app_id = selectedAppId;
    }

    if (this.searchQuery) params.search = this.searchQuery;

    this.rewardsService.getCoupons(params)
      .pipe(finalize(() => {
        this.loadingMore = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.coupons = [...this.coupons, ...response.coupons];
          this.hasMore = response.pagination?.hasMore || false;
        },
        error: (err) => {
          console.error('Load more coupons error:', err);
          this.error = err.error?.error || err.message || 'Failed to load more coupons';
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
    if (confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} this coupon?`)) {
      this.rewardsService.updateCouponStatus(coupon.id, newStatus).subscribe({
        next: () => {
          this.loadCoupons();
        },
        error: (err) => {
          console.error('Update coupon status error:', err);
          alert(err.error?.error || err.message || 'Failed to update coupon status');
        }
      });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'draft': return 'status-draft';
      case 'printed': return 'status-printed';
      case 'active': return 'status-active';
      case 'used': return 'status-used';
      case 'inactive': return 'status-inactive';
      case 'expired': return 'status-expired';
      case 'exhausted': return 'status-exhausted';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'draft': return '📝';
      case 'printed': return '🖨️';
      case 'active': return '✅';
      case 'used': return '✓';
      case 'inactive': return '🚫';
      case 'expired': return '⏰';
      case 'exhausted': return '🏁';
      default: return '';
    }
  }

  getDiscountDisplay(coupon: Coupon): string {
    // Only FIXED_AMOUNT is supported now
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
      alert('Coupon code copied to clipboard!');
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
  }

  closeRangeActivationModal() {
    this.showRangeActivationModal = false;
  }

  activateRange() {
    if (!this.rangeActivation.from_reference || !this.rangeActivation.to_reference) {
      alert('Please enter both from and to coupon references');
      return;
    }

    this.loading = true;
    this.rewardsService.activateCouponRange(this.rangeActivation)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          alert(`Success! ${response.activated_count} coupons activated. ${response.skipped_count > 0 ? response.skipped_count + ' skipped.' : ''}`);
          this.closeRangeActivationModal();
          this.loadCoupons();
        },
        error: (err) => {
          console.error('Activate range error:', err);
          alert(err.error?.error || err.message || 'Failed to activate coupon range');
        }
      });
  }

  markAsPrinted(coupon: Coupon) {
    let confirmMessage = 'Mark this coupon as printed?';

    // Check if already printed
    if (coupon.printed_at && coupon.printed_count && coupon.printed_count > 0) {
      confirmMessage = `This coupon has already been printed ${coupon.printed_count} time(s).\n\nLast printed: ${new Date(coupon.printed_at).toLocaleString()}\n\nDo you want to mark it as printed again?`;
    }

    if (confirm(confirmMessage)) {
      this.loading = true;
      this.rewardsService.markCouponAsPrinted(coupon.id)
        .pipe(finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }))
        .subscribe({
          next: (response) => {
            const printCount = response.coupon?.printed_count || 1;
            alert(`Coupon marked as printed (${printCount} time${printCount > 1 ? 's' : ''} total)`);
            this.loadCoupons();
          },
          error: (err) => {
            console.error('Mark as printed error:', err);
            alert(err.error?.error || err.message || 'Failed to mark coupon as printed');
          }
        });
    }
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
      alert('Please select coupons to print');
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
        alert(`The selected coupons are already marked as printed.\n\nTo activate them, use the "Activate Selected" button or "Activate Range" feature.`);
      } else {
        alert('Please select draft coupons to mark as printed');
      }
      return;
    }

    if (selectedPrintedCoupons.length > 0) {
      const message = `${selectedDraftCoupons.length} draft coupon(s) will be shown in print preview.\n\n${selectedPrintedCoupons.length} already printed coupon(s) will be skipped.`;
      alert(message);
    }

    // Navigate to print page with selected draft coupons
    this.router.navigate(['/tenant/coupons/print'], {
      state: { coupons: selectedDraftCoupons }
    });
  }

  bulkActivate() {
    if (this.selectedCouponIds.size === 0) {
      alert('Please select coupons to activate');
      return;
    }

    const selectedPrintedCoupons = this.coupons.filter(
      c => this.selectedCouponIds.has(c.id) && c.status === 'printed'
    );

    if (selectedPrintedCoupons.length === 0) {
      alert('Please select printed coupons to activate');
      return;
    }

    if (confirm(`Activate ${selectedPrintedCoupons.length} coupon(s)?`)) {
      this.loading = true;
      const couponIds = selectedPrintedCoupons.map(c => c.id);

      this.rewardsService.bulkActivateCoupons(couponIds, 'Bulk activation from selection')
        .pipe(finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }))
        .subscribe({
          next: (response) => {
            let message = `Success! ${response.activated_count} coupon(s) activated`;
            if (response.skipped_count > 0) {
              message += `. ${response.skipped_count} skipped (already active or invalid status)`;
            }
            alert(message);
            this.clearSelection();
            this.loadCoupons();
          },
          error: (err) => {
            console.error('Bulk activate error:', err);
            alert(err.error?.error || err.message || 'Failed to activate coupons');
          }
        });
    }
  }

  // Deactivation methods
  openDeactivationModal() {
    this.showDeactivationModal = true;
    this.deactivation = {
      from_reference: '',
      to_reference: '',
      deactivation_reason: ''
    };
  }

  closeDeactivationModal() {
    this.showDeactivationModal = false;
  }

  deactivateRange() {
    if (!this.deactivation.from_reference || !this.deactivation.to_reference) {
      alert('Please enter both from and to coupon references');
      return;
    }

    if (!this.deactivation.deactivation_reason.trim()) {
      alert('Please provide a reason for deactivation');
      return;
    }

    if (!confirm('Are you sure you want to deactivate these coupons? This action cannot be undone.')) {
      return;
    }

    this.loading = true;
    this.rewardsService.deactivateCouponRange(this.deactivation)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          alert(`Success! ${response.deactivated_count} coupon(s) deactivated`);
          this.closeDeactivationModal();
          this.loadCoupons();
        },
        error: (err) => {
          console.error('Deactivate range error:', err);
          alert(err.error?.error || err.message || 'Failed to deactivate coupon range');
        }
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
    // Debounced preview count - in production, you'd add debouncing
    // For now, just estimate based on reference pattern (CP-###)
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
}
