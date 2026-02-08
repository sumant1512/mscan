import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { CouponCardComponent } from './coupon-card/coupon-card.component';
import { RewardsService } from '../../services/rewards.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-coupon-print-page',
  standalone: true,
  imports: [CommonModule, CouponCardComponent],
  templateUrl: './coupon-print-page.component.html',
  styleUrls: ['./coupon-print-page.component.css']
})
export class CouponPrintPageComponent implements OnInit {
  coupons: any[] = [];
  loading = false;
  hasPrinted = false;

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

    this.loading = true;
    this.rewardsService.bulkMarkAsPrinted(couponIds)
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: (response) => {
          this.hasPrinted = true;
          alert(`Success! ${response.printed_count} coupon(s) marked as printed`);
          this.goBack();
        },
        error: (err) => {
          console.error('Bulk print error:', err);
          alert(err.error?.error || err.message || 'Failed to mark coupons as printed');
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
