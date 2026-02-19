import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RewardsService } from '../../services/rewards.service';
import { CreditService } from '../../services/credit.service';
import { AppContextService } from '../../services/app-context.service';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';
import { Product, ProductsFacade } from '../../store/products';
import { VerificationAppsFacade } from '../../store/verification-apps';

@Component({
  selector: 'app-coupon-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './coupon-create.component.html',
  styleUrls: ['./coupon-create.component.css'],
})
export class CouponCreateComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  couponForm: FormGroup;
  private loadingService = inject(LoadingService);

  loading$ = this.loadingService.loading$;
  error = '';
  success = '';
  selectedAppId: string | null = null;
  products: Product[] = [];
  currentBalance = 0;
  estimatedCost = 0;
  generatedCoupons: any[] = [];
  showBatchResults = false;
  multiCouponMode = false;
  showProgressBar = false;
  progressMessage = '';

  constructor(
    private fb: FormBuilder,
    private rewardsService: RewardsService,
    private verificationAppsFacade: VerificationAppsFacade,
    private productsFacade: ProductsFacade,
    private creditService: CreditService,
    private router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {
    // Set default expiry date to 1 year from now
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    const defaultExpiryDate = oneYearFromNow.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm

    this.couponForm = this.fb.group({
      // Single mode fields
      description: ['', [Validators.required, Validators.minLength(3)]],
      discount_value: ['', [Validators.required, Validators.min(1)]],
      quantity: [1, [Validators.required, Validators.min(1), Validators.max(500)]],
      product_id: ['', Validators.required],
      coupon_generation_type: ['SINGLE', Validators.required],
      expiry_date: [defaultExpiryDate, Validators.required],
      // Multi-batch mode field
      batches: this.fb.array([]),
    });
  }

  ngOnInit() {
    this.getSelectedApp();
    this.loadBalance();
    this.calculateEstimatedCost();
  }

  private getSelectedApp() {
    this.verificationAppsFacade.selectedAppId$.pipe(takeUntil(this.destroy$)).subscribe((appId) => {
      if (appId) {
        this.error = '';
        this.selectedAppId = appId;
        this.loadProducts(appId);
      } else {
        this.error = 'Please select an application from the top header before creating coupons.';
        this.products = [];
      }
    });
  }

  private calculateEstimatedCost() {
    this.couponForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.multiCouponMode) {
        // Calculate total across all batches
        const batches = this.batches.value;
        this.estimatedCost = batches.reduce((sum: number, batch: any) => {
          return sum + (batch.quantity * batch.discount_value || 0);
        }, 0);
      } else {
        // Single mode calculation
        const { discount_value, quantity } = this.couponForm.value;
        this.estimatedCost = quantity * discount_value;
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProducts(appId: string) {
    this.productsFacade.loadProducts({ app_id: appId });
    this.productsFacade.products$.pipe(takeUntil(this.destroy$)).subscribe((products) => {
      this.products = products;
      this.cdr.detectChanges();
    });
  }

  loadBalance() {
    this.creditService
      .getBalance()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (balance) => {
          this.currentBalance = balance.balance;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to load balance');
        },
      });
  }

  get batches(): FormArray {
    return this.couponForm.get('batches') as FormArray;
  }

  toggleMultiCouponMode() {
    this.multiCouponMode = !this.multiCouponMode;

    if (this.multiCouponMode) {
      // Clear single mode validators and values
      this.couponForm.get('description')?.clearValidators();
      this.couponForm.get('discount_value')?.clearValidators();
      this.couponForm.get('quantity')?.clearValidators();
      this.couponForm.get('product_id')?.clearValidators();
      this.couponForm.get('expiry_date')?.clearValidators();

      this.couponForm.patchValue({
        description: '',
        discount_value: '',
        quantity: '',
        product_id: '',
        expiry_date: '',
      });

      this.couponForm.get('description')?.updateValueAndValidity();
      this.couponForm.get('discount_value')?.updateValueAndValidity();
      this.couponForm.get('quantity')?.updateValueAndValidity();
      this.couponForm.get('product_id')?.updateValueAndValidity();
      this.couponForm.get('expiry_date')?.updateValueAndValidity();

      if (this.batches.length === 0) {
        this.addBatch();
      }
    } else {
      // Restore single mode validators
      this.couponForm
        .get('description')
        ?.setValidators([Validators.required, Validators.minLength(3)]);
      this.couponForm
        .get('discount_value')
        ?.setValidators([Validators.required, Validators.min(1)]);
      this.couponForm
        .get('quantity')
        ?.setValidators([Validators.required, Validators.min(1), Validators.max(500)]);
      this.couponForm.get('product_id')?.setValidators(Validators.required);
      this.couponForm.get('expiry_date')?.setValidators(Validators.required);

      // Clear batches and restore single mode defaults
      while (this.batches.length) {
        this.batches.removeAt(0);
      }
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      this.couponForm.patchValue({
        description: '',
        discount_value: '',
        quantity: 1,
        product_id: '',
        expiry_date: oneYearFromNow.toISOString().slice(0, 16),
      });

      this.couponForm.get('description')?.updateValueAndValidity();
      this.couponForm.get('discount_value')?.updateValueAndValidity();
      this.couponForm.get('quantity')?.updateValueAndValidity();
      this.couponForm.get('product_id')?.updateValueAndValidity();
      this.couponForm.get('expiry_date')?.updateValueAndValidity();
    }
    this.calculateEstimatedCost();
  }

  addBatch() {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    const defaultExpiryDate = oneYearFromNow.toISOString().slice(0, 16);

    const batchGroup = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(3)]],
      quantity: ['', [Validators.required, Validators.min(1), Validators.max(500)]],
      discount_value: ['', [Validators.required, Validators.min(0.01)]],
      product_id: ['', Validators.required],
      expiry_date: [defaultExpiryDate, Validators.required],
    });

    batchGroup.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.calculateEstimatedCost();
    });

    this.batches.push(batchGroup);
  }

  removeBatch(index: number) {
    if (this.batches.length > 1) {
      this.batches.removeAt(index);
      this.calculateEstimatedCost();
    }
  }

  getBatchCost(index: number): number {
    const batch = this.batches.at(index).value;
    return (batch.quantity || 0) * (batch.discount_value || 0);
  }

  onSubmit() {
    if (!this.selectedAppId) {
      this.error = 'Please select an application from the top header before creating coupons.';
      return;
    }

    console.log('Form submitted with value:', this.couponForm.value);

    if (this.couponForm.invalid) {
      Object.keys(this.couponForm.controls).forEach((key) => {
        this.couponForm.controls[key].markAsTouched();
      });
      if (this.multiCouponMode) {
        this.batches.controls.forEach((control) => control.markAllAsTouched());
      }
      return;
    }

    if (this.estimatedCost > this.currentBalance) {
      this.error = `Insufficient credits! Need ${this.estimatedCost}, have ${this.currentBalance}`;
      return;
    }

    if (this.multiCouponMode) {
      this.onSubmitMultiple();
    } else {
      this.onSubmitSingle();
    }
  }

  onSubmitSingle() {
    this.error = '';
    this.success = '';
    this.showBatchResults = false;

    const { quantity } = this.couponForm.value;

    // Always use FIXED_AMOUNT, single-use per code
    const formData = {
      ...this.couponForm.value,
      verification_app_id: this.selectedAppId,
      discount_type: 'FIXED_AMOUNT',
      total_usage_limit: 1,
      max_scans_per_code: 1,
      per_user_usage_limit: 1,
      coupon_generation_type: quantity > 1 ? 'BATCH' : 'SINGLE',
      batch_quantity: quantity,
    };

    this.rewardsService
      .createCoupon(formData)
      .pipe(this.loadingService.wrapLoading(), takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Always show batch results screen for single mode
          if (response.coupons && response.coupons.length > 0) {
            this.generatedCoupons = response.coupons;
            this.showBatchResults = true;
            this.success = `${this.generatedCoupons.length} coupon(s) created successfully! Cost: ${response.credit_cost} credits. New balance: ${response.new_balance}`;
            this.currentBalance = response.new_balance;
          } else if (response.coupon) {
            // Single coupon - convert to array for consistent display
            this.generatedCoupons = [response.coupon];
            this.showBatchResults = true;
            this.success = `Coupon created successfully! Cost: ${response.credit_cost} credits. New balance: ${response.new_balance}`;
            this.currentBalance = response.new_balance;
          } else {
            this.error = 'Invalid response from server';
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to create coupon');
        },
      });
  }

  onSubmitMultiple() {
    this.showProgressBar = true;
    this.progressMessage = `Creating ${this.batches.length} batches...`;
    this.error = '';
    this.success = '';
    this.showBatchResults = false;

    const batches = this.batches.value.map((batch: any) => ({
      description: batch.description,
      quantity: batch.quantity,
      discountAmount: batch.discount_value,
      productName: batch.product_name || null,
      productSku: batch.product_sku || null,
      expiryDate: new Date(batch.expiry_date).toISOString(),
    }));

    const requestData = {
      verificationAppId: this.selectedAppId!, // Non-null assertion safe since we check in onSubmit
      batches,
    };

    this.rewardsService
      .createMultiBatchCoupons(requestData)
      .pipe(this.loadingService.wrapLoading(), takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.generatedCoupons = response.coupons || [];
          this.showBatchResults = true;
          const totalCoupons = this.generatedCoupons.length;
          this.success = `Generated ${totalCoupons} coupons across ${this.batches.length} batches! Cost: ${response.credit_cost} credits. New balance: ${response.new_balance}`;
          this.currentBalance = response.new_balance;
          this.showProgressBar = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to create coupons');
          this.showProgressBar = false;
        },
      });
  }

  downloadCouponsCSV() {
    if (this.generatedCoupons.length === 0) return;

    const headers = ['Coupon Code', 'Discount Value', 'Currency', 'Expiry Date', 'QR Code URL'];
    const rows = this.generatedCoupons.map((coupon) => [
      coupon.coupon_code,
      coupon.discount_value,
      coupon.discount_currency,
      new Date(coupon.expiry_date).toLocaleDateString(),
      coupon.qr_code_url,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coupons-${new Date().getTime()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  printCoupons() {
    if (this.generatedCoupons.length === 0) return;
    window.print();
  }

  copyCouponCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.success = 'Coupon code copied to clipboard!';
      setTimeout(() => (this.success = ''), 3000);
    });
  }

  closeAndNavigate() {
    this.router.navigate(['/tenant/coupons']);
  }

  cancel() {
    this.router.navigate(['/tenant/coupons']);
  }

  isFieldInvalid(field: string): boolean {
    const control = this.couponForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  getFieldError(field: string): string {
    const control = this.couponForm.get(field);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('min')) {
      return `Minimum value is ${control.errors?.['min'].min}`;
    }
    if (control?.hasError('minlength')) {
      return `Minimum ${control.errors?.['minlength'].requiredLength} characters required`;
    }
    return '';
  }
}
