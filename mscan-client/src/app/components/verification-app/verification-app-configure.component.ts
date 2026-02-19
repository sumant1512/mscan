import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { TemplatesFacade } from '../../store/templates/templates.facade';
import { VerificationAppsFacade } from '../../store/verification-apps/verification-apps.facade';
import { ProductTemplate } from '../../models/templates.model';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-verification-app-configure',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './verification-app-configure.component.html',
  styleUrls: ['./verification-app-configure.component.css'],
})
export class VerificationAppConfigureComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private loadingService = inject(LoadingService);
  private templatesFacade = inject(TemplatesFacade);
  private verificationAppsFacade = inject(VerificationAppsFacade);

  configForm: FormGroup;
  loading$ = this.verificationAppsFacade.loading$;
  error$ = this.verificationAppsFacade.error$;
  error = '';
  success = '';
  isEditMode = false;
  appId?: string;
  templates: ProductTemplate[] = [];

  // Currency options
  currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
    { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
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
      template_id: ['', Validators.required], // Made required
      currency: ['INR', Validators.required], // Application currency
    });
  }

  ngOnInit() {
    this.loadTemplates();
    const id = this.route.snapshot.paramMap.get('id');
    this.setFormMode(id as string);

    // Getting template list from store to populate template dropdown
    this.getTemplateList();

    // Subscribe to error state
    this.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        if (error) {
          this.error = error;
          this.cdr.detectChanges();
        }
      });

    // Subscribe to success message and navigate after operations complete
    this.verificationAppsFacade.successMessage$
      .pipe(
        takeUntil(this.destroy$),
        filter(msg => msg !== null)
      )
      .subscribe((message) => {
        this.success = message || '';
        this.cdr.detectChanges();

        // Navigate to verification apps list after success
        setTimeout(() => {
          this.router.navigate(['/tenant/verification-app']);
        }, 1500);
      });
  }

  private getTemplateList() {
    this.templatesFacade.templates$.pipe(takeUntil(this.destroy$)).subscribe((templates) => {
      this.templates = templates;

      // If no templates exist, show error and disable form
      if (this.templates.length === 0 && !this.isEditMode) {
        this.error =
          'No product templates found. Please create a product template first before creating a verification app.';
        this.configForm.disable();
      }
      if(this.templates.length > 0) {
        this.error = '';
        this.configForm.enable();
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTemplates(): void {
    this.templatesFacade.loadTemplates({ include_system: true, limit: 100 });
  }

  setFormMode(id: string) {
    if (id) {
      this.isEditMode = true;
      this.appId = id;
      this.loadApp(this.appId);
    }
  }

  loadApp(appId: string) {
    if (!appId) return;

    // Subscribe to app from store by ID
    this.verificationAppsFacade.getAppById(appId)
      .pipe(
        takeUntil(this.destroy$),
        filter(app => app !== undefined)
      )
      .subscribe((app) => {
        if (app) {
          this.configForm.patchValue(app);
          this.cdr.detectChanges();
        } else {
          this.error = 'Verification app not found';
        }
      });
  }

  onSubmit() {
    if (this.configForm.invalid) {
      Object.keys(this.configForm.controls).forEach((key) => {
        this.configForm.controls[key].markAsTouched();
      });
      return;
    }

    // Clear any previous messages
    this.error = '';
    this.success = '';

    const formData = this.configForm.value;

    if (this.isEditMode && this.appId) {
      // Update existing app via NgRx store
      this.verificationAppsFacade.updateApp(this.appId, formData);
      // Success/navigation handled by subscription in ngOnInit
    } else {
      // Create new app via NgRx store
      this.verificationAppsFacade.createApp(formData);
      // Success/navigation handled by subscription in ngOnInit
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
