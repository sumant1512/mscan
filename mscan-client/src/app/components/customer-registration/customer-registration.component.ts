/**
 * Customer Registration Component (Super Admin Only)
 */
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-customer-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './customer-registration.component.html',
  styleUrls: ['./customer-registration.component.css']
})
export class CustomerRegistrationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  registrationForm: FormGroup;
  private loadingService = inject(LoadingService);

  loading$ = this.loadingService.loading$;
  error = '';
  success = '';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {
    this.registrationForm = this.fb.group({
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      contactEmail: ['', [Validators.required, Validators.email]],
      adminName: ['', [Validators.required, Validators.minLength(2)]],
      contactPhone: ['', [Validators.pattern(/^\+?[\d\s-()]+$/)]],
      address: ['']
    });
  }

  ngOnInit(): void {
    // Verify super admin access
    if (!this.authService.isSuperAdmin()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Submit customer registration
   */
  onSubmit(): void {
    if (this.registrationForm.invalid) {
      this.markFormGroupTouched(this.registrationForm);
      return;
    }

    this.error = '';
    this.success = '';

    const customerData = this.registrationForm.value;

    this.userService.createCustomer(customerData)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          if (response.status) {
            this.success = `Customer "${customerData.companyName}" registered successfully! Welcome email sent to ${customerData.contactEmail}`;
            this.registrationForm.reset();

            // Navigate to dashboard after 3 seconds
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 3000);
          }
        },
        error: (error) => {
          this.error = HttpErrorHandler.getMessage(error, 'Failed to register customer. Please try again.');
        }
      });
  }

  /**
   * Cancel and go back to dashboard
   */
  cancel(): void {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Helper to mark all fields as touched (for validation display)
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Check if a field has an error
   */
  hasError(fieldName: string, errorType: string): boolean {
    const field = this.registrationForm.get(fieldName);
    return !!(field?.hasError(errorType) && field?.touched);
  }

  /**
   * Check if a field is invalid and touched
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.registrationForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }
}
