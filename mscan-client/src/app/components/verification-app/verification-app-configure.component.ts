import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RewardsService } from '../../services/rewards.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-verification-app-configure',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './verification-app-configure.component.html',
  styleUrls: ['./verification-app-configure.component.css']
})
export class VerificationAppConfigureComponent implements OnInit {
  configForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  isEditMode = false;
  appId?: string;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private rewardsService: RewardsService,
    private cdr: ChangeDetectorRef
  ) {
    this.configForm = this.fb.group({
      app_name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      logo_url: [''],
      primary_color: ['#00d4ff'],
      secondary_color: ['#1a1a2e'],
      welcome_message: ['Welcome! Scan to verify your coupon.'],
      scan_success_message: ['Coupon verified successfully!'],
      scan_failure_message: ['Invalid or expired coupon.'],
      post_scan_redirect_url: [''],
      enable_analytics: [true]
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    console.log('VerificationAppConfigureComponent - Route ID:', id);
    if (id) {
      this.isEditMode = true;
      this.appId = id;
      console.log('Edit mode enabled for app ID:', this.appId);
      this.loadApp(this.appId);
    } else {
      console.log('Create mode - no ID provided');
    }
  }

  loadApp(appId: string) {
    if (!appId) return;
    
    console.log('Loading verification app with ID:', appId);
    this.loading = true;
    
    this.rewardsService.getVerificationAppById(appId)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          console.log('Verification app loaded:', response);
          if (response.app) {
            console.log('Patching form with app data:', response.app);
            this.configForm.patchValue(response.app);
            this.cdr.detectChanges();
          } else {
            this.error = 'Verification app not found';
          }
        },
        error: (err) => {
          console.error('Load verification app error:', err);
          this.error = err.error?.error || err.message || 'Failed to load verification app';
        }
      });
  }

  onSubmit() {
    if (this.configForm.invalid) {
      Object.keys(this.configForm.controls).forEach(key => {
        this.configForm.controls[key].markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const formData = this.configForm.value;

    if (this.isEditMode && this.appId) {
      // Update existing app
      this.rewardsService.updateVerificationApp(this.appId, formData)
        .pipe(finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }))
        .subscribe({
          next: (response) => {
            this.success = response.message || 'Verification app updated successfully!';
            setTimeout(() => {
              this.router.navigate(['/tenant/verification-app']);
            }, 1500);
          },
          error: (err) => {
            console.error('Update verification app error:', err);
            this.error = err.error?.error || err.message || 'Failed to update verification app';
          }
        });
    } else {
      // Create new app
      this.rewardsService.createVerificationApp(formData)
        .pipe(finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }))
        .subscribe({
          next: (response) => {
            this.success = response.message || 'Verification app created successfully!';
            setTimeout(() => {
              this.router.navigate(['/tenant/verification-app']);
            }, 1500);
          },
          error: (err) => {
            console.error('Create verification app error:', err);
            this.error = err.error?.error || err.message || 'Failed to create verification app';
          }
        });
    }
  }

  cancel() {
    this.router.navigate(['/tenant/verification-app']);
  }

  isFieldInvalid(field: string): boolean {
    const control = this.configForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  getFieldError(field: string): string {
    const control = this.configForm.get(field);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('minlength')) {
      return `Minimum ${control.errors?.['minlength'].requiredLength} characters required`;
    }
    return '';
  }
}
