import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Coupon } from '../../models/rewards.model';
import { CouponCardComponent } from './coupon-card/coupon-card.component';

@Component({
  selector: 'app-coupon-print-preview',
  standalone: true,
  imports: [CommonModule, CouponCardComponent],
  templateUrl: './coupon-print-preview.component.html',
  styleUrls: ['./coupon-print-preview.component.css']
})
export class CouponPrintPreviewComponent implements OnInit {
  @Input() coupons: Coupon[] = [];
  @Input() show = false;
  @Output() onPrint = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  ngOnInit() {
    console.log('Print preview initialized with', this.coupons.length, 'coupons');
  }

  handlePrint() {
    // Get the coupons grid content
    const printContent = document.querySelector('.coupons-grid');
    if (!printContent) {
      console.error('Print content not found');
      return;
    }

    // Create a new window for printing
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) {
      console.error('Could not open print window');
      return;
    }

    // Write the content with styles
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Coupons</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              background: white;
            }

            /* Grid Layout */
            .coupons-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 0.25rem;
              padding: 0.5rem;
              width: 100%;
            }

            /* Coupon Card Wrapper */
            .coupon-card {
              width: 100%;
              padding: 0;
            }

            /* Inner card styles */
            .card-top {
              display: flex;
              flex-direction: column;
              align-items: center;
              border: 1px solid #0d4286;
              border-radius: 4px 4px 0 0;
              border-bottom: 0px;
              padding: 8px;
            }

            .card-bottom {
              display: flex;
              flex-direction: column;
              align-items: center;
              border: 1px solid #0d4286;
              border-radius: 0 0 4px 4px;
              border-top: 0px;
              padding: 8px;
            }

            .card-logo {
              width: 50%;
            }

            .card-type {
              color: #014589;
              font-weight: bold;
            }

            .card-banner {
              width: 100%;
              height: 30px;
              background-color: #0d4286;
              text-align: center;
              display: flex;
              align-items: center;
              justify-content: center;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .star-img {
              height: 50px;
              margin-left: -30px;
            }

            .amount {
              color: white;
              font-size: 12px;
              font-weight: bold;
              margin-left: -54px;
            }

            .product-chip {
              background-color: #0d4286;
              border-radius: 25px;
              padding: 4px 12px;
              color: white;
              margin-top: 4px;
              font-size: 12px;
              font-weight: bold;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .qr-code {
              margin-top: 8px;
              width: 50px;
            }

            .terms-and-condition {
              color: #014589;
              padding: 4px 16px;
              font-size: 8px;
              text-align: center;
            }

            .contact {
              color: #014589;
              font-weight: bold;
              font-size: 8px;
              display: flex;
              gap: 8px;
            }

            .contact span {
              align-items: center;
              justify-content: center;
              display: flex;
            }

            .contact span span {
              font-size: 12px;
              margin-right: 2px;
            }

            @media print {
              @page {
                size: A4 portrait;
                margin: 0.5rem;
              }

              body {
                margin: 0;
                padding: 0;
              }

              .coupons-grid {
                padding: 0;
                gap: 0.25rem;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();

      // Emit print event
      this.onPrint.emit();
    }, 250);
  }

  handleCancel() {
    this.onCancel.emit();
  }

  getDiscountDisplay(coupon: Coupon): string {
    return `₹${coupon.discount_value}`;
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return 'No expiry';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
