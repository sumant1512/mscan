import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { subdomainGuard } from './subdomain.guard';
import { SubdomainService } from '../services/subdomain.service';
import { AuthService } from '../services/auth.service';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

describe('SubdomainGuard', () => {
  let subdomainService: jasmine.SpyObj<SubdomainService>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let routeSnapshot: ActivatedRouteSnapshot;
  let stateSnapshot: RouterStateSnapshot;

  beforeEach(() => {
    const subdomainServiceSpy = jasmine.createSpyObj('SubdomainService', ['getCurrentSubdomain', 'redirectToSubdomain']);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isLoggedIn', 'getCurrentUser', 'getUserType', 'getTenantSubdomain']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: SubdomainService, useValue: subdomainServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    subdomainService = TestBed.inject(SubdomainService) as jasmine.SpyObj<SubdomainService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    
    routeSnapshot = {} as ActivatedRouteSnapshot;
    stateSnapshot = { url: '/tenant/dashboard' } as RouterStateSnapshot;
  });

  it('should allow access if not authenticated', () => {
    authService.isLoggedIn.and.returnValue(false);
    
    const result = TestBed.runInInjectionContext(() => 
      subdomainGuard(routeSnapshot, stateSnapshot)
    );

    expect(result).toBe(true);
  });

  it('should allow super admin from any domain', () => {
    authService.isLoggedIn.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({ role: 'SUPER_ADMIN' } as any);
    authService.getUserType.and.returnValue('SUPER_ADMIN');
    subdomainService.getCurrentSubdomain.and.returnValue(null);

    const result = TestBed.runInInjectionContext(() => 
      subdomainGuard(routeSnapshot, stateSnapshot)
    );

    expect(result).toBe(true);
  });

  it('should allow tenant user on correct subdomain', () => {
    authService.isLoggedIn.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({ role: 'ADMIN' } as any);
    authService.getUserType.and.returnValue('ADMIN');
    authService.getTenantSubdomain.and.returnValue('test-tenant');
    subdomainService.getCurrentSubdomain.and.returnValue('test-tenant');

    const result = TestBed.runInInjectionContext(() => 
      subdomainGuard(routeSnapshot, stateSnapshot)
    );

    expect(result).toBe(true);
  });

  it('should redirect tenant user to correct subdomain if mismatch', () => {
    authService.isLoggedIn.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({ role: 'ADMIN' } as any);
    authService.getUserType.and.returnValue('ADMIN');
    authService.getTenantSubdomain.and.returnValue('correct-tenant');
    subdomainService.getCurrentSubdomain.and.returnValue('wrong-tenant');

    const result = TestBed.runInInjectionContext(() => 
      subdomainGuard(routeSnapshot, stateSnapshot)
    );

    expect(result).toBe(false);
    expect(subdomainService.redirectToSubdomain).toHaveBeenCalledWith('correct-tenant', '/tenant/dashboard');
  });

  it('should redirect to unauthorized if user has no subdomain', () => {
    authService.isLoggedIn.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({ role: 'ADMIN' } as any);
    authService.getUserType.and.returnValue('ADMIN');
    authService.getTenantSubdomain.and.returnValue(null);
    subdomainService.getCurrentSubdomain.and.returnValue('some-subdomain');

    const result = TestBed.runInInjectionContext(() => 
      subdomainGuard(routeSnapshot, stateSnapshot)
    );

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/unauthorized']);
  });

  it('should block tenant user on root domain', () => {
    authService.isLoggedIn.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({ role: 'ADMIN' } as any);
    authService.getUserType.and.returnValue('ADMIN');
    authService.getTenantSubdomain.and.returnValue('tenant-slug');
    subdomainService.getCurrentSubdomain.and.returnValue(null);

    const result = TestBed.runInInjectionContext(() => 
      subdomainGuard(routeSnapshot, stateSnapshot)
    );

    expect(result).toBe(false);
    expect(subdomainService.redirectToSubdomain).toHaveBeenCalledWith('tenant-slug', '/tenant/dashboard');
  });

  it('should handle employee role', () => {
    authService.isLoggedIn.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({ role: 'EMPLOYEE' } as any);
    authService.getUserType.and.returnValue('EMPLOYEE');
    authService.getTenantSubdomain.and.returnValue('employee-tenant');
    subdomainService.getCurrentSubdomain.and.returnValue('employee-tenant');

    const result = TestBed.runInInjectionContext(() => 
      subdomainGuard(routeSnapshot, stateSnapshot)
    );

    expect(result).toBe(true);
  });
});
