/**
 * Unit Tests for Dashboard Component - Jest
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, BehaviorSubject } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { User, UserRole } from '../../models';
import { ChangeDetectorRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let authService: any;
  let dashboardService: any;
  let router: any;
  let currentUserSubject: BehaviorSubject<User | null>;

  const mockSuperAdmin: User = {
    id: 'super-id',
    email: 'admin@mscan.com',
    full_name: 'Super Admin',
    role: UserRole.SUPER_ADMIN,
    permissions: ['all'],
    tenant: undefined
  };

  const mockTenantAdmin: User = {
    id: 'tenant-id',
    email: 'admin@tenant.com',
    full_name: 'Tenant Admin',
    role: UserRole.TENANT_ADMIN,
    permissions: ['view_dashboard'],
    tenant: {
      id: 'tenant-123',
      companyName: 'Test Company',
      contactEmail: 'contact@test.com'
    }
  };

  const mockDashboardStats = {
    totalCustomers: 10,
    activeCustomers: 8,
    totalUsers: 50,
    recentActivity: []
  };

  beforeEach(async () => {
    currentUserSubject = new BehaviorSubject<User | null>(null);

    const authServiceMock = {
      isLoggedIn: jest.fn().mockReturnValue(true),
      logout: jest.fn(),
      currentUser$: currentUserSubject.asObservable()
    };

    const dashboardServiceMock = {
      getDashboardStats: jest.fn().mockReturnValue(of(mockDashboardStats))
    };

    const routerMock = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: Router, useValue: routerMock },
        provideHttpClient(),
        provideHttpClientTesting()
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    dashboardService = TestBed.inject(DashboardService);
    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with loading state', () => {
      expect(component.loading).toBe(true);
      expect(component.isSuperAdmin).toBe(false);
    });

    it('should redirect to login if not logged in', () => {
      authService.isLoggedIn.mockReturnValue(false);
      
      component.ngOnInit();

      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('Super Admin Dashboard', () => {
    it('should display super admin dashboard for SUPER_ADMIN role', async () => {
      fixture.detectChanges();
      currentUserSubject.next(mockSuperAdmin);

      await fixture.whenStable();

      expect(component.isSuperAdmin).toBe(true);
      expect(component.loading).toBe(false);
    });

    it('should set loading to false after user data loads', async () => {
      fixture.detectChanges();
      
      expect(component.loading).toBe(true);
      
      currentUserSubject.next(mockSuperAdmin);
      await fixture.whenStable();

      expect(component.loading).toBe(false);
    });
  });

  describe('Tenant Dashboard', () => {
    it('should display tenant dashboard for TENANT_ADMIN role', async () => {
      fixture.detectChanges();
      currentUserSubject.next(mockTenantAdmin);

      await fixture.whenStable();

      expect(component.isSuperAdmin).toBe(false);
      expect(component.loading).toBe(false);
    });

    it('should display tenant dashboard for TENANT_USER role', async () => {
      const tenantUser = { ...mockTenantAdmin, role: 'TENANT_USER' as any };
      fixture.detectChanges();
      currentUserSubject.next(tenantUser);

      await fixture.whenStable();

      expect(component.isSuperAdmin).toBe(false);
      expect(component.loading).toBe(false);
    });
  });

  describe('Logout', () => {
    it('should call authService.logout', () => {
      component.logout();

      expect(authService.logout).toHaveBeenCalled();
    });
  });

  describe('User Stream Handling', () => {
    it('should only take first user value', async () => {
      fixture.detectChanges();

      currentUserSubject.next(mockSuperAdmin);
      await fixture.whenStable();

      const firstState = component.isSuperAdmin;
      
      // Try to emit another value
      currentUserSubject.next(mockTenantAdmin);
      await fixture.whenStable();

      // Should not change since we use take(1)
      expect(component.isSuperAdmin).toBe(firstState);
    });

    it('should filter out null users before processing', async () => {
      fixture.detectChanges();

      currentUserSubject.next(null);
      await fixture.whenStable();

      // Should still be loading since null is filtered
      expect(component.loading).toBe(true);

      currentUserSubject.next(mockSuperAdmin);
      await fixture.whenStable();

      expect(component.loading).toBe(false);
    });
  });
});
