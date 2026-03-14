import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { SubdomainService } from './subdomain.service';

describe('AuthService Subdomain Tests', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: { navigate: jest.Mock };
  let subdomainService: {
    getApiBaseUrl: jest.Mock;
    getCurrentSubdomain: jest.Mock;
    redirectToSubdomain: jest.Mock;
    redirectToRootDomain: jest.Mock;
  };

  beforeEach(() => {
    router = { navigate: jest.fn() };
    subdomainService = {
      getApiBaseUrl: jest.fn().mockReturnValue('http://test-tenant.localhost:3000/api'),
      getCurrentSubdomain: jest.fn(),
      redirectToSubdomain: jest.fn(),
      redirectToRootDomain: jest.fn()
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: router },
        { provide: SubdomainService, useValue: subdomainService }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('verifyOTP with subdomain redirect', () => {
    it('should redirect tenant user to subdomain after login', (done) => {
      const loginResponse = {
        success: true,
        data: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          userType: 'ADMIN',
          subdomain: 'test-tenant'
        }
      };

      subdomainService.getCurrentSubdomain.mockReturnValue(null);

      service.verifyOTP('test@example.com', '123456').subscribe(() => {
        expect(subdomainService.redirectToSubdomain).toHaveBeenCalledWith('test-tenant', '/tenant/dashboard');
        done();
      });

      const req = httpMock.expectOne('http://test-tenant.localhost:3000/api/auth/verify-otp');
      req.flush(loginResponse);
    });

    it('should not redirect if already on correct subdomain', (done) => {
      const loginResponse = {
        success: true,
        data: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          userType: 'ADMIN',
          subdomain: 'test-tenant'
        }
      };

      subdomainService.getCurrentSubdomain.mockReturnValue('test-tenant');

      service.verifyOTP('test@example.com', '123456').subscribe(() => {
        expect(subdomainService.redirectToSubdomain).not.toHaveBeenCalled();
        done();
      });

      const req = httpMock.expectOne('http://test-tenant.localhost:3000/api/auth/verify-otp');
      req.flush(loginResponse);
    });

    it('should not redirect super admin', (done) => {
      const loginResponse = {
        success: true,
        data: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          userType: 'SUPER_ADMIN',
          subdomain: null
        }
      };

      service.verifyOTP('admin@example.com', '123456').subscribe(() => {
        expect(subdomainService.redirectToSubdomain).not.toHaveBeenCalled();
        done();
      });

      const req = httpMock.expectOne('http://test-tenant.localhost:3000/api/auth/verify-otp');
      req.flush(loginResponse);
    });

    it('should store subdomain in localStorage', (done) => {
      const loginResponse = {
        success: true,
        data: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          userType: 'ADMIN',
          subdomain: 'test-tenant'
        }
      };

      subdomainService.getCurrentSubdomain.mockReturnValue('test-tenant');

      service.verifyOTP('test@example.com', '123456').subscribe(() => {
        expect(localStorage.getItem('tms_tenant_subdomain')).toBe('test-tenant');
        done();
      });

      const req = httpMock.expectOne('http://test-tenant.localhost:3000/api/auth/verify-otp');
      req.flush(loginResponse);
    });
  });

  describe('logout with subdomain', () => {
    it('should redirect to root domain if on subdomain', () => {
      localStorage.setItem('tms_tenant_subdomain', 'test-tenant');
      localStorage.setItem('tms_refresh_token', 'test-refresh-token');
      subdomainService.getCurrentSubdomain.mockReturnValue('test-tenant');

      service.logout();

      expect(subdomainService.redirectToRootDomain).toHaveBeenCalledWith('/login');
    });

    it('should navigate normally if on root domain', () => {
      localStorage.setItem('tms_refresh_token', 'test-refresh-token');
      subdomainService.getCurrentSubdomain.mockReturnValue(null);

      service.logout();

      expect(router.navigate).toHaveBeenCalledWith(['/login']);
      expect(subdomainService.redirectToRootDomain).not.toHaveBeenCalled();
    });

    it('should clear subdomain from localStorage', () => {
      localStorage.setItem('tms_tenant_subdomain', 'test-tenant');
      localStorage.setItem('tms_refresh_token', 'test-refresh-token');
      subdomainService.getCurrentSubdomain.mockReturnValue(null);

      service.logout();

      expect(localStorage.getItem('tms_tenant_subdomain')).toBeNull();
    });
  });

  describe('subdomain validation on init', () => {
    it('should redirect if subdomain mismatch detected', () => {
      localStorage.setItem('tms_access_token', 'test-token');
      localStorage.setItem('tms_tenant_subdomain', 'correct-tenant');
      subdomainService.getCurrentSubdomain.mockReturnValue('wrong-tenant');

      // Create new service instance to trigger constructor
      const newService = new AuthService(TestBed.inject(HttpClientTestingModule) as any, router as any, subdomainService as any);

      expect(subdomainService.redirectToSubdomain).toHaveBeenCalledWith('correct-tenant', expect.any(String));
    });

    it('should not redirect if subdomains match', () => {
      localStorage.setItem('tms_access_token', 'test-token');
      localStorage.setItem('tms_tenant_subdomain', 'test-tenant');
      subdomainService.getCurrentSubdomain.mockReturnValue('test-tenant');

      const newService = new AuthService(TestBed.inject(HttpClientTestingModule) as any, router as any, subdomainService as any);

      expect(subdomainService.redirectToSubdomain).not.toHaveBeenCalled();
    });
  });

  describe('getTenantSubdomain', () => {
    it('should return subdomain from localStorage', () => {
      localStorage.setItem('tms_tenant_subdomain', 'my-tenant');

      const subdomain = service.getTenantSubdomain();

      expect(subdomain).toBe('my-tenant');
    });

    it('should return null if no subdomain stored', () => {
      const subdomain = service.getTenantSubdomain();

      expect(subdomain).toBeNull();
    });
  });
});
