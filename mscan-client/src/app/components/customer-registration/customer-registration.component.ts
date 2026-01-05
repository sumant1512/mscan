/**
 * Customer Registration Component (Super Admin Only)
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-customer-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './customer-registration.component.html',
  styleUrls: ['./customer-registration.component.css']
})
export class CustomerRegistrationComponent implements OnInit {
  registrationForm: FormGroup;
  loading = false;
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

  /**
   * Submit customer registration
   */
  onSubmit(): void {
    if (this.registrationForm.invalid) {
      this.markFormGroupTouched(this.registrationForm);
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const customerData = this.registrationForm.value;

    this.userService.createCustomer(customerData)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.success = `Customer "${customerData.companyName}" registered successfully! Welcome email sent to ${customerData.contactEmail}`;
            this.registrationForm.reset();
            
            // Navigate to dashboard after 3 seconds
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 3000);
          }
        },
        error: (error) => {
          console.error('Create customer error:', error);
          this.error = error.error?.message || error.message || 'Failed to register customer. Please try again.';
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
