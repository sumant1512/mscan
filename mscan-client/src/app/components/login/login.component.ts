/**
 * Login Component
 */
import { ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { SubdomainService } from '../../services/subdomain.service';
import { AuthContextFacade } from '../../store/auth-context';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  emailForm: FormGroup;
  otpForm: FormGroup;

  step: 'email' | 'otp' = 'email';
  private loadingService = inject(LoadingService);

  loading$ = this.loadingService.loading$;
  error = '';
  success = '';
  email = '';
  otpExpiryTime = 0;
  countdown = '';
  currentSubdomain: string | null = null;

  private authContextFacade = inject(AuthContextFacade);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private subdomainService: SubdomainService
  ) {
    // Detect current subdomain
    this.currentSubdomain = this.subdomainService.getCurrentSubdomain();
    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      const currentUser = this.authService.getCurrentUser();
      const userType = currentUser?.role || this.authService.getUserType();
      const redirectRoute = userType === 'SUPER_ADMIN' ? '/super-admin/dashboard' : '/tenant/dashboard';
      this.router.navigate([redirectRoute]);
    }

    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Request OTP
   */
  requestOTP(): void {
    if (this.emailForm.invalid) return;

    this.error = '';
    this.success = '';
    this.email = this.emailForm.value.email;

    this.authService.requestOTP(this.email)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          if (response.status) {
            this.success = response.message || 'OTP sent successfully';
            this.step = 'otp';
            this.startCountdown(5);
          } else {
            this.error = response.message || 'Failed to send OTP';
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.error = HttpErrorHandler.getMessage(error, 'Failed to send OTP. Please try again.');
          console.log(this.error)
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Verify OTP and Login
   */
  verifyOTP(): void {
    if (this.otpForm.invalid) return;

    this.error = '';

    const otp = this.otpForm.value.otp;

    this.authService.verifyOTP(this.email, otp)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          if (response.status && response.data) {
            const userType = response.data.userType;
            const subdomain = response.data.subdomain;

            // Navigate based on user type
            if (userType === 'SUPER_ADMIN') {
              // Super admin - navigate to super admin dashboard
              this.router.navigate(['/super-admin/dashboard']);
            } else {
              // If subdomain mismatch, auth service will handle redirect
              if (this.currentSubdomain === subdomain || !subdomain) {
                // Already on correct subdomain or no subdomain - navigate to dashboard
                this.router.navigate(['/tenant/dashboard']);
              } else {
                console.log('LoginComponent.verifyOTP: Subdomain mismatch - auth service will handle redirect');
              }
            }
          } else {
            console.log(response)
            this.error = response.message || 'Login failed. Please try again.';
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.log(error)
          this.error = HttpErrorHandler.getMessage(error, 'Invalid OTP. Please try again.');
          this.otpForm.patchValue({ otp: '' });
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Resend OTP
   */
  resendOTP(): void {
    this.otpForm.reset();
    this.error = '';
    this.success = '';
    this.requestOTP();
  }

  /**
   * Go back to email step
   */
  goBack(): void {
    this.step = 'email';
    this.otpForm.reset();
    this.error = '';
    this.success = '';
    this.otpExpiryTime = 0;
  }

  /**
   * Start countdown timer
   */
  private startCountdown(minutes: number): void {
    this.otpExpiryTime = Date.now() + minutes * 60 * 1000;
    
    const interval = setInterval(() => {
      const remaining = this.otpExpiryTime - Date.now();
      
      if (remaining <= 0) {
        this.countdown = 'OTP expired';
        clearInterval(interval);
        return;
      }

      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      this.countdown = `${mins}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
  }
}
