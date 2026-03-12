import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { subdomainGuard } from './subdomain.guard';
import { SubdomainService } from '../services/subdomain.service';
import { AuthService } from '../services/auth.service';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

describe('SubdomainGuard', () => {
  let subdomainService: {
    getCurrentSubdomain: jest.Mock;
    redirectToSubdomain: jest.Mock;
  };
  let authService: {
    isLoggedIn: jest.Mock;
    getCurrentUser: jest.Mock;
    getUserType: jest.Mock;
    getTenantSubdomain: jest.Mock;
  };
  let router: { navigate: jest.Mock };
  let routeSnapshot: ActivatedRouteSnapshot;
  let stateSnapshot: RouterStateSnapshot;

  beforeEach(() => {
    subdomainService = {
      getCurrentSubdomain: jest.fn(),
      redirectToSubdomain: jest.fn()
    };
    authService = {
      isLoggedIn: jest.fn(),
      getCurrentUser: jest.fn(),
      getUserType: jest.fn(),
      getTenantSubdomain: jest.fn()
    };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: SubdomainService, useValue: subdomainService },
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    });

    routeSnapshot = {} as ActivatedRouteSnapshot;
    stateSnapshot = { url: '/tenant/dashboard' } as RouterStateSnapshot;
  });

  it('should allow access if not authenticated', () => {
    authService.isLoggedIn.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      subdomainGuard(routeSnapshot, stateSnapshot)
    );

    expect(result).toBe(true);
  });

  it('should allow super admin from any domain', () => {
    authService.isLoggedIn.mockReturnValue(true);
    authService.getCurrentUser.mockReturnValue({ role: 'SUPER_ADMIN' } as any);
    authService.getUserType.mockReturnValue('SUPER_ADMIN');
    subdomainService.getCurrentSubdomain.mockReturnValue(null);

    const result = TestBed.runInInjectionContext(() =>
      subdomainGuard(routeSnapshot, stateSnapshot)
    );

    expect(result).toBe(true);
  });

  it('should allow tenant user on correct subdomain', () => {
    authService.isLoggedIn.mockReturnValue(true);
    authService.getCurrentUser.mockReturnValue({ role: 'ADMIN' } as any);
    authService.getUserType.mockReturnValue('ADMIN');
    authService.getTenantSubdomain.mockReturnValue('test-tenant');
    subdomainService.getCurrentSubdomain.mockReturnValue('test-tenant');

    const result = TestBed.runInInjectionContext(() =>
      subdomainGuard(routeSnapshot, stateSnapshot)
    );

    expect(result).toBe(true);
  });

  it('should redirect tenant user to correct subdomain if mismatch', () => {
    authService.isLoggedIn.mockReturnValue(true);
    authService.getCurrentUser.mockReturnValue({ role: 'ADMIN' } as any);
    authService.getUserType.mockReturnValue('ADMIN');
    authService.getTenantSubdomain.mockReturnValue('correct-tenant');
    subdomainService.getCurrentSubdomain.mockReturnValue('wrong-tenant');

    const result = TestBed.runInInjectionContext(() =>
      subdomainGuard(routeSnapshot, stateSnapshot)
    );

    expect(result).toBe(false);
    expect(subdomainService.redirectToSubdomain).toHaveBeenCalledWith('correct-tenant', '/tenant/dashboard');
  });

  it('should redirect to unauthorized if user has no subdomain', () => {
    authService.isLoggedIn.mockReturnValue(true);
    authService.getCurrentUser.mockReturnValue({ role: 'ADMIN' } as any);
    authService.getUserType.mockReturnValue('ADMIN');
    authService.getTenantSubdomain.mockReturnValue(null);
    subdomainService.getCurrentSubdomain.mockReturnValue('some-subdomain');

    const result = TestBed.runInInjectionContext(() =>
      subdomainGuard(routeSnapshot, stateSnapshot)
    );

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/unauthorized']);
  });

  it('should block tenant user on root domain', () => {
    authService.isLoggedIn.mockReturnValue(true);
    authService.getCurrentUser.mockReturnValue({ role: 'ADMIN' } as any);
    authService.getUserType.mockReturnValue('ADMIN');
    authService.getTenantSubdomain.mockReturnValue('tenant-slug');
    subdomainService.getCurrentSubdomain.mockReturnValue(null);

    const result = TestBed.runInInjectionContext(() =>
      subdomainGuard(routeSnapshot, stateSnapshot)
    );

    expect(result).toBe(false);
    expect(subdomainService.redirectToSubdomain).toHaveBeenCalledWith('tenant-slug', '/tenant/dashboard');
  });

  it('should handle employee role', () => {
    authService.isLoggedIn.mockReturnValue(true);
    authService.getCurrentUser.mockReturnValue({ role: 'EMPLOYEE' } as any);
    authService.getUserType.mockReturnValue('EMPLOYEE');
    authService.getTenantSubdomain.mockReturnValue('employee-tenant');
    subdomainService.getCurrentSubdomain.mockReturnValue('employee-tenant');

    const result = TestBed.runInInjectionContext(() =>
      subdomainGuard(routeSnapshot, stateSnapshot)
    );

    expect(result).toBe(true);
  });
});
