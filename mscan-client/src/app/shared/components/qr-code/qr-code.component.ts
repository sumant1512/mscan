import { Component, Input, AfterViewInit, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import QRCode from 'qrcode';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-qr-code',
  standalone: true,
  template: `<canvas #qrCanvas></canvas>`,
  styles: [`canvas { display: block; }`]
})
export class QrCodeComponent implements AfterViewInit, OnChanges {
  /** Raw coupon code string (e.g. AB3K-7MNP) */
  @Input() couponCode = '';
  /** Canvas size in pixels */
  @Input() size = 150;

  @ViewChild('qrCanvas') private canvas!: ElementRef<HTMLCanvasElement>;

  private get qrValue(): string {
    const parts = window.location.hostname.split('.');
    const subdomain = parts.length > 1 ? parts[0] : null;

    if (subdomain) {
      const url = new URL(environment.scanBaseUrl);
      url.hostname = `${subdomain}.${url.hostname}`;
      return `${url.origin}/scan/${this.couponCode}`;
    }
    return `${environment.scanBaseUrl}/scan/${this.couponCode}`;
  }

  ngAfterViewInit() {
    this.renderQR();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['couponCode'] && this.canvas) {
      this.renderQR();
    }
  }

  private renderQR() {
    if (!this.couponCode || !this.canvas?.nativeElement) return;
    QRCode.toCanvas(this.canvas.nativeElement, this.qrValue, {
      width: this.size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    }, (err) => {
      if (err) console.error('QR generation error:', err);
    });
  }
}
