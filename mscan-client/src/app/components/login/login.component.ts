/**
 * Login Component
 */
import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { SubdomainService } from '../../services/subdomain.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  emailForm: FormGroup;
  otpForm: FormGroup;
  
  step: 'email' | 'otp' = 'email';
  loading = false;
  error = '';
  success = '';
  email = '';
  otpExpiryTime = 0;
  countdown = '';
  currentSubdomain: string | null = null;

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

  /**
   * Request OTP
   */
  requestOTP(): void {
    if (this.emailForm.invalid) return;

    this.loading = true;
    this.error = '';
    this.success = '';
    this.email = this.emailForm.value.email;

    this.authService.requestOTP(this.email)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.success = response.message || 'OTP sent successfully';
            this.step = 'otp';
            this.startCountdown(5);
          } else {
            this.error = response.message || 'Failed to send OTP';
          }
        },
        error: (error) => {
          console.error('OTP Request Error:', error);
          this.error = error.error?.message || error.message || 'Failed to send OTP. Please try again.';
        }
      });
  }

  /**
   * Verify OTP and Login
   */
  verifyOTP(): void {
    if (this.otpForm.invalid) return;

    this.loading = true;
    this.error = '';

    const otp = this.otpForm.value.otp;

    this.authService.verifyOTP(this.email, otp)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const userType = response.data.userType;
            const subdomain = response.data.subdomain;

            // Issue 2 & 3: Handle subdomain redirect and navigation properly
            if (userType === 'SUPER_ADMIN') {
              // Super admin - navigate to super admin dashboard
              this.router.navigate(['/super-admin/dashboard']);
            } else if (subdomain) {
              // Tenant user
              if (this.currentSubdomain === subdomain) {
                // Already on correct subdomain - navigate to dashboard
                this.router.navigate(['/tenant/dashboard']);
              } else {
                // Wrong subdomain - redirect to correct one
                // Auth service will handle the redirect
              }
            }
          } else {
            this.error = response.message || 'Login failed. Please try again.';
          }
        },
        error: (error) => {
          console.error('OTP Verification Error:', error);
          this.error = error.error?.message || error.message || 'Invalid OTP. Please try again.';
          this.otpForm.patchValue({ otp: '' });
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
