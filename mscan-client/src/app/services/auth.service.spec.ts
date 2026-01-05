/**
 * Unit Tests for Authentication Service
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { UserRole } from '../models';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    fullName: 'Test User',
    role: 'TENANT_ADMIN',
    tenantId: '223e4567-e89b-12d3-a456-426614174000'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('requestOTP', () => {
    it('should send OTP request', async () => {
      const email = 'test@example.com';

      const promise = service.requestOTP(email).toPromise();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/request-otp`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email });

      req.flush({ success: true, message: 'OTP sent' });
      
      const response = await promise;
      expect(response?.success).toBe(true);
    });

    it('should handle OTP request errors', async () => {
      const email = 'test@example.com';

      const promise = service.requestOTP(email).toPromise();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/request-otp`);
      req.flush({ success: false, message: 'Rate limit exceeded' }, { status: 429, statusText: 'Too Many Requests' });
      
      await expect(promise).rejects.toMatchObject({ status: 429 });
    });
  });

  describe('verifyOTP', () => {
    it('should verify OTP and store tokens', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      const mockResponse = {
        success: true,
        data: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          userType: 'TENANT_ADMIN'
        }
      };
      const mockUserContext = {
        success: true,
        data: {
          id: 1,
          email: 'test@example.com',
          fullName: 'Test User',
          role: UserRole.TENANT_ADMIN,
          isActive: true
        }
      };

      const promise = service.verifyOTP(email, otp).toPromise();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/verify-otp`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email, otp });

      req.flush(mockResponse);

      // Expect the loadUserContext call
      const contextReq = httpMock.expectOne(`${environment.apiUrl}/auth/context`);
      contextReq.flush(mockUserContext);
      
      const response = await promise;
      expect(response?.success).toBe(true);
      expect(localStorage.getItem('tms_access_token')).toBe('mock-access-token');
      expect(localStorage.getItem('tms_refresh_token')).toBe('mock-refresh-token');
    });

    it('should handle invalid OTP', async () => {
      const email = 'test@example.com';
      const otp = '000000';

      const promise = service.verifyOTP(email, otp).toPromise();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/verify-otp`);
      req.flush({ success: false, message: 'Invalid OTP' }, { status: 401, statusText: 'Unauthorized' });
      
      await expect(promise).rejects.toMatchObject({ status: 401 });
      expect(localStorage.getItem('tms_access_token')).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token', async () => {
      localStorage.setItem('tms_refresh_token', 'old-refresh-token');

      const mockResponse = {
        success: true,
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        }
      };

      const promise = service.refreshToken().toPromise();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'old-refresh-token' });

      req.flush(mockResponse);
      
      const response = await promise;
      expect(response?.success).toBe(true);
      expect(localStorage.getItem('tms_access_token')).toBe('new-access-token');
      expect(localStorage.getItem('tms_refresh_token')).toBe('new-refresh-token');
    });

    it('should handle refresh token failure', async () => {
      localStorage.setItem('tms_refresh_token', 'invalid-token');

      const promise = service.refreshToken().toPromise();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      req.flush({ success: false, message: 'Invalid refresh token' }, { status: 401, statusText: 'Unauthorized' });
      
      await expect(promise).rejects.toMatchObject({ status: 401 });
    });
  });

  describe('logout', () => {
    it('should logout and clear tokens', () => {
      localStorage.setItem('tms_access_token', 'mock-access-token');
      localStorage.setItem('tms_refresh_token', 'mock-refresh-token');

      service.logout();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true, message: 'Logged out' });

      expect(localStorage.getItem('tms_access_token')).toBeNull();
      expect(localStorage.getItem('tms_refresh_token')).toBeNull();
    });
  });

  describe('Token Management', () => {
    it('should get access token from localStorage', () => {
      localStorage.setItem('tms_access_token', 'test-token');
      expect(service.getAccessToken()).toBe('test-token');
    });

    it('should return null when no access token', () => {
      expect(service.getAccessToken()).toBeNull();
    });

    it('should check if user is logged in', () => {
      expect(service.isLoggedIn()).toBe(false);

      localStorage.setItem('tms_access_token', 'test-token');
      expect(service.isLoggedIn()).toBe(true);
    });
  });
});
