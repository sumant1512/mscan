/**
 * Unit Tests for Coupon Create Component - Jest
 * Tests both Single Mode and Multi-Batch Mode functionality
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { of, throwError } from 'rxjs';
import { CouponCreateComponent } from './coupon-create.component';
import { RewardsService } from '../../services/rewards.service';
import { CreditService } from '../../services/credit.service';

describe('CouponCreateComponent', () => {
  let component: CouponCreateComponent;
  let fixture: ComponentFixture<CouponCreateComponent>;
  let rewardsService: any;
  let creditService: any;
  let router: any;

  const mockVerificationApps = [
    { id: 'app-1', app_name: 'Test App 1', status: 'active' },
    { id: 'app-2', app_name: 'Test App 2', status: 'active' }
  ];

  const mockCouponResponse = {
    message: 'Coupon created successfully',
    coupon: {
      id: 'coupon-1',
      coupon_code: 'TEST123',
      discount_value: 10,
      expiry_date: '2026-12-31T23:59:59Z',
      qr_code_url: 'http://example.com/qr.png'
    },
    credit_cost: 10,
    new_balance: 90
  };

  const mockMultiBatchResponse = {
    message: 'Multi-batch coupons created successfully',
    coupons: [
      {
        id: 'coupon-1',
        coupon_code: 'BATCH1',
        discount_value: 10,
        description: 'Batch 1',
        expiry_date: '2026-12-31T23:59:59Z',
        qr_code_url: 'http://example.com/qr1.png'
      },
      {
        id: 'coupon-2',
        coupon_code: 'BATCH2',
        discount_value: 20,
        description: 'Batch 2',
        expiry_date: '2027-01-31T23:59:59Z',
        qr_code_url: 'http://example.com/qr2.png'
      }
    ],
    credit_cost: 30,
    new_balance: 70
  };

  beforeEach(async () => {
    const rewardsServiceMock = {
      getVerificationApps: jest.fn(),
      createCoupon: jest.fn(),
      createMultiBatchCoupons: jest.fn()
    };

    const creditServiceMock = {
      getBalance: jest.fn()
    };

    const routerMock = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, CouponCreateComponent],
      providers: [
        FormBuilder,
        { provide: RewardsService, useValue: rewardsServiceMock },
        { provide: CreditService, useValue: creditServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    rewardsService = TestBed.inject(RewardsService);
    creditService = TestBed.inject(CreditService);
    router = TestBed.inject(Router);

    // Setup default mocks
    rewardsService.getVerificationApps.mockReturnValue(
      of({ apps: mockVerificationApps })
    );
    creditService.getBalance.mockReturnValue(
      of({ balance: 100 })
    );

    fixture = TestBed.createComponent(CouponCreateComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize coupon form with default values', () => {
      expect(component.couponForm).toBeDefined();
      expect(component.couponForm.get('verification_app_id')).toBeDefined();
      expect(component.couponForm.get('description')).toBeDefined();
      expect(component.couponForm.get('discount_value')).toBeDefined();
      expect(component.couponForm.get('quantity')?.value).toBe(1);
      expect(component.couponForm.get('batches')).toBeDefined();
    });

    it('should set default expiry date to 1 year from now', () => {
      const expiryDate = component.couponForm.get('expiry_date')?.value;
      expect(expiryDate).toBeDefined();
      
      const expiryYear = new Date(expiryDate).getFullYear();
      const currentYear = new Date().getFullYear();
      expect(expiryYear).toBe(currentYear + 1);
    });

    it('should start in single coupon mode', () => {
      expect(component.multiCouponMode).toBe(false);
    });

    it('should load verification apps on init', (done) => {
      fixture.detectChanges();
      
      setTimeout(() => {
        expect(rewardsService.getVerificationApps).toHaveBeenCalled();
        expect(component.verificationApps).toEqual(mockVerificationApps);
        done();
      }, 100);
    });

    it('should load credit balance on init', (done) => {
      fixture.detectChanges();
      
      setTimeout(() => {
        expect(creditService.getBalance).toHaveBeenCalled();
        expect(component.currentBalance).toBe(100);
        done();
      }, 100);
    });

    it('should handle verification apps load error', (done) => {
      rewardsService.getVerificationApps.mockReturnValue(
        throwError(() => ({ error: { error: 'Failed to load apps' } }))
      );
      
      fixture.detectChanges();
      
      setTimeout(() => {
        expect(component.error).toBe('Failed to load apps');
        done();
      }, 100);
    });

    it('should handle credit balance load error silently', (done) => {
      creditService.getBalance.mockReturnValue(
        throwError(() => ({ message: 'Failed to load balance' }))
      );
      
      fixture.detectChanges();
      
      setTimeout(() => {
        // Component doesn't set error for balance load failures
        expect(component.currentBalance).toBe(0);
        done();
      }, 100);
    });
  });

  describe('Form Validation - Single Mode', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should require verification app', () => {
      const control = component.couponForm.get('verification_app_id');
      control?.setValue('');
      expect(control?.hasError('required')).toBe(true);
    });

    it('should require description', () => {
      const control = component.couponForm.get('description');
      control?.setValue('');
      expect(control?.hasError('required')).toBe(true);
    });

    it('should require minimum description length of 3', () => {
      const control = component.couponForm.get('description');
      control?.setValue('ab');
      expect(control?.hasError('minlength')).toBe(true);
      
      control?.setValue('abc');
      expect(control?.hasError('minlength')).toBe(false);
    });

    it('should require discount value', () => {
      const control = component.couponForm.get('discount_value');
      control?.setValue('');
      expect(control?.hasError('required')).toBe(true);
    });

    it('should require minimum discount value of 1', () => {
      const control = component.couponForm.get('discount_value');
      control?.setValue(0);
      expect(control?.hasError('min')).toBe(true);
      
      control?.setValue(1);
      expect(control?.hasError('min')).toBe(false);
    });

    it('should require quantity', () => {
      const control = component.couponForm.get('quantity');
      control?.setValue('');
      expect(control?.hasError('required')).toBe(true);
    });

    it('should validate quantity range (1-500)', () => {
      const control = component.couponForm.get('quantity');
      
      control?.setValue(0);
      expect(control?.hasError('min')).toBe(true);
      
      control?.setValue(501);
      expect(control?.hasError('max')).toBe(true);
      
      control?.setValue(250);
      expect(control?.valid).toBe(true);
    });

    it('should require expiry date', () => {
      const control = component.couponForm.get('expiry_date');
      control?.setValue('');
      expect(control?.hasError('required')).toBe(true);
    });
  });

  describe('Mode Toggle', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should toggle to multi-batch mode', () => {
      expect(component.multiCouponMode).toBe(false);
      
      component.toggleMultiCouponMode();
      
      expect(component.multiCouponMode).toBe(true);
    });

    it('should toggle back to single mode', () => {
      component.toggleMultiCouponMode();
      expect(component.multiCouponMode).toBe(true);
      
      component.toggleMultiCouponMode();
      
      expect(component.multiCouponMode).toBe(false);
    });

    it('should clear single mode validators when switching to multi-batch', () => {
      component.toggleMultiCouponMode();
      
      const description = component.couponForm.get('description');
      const discountValue = component.couponForm.get('discount_value');
      const quantity = component.couponForm.get('quantity');
      const expiryDate = component.couponForm.get('expiry_date');
      
      expect(description?.validator).toBeNull();
      expect(discountValue?.validator).toBeNull();
      expect(quantity?.validator).toBeNull();
      expect(expiryDate?.validator).toBeNull();
    });

    it('should restore single mode validators when switching back', () => {
      component.toggleMultiCouponMode();
      component.toggleMultiCouponMode();
      
      const description = component.couponForm.get('description');
      const discountValue = component.couponForm.get('discount_value');
      
      description?.setValue('');
      discountValue?.setValue('');
      
      expect(description?.hasError('required')).toBe(true);
      expect(discountValue?.hasError('required')).toBe(true);
    });

    it('should add first batch when switching to multi-batch mode', () => {
      expect(component.batches.length).toBe(0);
      
      component.toggleMultiCouponMode();
      
      expect(component.batches.length).toBe(1);
    });

    it('should clear all batches when switching back to single mode', () => {
      component.toggleMultiCouponMode();
      component.addBatch();
      component.addBatch();
      expect(component.batches.length).toBe(3);
      
      component.toggleMultiCouponMode();
      
      expect(component.batches.length).toBe(0);
    });

    it('should recalculate cost after mode toggle', () => {
      const calculateSpy = jest.spyOn(component, 'calculateEstimatedCost');
      
      component.toggleMultiCouponMode();
      
      expect(calculateSpy).toHaveBeenCalled();
    });
  });

  describe('Batch Management', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.toggleMultiCouponMode();
    });

    it('should add a new batch', () => {
      const initialLength = component.batches.length;
      
      component.addBatch();
      
      expect(component.batches.length).toBe(initialLength + 1);
    });

    it('should add batch with required fields', () => {
      component.addBatch();
      
      const batch = component.batches.at(component.batches.length - 1);
      expect(batch.get('description')).toBeDefined();
      expect(batch.get('quantity')).toBeDefined();
      expect(batch.get('discount_value')).toBeDefined();
      expect(batch.get('expiry_date')).toBeDefined();
    });

    it('should auto-populate expiry date with 1 year from now for new batch', () => {
      component.addBatch();
      
      const batch = component.batches.at(component.batches.length - 1);
      const expiryDate = batch.get('expiry_date')?.value;
      
      const expiryYear = new Date(expiryDate).getFullYear();
      const currentYear = new Date().getFullYear();
      expect(expiryYear).toBe(currentYear + 1);
    });

    it('should remove batch at specific index', () => {
      component.addBatch();
      component.addBatch();
      expect(component.batches.length).toBe(3);
      
      component.removeBatch(1);
      
      expect(component.batches.length).toBe(2);
    });

    it('should not remove batch if only one exists', () => {
      expect(component.batches.length).toBe(1);
      
      component.removeBatch(0);
      
      expect(component.batches.length).toBe(1);
    });

    it('should recalculate cost when batch is removed', () => {
      component.addBatch();
      const calculateSpy = jest.spyOn(component, 'calculateEstimatedCost');
      
      component.removeBatch(1);
      
      expect(calculateSpy).toHaveBeenCalled();
    });

    it('should validate batch description is required', () => {
      const batch = component.batches.at(0);
      const description = batch.get('description');
      
      description?.setValue('');
      expect(description?.hasError('required')).toBe(true);
    });

    it('should validate batch description minimum length', () => {
      const batch = component.batches.at(0);
      const description = batch.get('description');
      
      description?.setValue('ab');
      expect(description?.hasError('minlength')).toBe(true);
      
      description?.setValue('abc');
      expect(description?.hasError('minlength')).toBe(false);
    });

    it('should validate batch quantity range (1-500)', () => {
      const batch = component.batches.at(0);
      const quantity = batch.get('quantity');
      
      quantity?.setValue(0);
      expect(quantity?.hasError('min')).toBe(true);
      
      quantity?.setValue(501);
      expect(quantity?.hasError('max')).toBe(true);
      
      quantity?.setValue(100);
      expect(quantity?.valid).toBe(true);
    });

    it('should validate batch discount minimum (0.01)', () => {
      const batch = component.batches.at(0);
      const discount = batch.get('discount_value');
      
      discount?.setValue(0);
      expect(discount?.hasError('min')).toBe(true);
      
      discount?.setValue(0.01);
      expect(discount?.valid).toBe(true);
    });
  });

  describe('Cost Calculation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should calculate cost in single mode', () => {
      component.couponForm.patchValue({
        discount_value: 10,
        quantity: 5
      });
      
      component.calculateEstimatedCost();
      
      expect(component.estimatedCost).toBe(50);
    });

    it('should calculate cost with decimal discount value', () => {
      component.couponForm.patchValue({
        discount_value: 12.50,
        quantity: 4
      });
      
      component.calculateEstimatedCost();
      
      expect(component.estimatedCost).toBe(50);
    });

    it('should calculate total cost across multiple batches', () => {
      component.toggleMultiCouponMode();
      
      const batch1 = component.batches.at(0);
      batch1.patchValue({
        quantity: 10,
        discount_value: 5
      });
      
      component.addBatch();
      const batch2 = component.batches.at(1);
      batch2.patchValue({
        quantity: 20,
        discount_value: 3
      });
      
      component.calculateEstimatedCost();
      
      expect(component.estimatedCost).toBe(110); // (10*5) + (20*3)
    });

    it('should get individual batch cost', () => {
      component.toggleMultiCouponMode();
      
      const batch = component.batches.at(0);
      batch.patchValue({
        quantity: 15,
        discount_value: 8
      });
      
      const cost = component.getBatchCost(0);
      
      expect(cost).toBe(120);
    });

    it('should handle zero values in cost calculation', () => {
      component.couponForm.patchValue({
        discount_value: 0,
        quantity: 0
      });
      
      component.calculateEstimatedCost();
      
      expect(component.estimatedCost).toBe(0);
    });
  });

  describe('Single Mode Submission', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.currentBalance = 100;
    });

    it('should prevent submission with invalid form', () => {
      component.couponForm.patchValue({
        verification_app_id: '',
        description: '',
        discount_value: '',
        quantity: ''
      });
      
      component.onSubmit();
      
      expect(rewardsService.createCoupon).not.toHaveBeenCalled();
    });

    it('should prevent submission with insufficient credits', () => {
      component.currentBalance = 50;
      component.couponForm.patchValue({
        verification_app_id: 'app-1',
        description: 'Test Coupon',
        discount_value: 100,
        quantity: 1
      });
      component.calculateEstimatedCost();
      
      component.onSubmit();
      
      expect(component.error).toContain('Insufficient credits');
      expect(rewardsService.createCoupon).not.toHaveBeenCalled();
    });

    it('should call createCoupon with valid form data', () => {
      rewardsService.createCoupon.mockReturnValue(of(mockCouponResponse));
      
      component.couponForm.patchValue({
        verification_app_id: 'app-1',
        description: 'Test Coupon',
        discount_value: 10,
        quantity: 1
      });
      
      component.onSubmit();
      
      expect(rewardsService.createCoupon).toHaveBeenCalled();
    });

    it('should show batch results screen on successful creation', (done) => {
      rewardsService.createCoupon.mockReturnValue(of(mockCouponResponse));
      
      component.couponForm.patchValue({
        verification_app_id: 'app-1',
        description: 'Test Coupon',
        discount_value: 10,
        quantity: 1
      });
      
      component.onSubmit();
      
      setTimeout(() => {
        expect(component.showBatchResults).toBe(true);
        expect(component.generatedCoupons.length).toBe(1);
        expect(component.success).toContain('successfully');
        done();
      }, 100);
    });

    it('should update credit balance after successful creation', (done) => {
      rewardsService.createCoupon.mockReturnValue(of(mockCouponResponse));
      
      component.couponForm.patchValue({
        verification_app_id: 'app-1',
        description: 'Test Coupon',
        discount_value: 10,
        quantity: 1
      });
      
      component.onSubmit();
      
      setTimeout(() => {
        expect(component.currentBalance).toBe(90);
        done();
      }, 100);
    });

    it('should handle creation error', (done) => {
      rewardsService.createCoupon.mockReturnValue(
        throwError(() => ({ error: { error: 'Creation failed' } }))
      );
      
      component.couponForm.patchValue({
        verification_app_id: 'app-1',
        description: 'Test Coupon',
        discount_value: 10,
        quantity: 1
      });
      
      component.onSubmit();
      
      setTimeout(() => {
        expect(component.error).toBe('Creation failed');
        expect(component.loading).toBe(false);
        done();
      }, 100);
    });

    it('should set loading state during submission', (done) => {
      rewardsService.createCoupon.mockReturnValue(of(mockCouponResponse));
      
      component.couponForm.patchValue({
        verification_app_id: 'app-1',
        description: 'Test Coupon',
        discount_value: 10,
        quantity: 1
      });
      
      // Mock the async call to check loading immediately
      const originalCreateCoupon = rewardsService.createCoupon;
      rewardsService.createCoupon.mockImplementation(() => {
        expect(component.loading).toBe(true);
        return of(mockCouponResponse);
      });
      
      component.onSubmit();
      
      setTimeout(() => {
        done();
      }, 100);
    });
  });

  describe('Multi-Batch Mode Submission', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.currentBalance = 100;
      component.toggleMultiCouponMode();
    });

    it('should prevent submission with invalid batches', () => {
      const batch = component.batches.at(0);
      batch.patchValue({
        description: '',
        quantity: '',
        discount_value: ''
      });
      
      component.onSubmit();
      
      expect(rewardsService.createMultiBatchCoupons).not.toHaveBeenCalled();
    });

    it('should prevent submission with insufficient credits for all batches', () => {
      component.currentBalance = 20;
      
      component.couponForm.patchValue({
        verification_app_id: 'app-1'
      });
      
      const batch1 = component.batches.at(0);
      batch1.patchValue({
        description: 'Batch 1',
        quantity: 10,
        discount_value: 5,
        expiry_date: '2026-12-31T23:59'
      });
      
      component.addBatch();
      const batch2 = component.batches.at(1);
      batch2.patchValue({
        description: 'Batch 2',
        quantity: 10,
        discount_value: 5,
        expiry_date: '2026-12-31T23:59'
      });
      
      component.calculateEstimatedCost();
      component.onSubmit();
      
      expect(component.error).toContain('Insufficient credits');
      expect(rewardsService.createMultiBatchCoupons).not.toHaveBeenCalled();
    });

    it('should call createMultiBatchCoupons with valid data', () => {
      rewardsService.createMultiBatchCoupons.mockReturnValue(of(mockMultiBatchResponse));
      
      component.couponForm.patchValue({
        verification_app_id: 'app-1'
      });
      
      const batch = component.batches.at(0);
      batch.patchValue({
        description: 'Test Batch',
        quantity: 10,
        discount_value: 5,
        expiry_date: '2026-12-31T23:59'
      });
      
      component.onSubmit();
      
      expect(rewardsService.createMultiBatchCoupons).toHaveBeenCalled();
      const callArgs = rewardsService.createMultiBatchCoupons.mock.calls[0][0];
      expect(callArgs.verificationAppId).toBe('app-1');
      expect(callArgs.batches).toBeDefined();
      expect(callArgs.batches.length).toBe(1);
    });

    it('should show progress bar during multi-batch creation', (done) => {
      rewardsService.createMultiBatchCoupons.mockImplementation(() => {
        // Check progress bar is shown immediately
        expect(component.showProgressBar).toBe(true);
        expect(component.progressMessage).toContain('Creating');
        return of(mockMultiBatchResponse);
      });
      
      component.couponForm.patchValue({
        verification_app_id: 'app-1'
      });
      
      const batch = component.batches.at(0);
      batch.patchValue({
        description: 'Test Batch',
        quantity: 10,
        discount_value: 5,
        expiry_date: '2026-12-31T23:59'
      });
      
      component.onSubmit();
      
      setTimeout(() => {
        done();
      }, 100);
    });

    it('should handle successful multi-batch creation', (done) => {
      rewardsService.createMultiBatchCoupons.mockReturnValue(of(mockMultiBatchResponse));
      
      component.couponForm.patchValue({
        verification_app_id: 'app-1'
      });
      
      const batch = component.batches.at(0);
      batch.patchValue({
        description: 'Test Batch',
        quantity: 10,
        discount_value: 5,
        expiry_date: '2026-12-31T23:59'
      });
      
      component.onSubmit();
      
      setTimeout(() => {
        expect(component.showBatchResults).toBe(true);
        expect(component.generatedCoupons.length).toBe(2);
        expect(component.currentBalance).toBe(70);
        expect(component.success).toContain('Generated');
        expect(component.success).toContain('coupons');
        done();
      }, 100);
    });

    it('should handle multi-batch creation error', (done) => {
      rewardsService.createMultiBatchCoupons.mockReturnValue(
        throwError(() => ({ error: { error: 'Batch creation failed' } }))
      );
      
      component.couponForm.patchValue({
        verification_app_id: 'app-1'
      });
      
      const batch = component.batches.at(0);
      batch.patchValue({
        description: 'Test Batch',
        quantity: 10,
        discount_value: 5,
        expiry_date: '2026-12-31T23:59'
      });
      
      component.onSubmit();
      
      setTimeout(() => {
        expect(component.error).toBe('Batch creation failed');
        expect(component.loading).toBe(false);
        expect(component.showProgressBar).toBe(false);
        done();
      }, 100);
    });

    it('should format batch data correctly for API', () => {
      rewardsService.createMultiBatchCoupons.mockReturnValue(of(mockMultiBatchResponse));
      
      component.couponForm.patchValue({
        verification_app_id: 'app-1'
      });
      
      const batch = component.batches.at(0);
      batch.patchValue({
        description: 'Test Batch',
        quantity: 10,
        discount_value: 5.50,
        expiry_date: '2026-12-31T23:59'
      });
      
      component.onSubmit();
      
      const callArgs = rewardsService.createMultiBatchCoupons.mock.calls[0][0];
      expect(callArgs.batches[0].description).toBe('Test Batch');
      expect(callArgs.batches[0].quantity).toBe(10);
      expect(callArgs.batches[0].discountAmount).toBe(5.50);
      expect(callArgs.batches[0].expiryDate).toContain('2026-12-31');
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should check if field is invalid', () => {
      const control = component.couponForm.get('description');
      control?.setValue('');
      control?.markAsTouched();
      
      const isInvalid = component.isFieldInvalid('description');
      
      expect(isInvalid).toBe(true);
    });

    it('should return false for valid untouched field', () => {
      const control = component.couponForm.get('description');
      control?.setValue('Valid Description');
      
      const isInvalid = component.isFieldInvalid('description');
      
      expect(isInvalid).toBe(false);
    });

    it('should get field error message for required field', () => {
      const control = component.couponForm.get('description');
      control?.setValue('');
      control?.markAsTouched();
      
      const error = component.getFieldError('description');
      
      expect(error).toContain('required');
    });

    it('should get field error message for minlength', () => {
      const control = component.couponForm.get('description');
      control?.setValue('ab');
      control?.markAsTouched();
      
      const error = component.getFieldError('description');
      
      expect(error).toContain('Minimum 3 characters required');
    });

    it('should get field error message for min value', () => {
      const control = component.couponForm.get('discount_value');
      control?.setValue(0);
      control?.markAsTouched();
      
      const error = component.getFieldError('discount_value');
      
      expect(error).toContain('Minimum value is 1');
    });

    it('should cancel and navigate to coupons list', () => {
      component.cancel();
      
      expect(router.navigate).toHaveBeenCalledWith(['/tenant/coupons']);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle empty verification apps list', (done) => {
      rewardsService.getVerificationApps.mockReturnValue(
        of({ apps: [] })
      );
      
      component.ngOnInit();
      
      setTimeout(() => {
        expect(component.verificationApps).toEqual([]);
        done();
      }, 100);
    });

    it('should handle very large quantity (500)', () => {
      component.couponForm.patchValue({
        discount_value: 1,
        quantity: 500
      });
      
      component.calculateEstimatedCost();
      
      expect(component.estimatedCost).toBe(500);
    });

    it('should handle decimal discount values correctly', () => {
      component.couponForm.patchValue({
        discount_value: 0.01,
        quantity: 1
      });
      
      component.calculateEstimatedCost();
      
      expect(component.estimatedCost).toBe(0.01);
    });

    it('should handle removing last remaining batch gracefully', () => {
      component.toggleMultiCouponMode();
      expect(component.batches.length).toBe(1);
      
      component.removeBatch(0);
      
      expect(component.batches.length).toBe(1); // Should not remove
    });

    it('should mark all form controls as touched on invalid submission', () => {
      component.couponForm.patchValue({
        verification_app_id: '',
        description: ''
      });
      
      component.onSubmit();
      
      const verificationAppControl = component.couponForm.get('verification_app_id');
      const descriptionControl = component.couponForm.get('description');
      
      expect(verificationAppControl?.touched).toBe(true);
      expect(descriptionControl?.touched).toBe(true);
    });

    it('should mark all batch controls as touched on invalid multi-batch submission', () => {
      component.toggleMultiCouponMode();
      const batch = component.batches.at(0);
      batch.patchValue({
        description: '',
        quantity: ''
      });
      
      component.onSubmit();
      
      expect(batch.get('description')?.touched).toBe(true);
      expect(batch.get('quantity')?.touched).toBe(true);
    });
  });
});
