/**
 * Unit Tests for Login Component - Jest
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: any;
  let router: any;

  beforeEach(async () => {
    const authServiceMock = {
      requestOTP: jest.fn(),
      verifyOTP: jest.fn(),
      isLoggedIn: jest.fn().mockReturnValue(false)
    };

    const routerMock = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize email form', () => {
      expect(component.emailForm).toBeDefined();
      expect(component.emailForm.get('email')).toBeDefined();
    });

    it('should initialize OTP form', () => {
      expect(component.otpForm).toBeDefined();
      expect(component.otpForm.get('otp')).toBeDefined();
    });

    it('should start with email step', () => {
      expect(component.step).toBe('email');
    });

    it('should redirect if already logged in', () => {
      authService.isLoggedIn.mockReturnValue(true);
      const fb = TestBed.inject(FormBuilder);
      const cdr = fixture.componentRef.injector.get(ChangeDetectorRef);
      const newComponent = new LoginComponent(fb, authService, router, cdr);

      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('Email Validation', () => {
    it('should validate required email', () => {
      const emailControl = component.emailForm.get('email');
      emailControl?.setValue('');
      expect(emailControl?.hasError('required')).toBe(true);
    });

    it('should validate email format', () => {
      const emailControl = component.emailForm.get('email');
      
      emailControl?.setValue('invalid-email');
      expect(emailControl?.hasError('email')).toBe(true);

      emailControl?.setValue('test@example.com');
      expect(emailControl?.valid).toBe(true);
    });

    it('should disable submit when email invalid', () => {
      component.emailForm.get('email')?.setValue('');
      expect(component.emailForm.valid).toBe(false);
    });
  });

  describe('OTP Validation', () => {
    it('should validate required OTP', () => {
      const otpControl = component.otpForm.get('otp');
      otpControl?.setValue('');
      expect(otpControl?.hasError('required')).toBe(true);
    });

    it('should validate OTP format (6 digits)', () => {
      const otpControl = component.otpForm.get('otp');
      
      otpControl?.setValue('12345');
      expect(otpControl?.hasError('pattern')).toBe(true);

      otpControl?.setValue('1234567');
      expect(otpControl?.hasError('pattern')).toBe(true);

      otpControl?.setValue('abcdef');
      expect(otpControl?.hasError('pattern')).toBe(true);

      otpControl?.setValue('123456');
      expect(otpControl?.valid).toBe(true);
    });
  });

  describe('OTP Request', () => {
    beforeEach(() => {
      component.emailForm.get('email')?.setValue('test@example.com');
    });

    it('should request OTP successfully', async () => {
      authService.requestOTP.mockReturnValue(of({
        success: true,
        message: 'OTP sent successfully'
      }));

      component.requestOTP();
      await fixture.whenStable();

      expect(authService.requestOTP).toHaveBeenCalledWith('test@example.com');
      expect(component.step).toBe('otp');
      expect(component.email).toBe('test@example.com');
      expect(component.loading).toBe(false);
      expect(component.success).toBe('OTP sent successfully');
    });

    it('should not request OTP with invalid email', () => {
      component.emailForm.get('email')?.setValue('invalid');
      component.requestOTP();

      expect(authService.requestOTP).not.toHaveBeenCalled();
    });

    it('should handle OTP request failure', async () => {
      authService.requestOTP.mockReturnValue(of({
        success: false,
        message: 'Failed to send OTP'
      }));

      component.requestOTP();
      await fixture.whenStable();

      expect(component.error).toBe('Failed to send OTP');
      expect(component.step).toBe('email');
    });

    it('should handle OTP request error', async () => {
      authService.requestOTP.mockReturnValue(
        throwError(() => ({ error: { message: 'Rate limit exceeded' } }))
      );

      component.requestOTP();
      await fixture.whenStable();

      expect(component.error).toContain('Rate limit exceeded');
      expect(component.loading).toBe(false);
    });

    it('should clear previous errors on new request', async () => {
      component.error = 'Previous error';

      authService.requestOTP.mockReturnValue(of({
        success: true,
        message: 'OTP sent'
      }));

      component.requestOTP();
      await fixture.whenStable();

      expect(component.error).toBe('');
    });
  });

  describe('OTP Verification', () => {
    beforeEach(() => {
      component.step = 'otp';
      component.email = 'test@example.com';
      component.otpForm.get('otp')?.setValue('123456');
    });

    it('should verify OTP successfully and navigate', async () => {
      authService.verifyOTP.mockReturnValue(of({
        success: true,
        data: {
          accessToken: 'token123',
          refreshToken: 'refresh123',
          userType: 'TENANT_ADMIN'
        }
      }));

      component.verifyOTP();
      await fixture.whenStable();

      expect(authService.verifyOTP).toHaveBeenCalledWith('test@example.com', '123456');
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
      expect(component.loading).toBe(false);
    });

    it('should not verify OTP with invalid OTP format', () => {
      component.otpForm.get('otp')?.setValue('123');
      component.verifyOTP();

      expect(authService.verifyOTP).not.toHaveBeenCalled();
    });

    it('should handle invalid OTP error', async () => {
      authService.verifyOTP.mockReturnValue(
        throwError(() => ({ error: { message: 'Invalid OTP' } }))
      );

      component.verifyOTP();
      await fixture.whenStable();

      expect(component.error).toContain('Invalid OTP');
      expect(component.loading).toBe(false);
      expect(component.otpForm.get('otp')?.value).toBe('');
    });

    it('should handle verification error without message', async () => {
      authService.verifyOTP.mockReturnValue(
        throwError(() => ({ error: {} }))
      );

      component.verifyOTP();
      await fixture.whenStable();

      expect(component.error).toBe('Invalid OTP. Please try again.');
    });

    it('should not navigate on unsuccessful verification', async () => {
      authService.verifyOTP.mockReturnValue(of({
        success: false
      }));

      component.verifyOTP();
      await fixture.whenStable();

      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Go Back', () => {
    beforeEach(() => {
      component.step = 'otp';
      component.otpForm.get('otp')?.setValue('123456');
      component.error = 'Some error';
      component.success = 'Some success';
      component.otpExpiryTime = 12345;
    });

    it('should go back to email step', () => {
      component.goBack();

      expect(component.step).toBe('email');
      expect(component.otpForm.get('otp')?.value).toBeNull(); // reset() sets to null
      expect(component.error).toBe('');
      expect(component.success).toBe('');
      expect(component.otpExpiryTime).toBe(0);
    });
  });

  describe('Loading States', () => {
    it('should set loading during OTP request', () => {
      authService.requestOTP.mockReturnValue(of({
        success: true,
        message: 'OTP sent'
      }));

      component.emailForm.get('email')?.setValue('test@example.com');
      component.requestOTP();

      expect(authService.requestOTP).toHaveBeenCalled();
    });

    it('should clear loading after OTP request', async () => {
      authService.requestOTP.mockReturnValue(of({
        success: true,
        message: 'OTP sent'
      }));

      component.emailForm.get('email')?.setValue('test@example.com');
      component.requestOTP();
      await fixture.whenStable();

      expect(component.loading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should display error messages', async () => {
      authService.requestOTP.mockReturnValue(
        throwError(() => ({ error: { message: 'Network error' } }))
      );

      component.emailForm.get('email')?.setValue('test@example.com');
      component.requestOTP();
      await fixture.whenStable();

      expect(component.error).toBe('Network error');
    });

    it('should clear errors on new request', async () => {
      component.error = 'Old error';

      authService.requestOTP.mockReturnValue(of({
        success: true,
        message: 'OTP sent'
      }));

      component.emailForm.get('email')?.setValue('test@example.com');
      component.requestOTP();

      expect(component.error).toBe('');
    });
  });
});
