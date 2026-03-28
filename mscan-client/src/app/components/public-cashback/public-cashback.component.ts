import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CashbackService, PublicSessionResponse, PayoutResult } from '../../services/cashback.service';
import { LoadingService } from '../../shared/services/loading.service';

type Step = 'start' | 'otp' | 'upi' | 'confirm' | 'result';

@Component({
  selector: 'app-public-cashback',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './public-cashback.component.html',
  styleUrls: ['./public-cashback.component.css']
})
export class PublicCashbackComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private cashbackService = inject(CashbackService);
  private loadingService = inject(LoadingService);

  loading$ = this.loadingService.loading$;

  // ─── State ────────────────────────────────────────────────────────────────
  currentStep = signal<Step>('start');
  sessionId = signal<string | null>(null);
  session = signal<PublicSessionResponse | null>(null);
  maskedMobile = signal<string | null>(null);
  payoutResult = signal<PayoutResult | null>(null);
  error = signal<string>('');

  // OTP countdown
  otpSeconds = signal<number>(300); // 5 minutes
  private otpTimer: ReturnType<typeof setInterval> | null = null;

  // Step index for progress bar
  stepIndex = computed(() => {
    const map: Record<Step, number> = { start: 0, otp: 1, upi: 2, confirm: 3, result: 4 };
    return map[this.currentStep()];
  });

  // ─── Forms ────────────────────────────────────────────────────────────────
  mobileForm: FormGroup = this.fb.group({
    coupon_code: ['', [Validators.required, Validators.minLength(3)]],
    phone_e164: ['', [Validators.required, Validators.pattern(/^\+[1-9]\d{9,14}$/)]]
  });

  otpForm: FormGroup = this.fb.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  upiForm: FormGroup = this.fb.group({
    upi_id: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._-]+@[a-zA-Z]{2,}$/)]]
  });

  // ─── Lifecycle ───────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Pre-fill coupon code from query param (?code=COUPON123)
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['code']) {
        this.mobileForm.patchValue({ coupon_code: params['code'] });
      }
    });
  }

  ngOnDestroy(): void {
    this.clearOtpTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Step 1 + 2: Start session & submit mobile ───────────────────────────
  submitMobile(): void {
    if (this.mobileForm.invalid) {
      this.mobileForm.markAllAsTouched();
      return;
    }

    this.error.set('');
    const { coupon_code, phone_e164 } = this.mobileForm.value;

    // Start session first
    this.cashbackService.startPublicSession(coupon_code)
      .pipe(this.loadingService.wrapLoading(), takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const sessionData = (res as any).data || res;
          this.session.set(sessionData);
          this.sessionId.set(sessionData.session_id);

          // Submit mobile number
          this.cashbackService.submitMobile(sessionData.session_id, phone_e164)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (mobileRes) => {
                const d = (mobileRes as any).data || mobileRes;
                this.maskedMobile.set(d.mobile_masked);
                this.currentStep.set('otp');
                this.startOtpTimer();
              },
              error: (err) => this.setError(err, 'Failed to send OTP. Please try again.')
            });
        },
        error: (err) => this.setError(err, 'Coupon not found or not eligible for cashback.')
      });
  }

  // ─── Step 3: Verify OTP ──────────────────────────────────────────────────
  verifyOtp(): void {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    this.error.set('');
    const sessionId = this.sessionId();
    if (!sessionId) return;

    this.cashbackService.verifyOtp(sessionId, this.otpForm.value.otp)
      .pipe(this.loadingService.wrapLoading(), takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.clearOtpTimer();
          this.currentStep.set('upi');
        },
        error: (err) => this.setError(err, 'Invalid or expired OTP. Please try again.')
      });
  }

  resendOtp(): void {
    const sessionId = this.sessionId();
    const phone = this.mobileForm.value.phone_e164;
    if (!sessionId || !phone) return;

    this.error.set('');
    this.clearOtpTimer();

    this.cashbackService.submitMobile(sessionId, phone)
      .pipe(this.loadingService.wrapLoading(), takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.otpForm.reset();
          this.startOtpTimer();
        },
        error: (err) => this.setError(err, 'Failed to resend OTP.')
      });
  }

  // ─── Step 4: Submit UPI ──────────────────────────────────────────────────
  submitUpi(): void {
    if (this.upiForm.invalid) {
      this.upiForm.markAllAsTouched();
      return;
    }

    this.error.set('');
    const sessionId = this.sessionId();
    if (!sessionId) return;

    this.cashbackService.submitUpi(sessionId, this.upiForm.value.upi_id)
      .pipe(this.loadingService.wrapLoading(), takeUntil(this.destroy$))
      .subscribe({
        next: () => this.currentStep.set('confirm'),
        error: (err) => this.setError(err, 'Invalid UPI ID. Please check and try again.')
      });
  }

  // ─── Step 5: Confirm payout ──────────────────────────────────────────────
  confirmPayout(): void {
    this.error.set('');
    const sessionId = this.sessionId();
    if (!sessionId) return;

    this.cashbackService.confirmPayout(sessionId)
      .pipe(this.loadingService.wrapLoading(), takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const result = (res as any).data || res;
          this.payoutResult.set(result);
          this.currentStep.set('result');
        },
        error: (err) => this.setError(err, 'An unexpected error occurred. Please contact support.')
      });
  }

  // ─── Edit UPI (go back) ──────────────────────────────────────────────────
  editUpi(): void {
    this.currentStep.set('upi');
  }

  // ─── OTP timer ───────────────────────────────────────────────────────────
  private startOtpTimer(): void {
    this.otpSeconds.set(300);
    this.otpTimer = setInterval(() => {
      this.otpSeconds.update(s => {
        if (s <= 1) {
          this.clearOtpTimer();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  private clearOtpTimer(): void {
    if (this.otpTimer) {
      clearInterval(this.otpTimer);
      this.otpTimer = null;
    }
  }

  get otpExpired(): boolean { return this.otpSeconds() === 0; }

  get otpCountdown(): string {
    const s = this.otpSeconds();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  private setError(err: any, fallback: string): void {
    const msg = err?.error?.message || err?.message || fallback;
    this.error.set(msg);
  }

  isInvalid(form: FormGroup, field: string): boolean {
    const c = form.get(field);
    return !!(c && c.invalid && c.touched);
  }

  getError(form: FormGroup, field: string): string {
    const c = form.get(field);
    if (!c) return '';
    if (c.hasError('required')) return 'This field is required';
    if (c.hasError('minlength')) return 'Too short';
    if (c.hasError('pattern')) {
      if (field === 'phone_e164') return 'Enter a valid phone number with country code (e.g. +919876543210)';
      if (field === 'otp') return 'OTP must be 6 digits';
      if (field === 'upi_id') return 'Invalid UPI ID format (e.g. user@okaxis)';
    }
    return 'Invalid value';
  }
}
