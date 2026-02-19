import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CouponCardComponent } from './coupon-card/coupon-card.component';
import { RewardsService } from '../../services/rewards.service';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-coupon-print-page',
  standalone: true,
  imports: [CommonModule, CouponCardComponent],
  templateUrl: './coupon-print-page.component.html',
  styleUrls: ['./coupon-print-page.component.css']
})
export class CouponPrintPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  coupons: any[] = [];
  private loadingService = inject(LoadingService);

  loading$ = this.loadingService.loading$;
  hasPrinted = false;
  successMessage = '';
  error = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private rewardsService: RewardsService
  ) {}

  ngOnInit() {
    // Get coupons from navigation state
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || history.state;

    if (state && state['coupons']) {
      this.coupons = state['coupons'];
    } else {
      // No coupons provided, go back to list
      this.router.navigate(['/tenant/coupons']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  handlePrint() {
    // Open browser print dialog
    window.print();

    // Mark as printed after a delay
    if (!this.hasPrinted) {
      setTimeout(() => {
        this.markAsPrinted();
      }, 1000);
    }
  }

  markAsPrinted() {
    const couponIds = this.coupons.map(c => c.id);

    this.error = '';
    this.successMessage = '';

    this.rewardsService.bulkMarkAsPrinted(couponIds)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.hasPrinted = true;
          this.successMessage = `Success! ${response.printed_count} coupon(s) marked as printed`;
          setTimeout(() => this.goBack(), 2000);
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to mark coupons as printed');
        }
      });
  }

  goBack() {
    this.router.navigate(['/tenant/coupons']);
  }

  getDiscountDisplay(coupon: any): string {
    return `₹${Math.floor(coupon.discount_value)}`;
  }
}
