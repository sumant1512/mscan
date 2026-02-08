import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-coupon-card',
  imports: [CommonModule],
  templateUrl: './coupon-card.component.html',
  styleUrl: './coupon-card.component.css',
})
export class CouponCardComponent {
  /** Main numeric amount (e.g. 100) */
  @Input() amount: number | string = 100;

  /** Top small title (company / logo alt text) */
  @Input() brandLogo: string = "https://palspaint.com/logo/header_logo.webp";

  /** Bucket text / descriptor under starburst */
  @Input() productName: string | undefined;

  /** QR image source (data url or asset path) */
  @Input() qrSrc: string | undefined;

  /** Big heading below logo */
  @Input() heading: string = 'Painter Token';

  /** Contact phone / website shown in footer */
  @Input() phone: string = '0731-4939808';
  @Input() website: string = 'www.palspaint.com';

  /** Terms / small note text */
  @Input() termsText: string =
    '* Terms & Conditions Applied, to know more please contact or visit us on:';

  /** Optional logo src */
  @Input() logoSrc: string | null = null;

  /** Width of coupon in px or percent (string) */
  @Input() width: string = '380px';

  /** Primary color used for ribbons */
  @Input() primaryColor: string = '#123A71'; // deep blue similar to screenshot

  /** Badge color */
  @Input() badgeColor: string = '#0b4a8a';
}
