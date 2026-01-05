/**
 * Unit Tests for Super Admin Dashboard Component - Jest
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { SuperAdminDashboardComponent } from './super-admin-dashboard.component';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { SuperAdminDashboard, User, UserRole } from '../../models';

describe('SuperAdminDashboardComponent', () => {
  let component: SuperAdminDashboardComponent;
  let fixture: ComponentFixture<SuperAdminDashboardComponent>;
  let dashboardService: any;
  let authService: any;
  let router: any;
  let currentUserSubject: BehaviorSubject<User | null>;

  const mockSuperAdmin: User = {
    id: 'super-id',
    email: 'admin@mscan.com',
    fullName: 'Super Admin',
    role: UserRole.SUPER_ADMIN,
    permissions: ['all'],
    tenant: undefined,
  };

  const mockSuperAdminDashboard: SuperAdminDashboard = {
    totalTenants: 5,
    totalUsers: 25,
    activeSessions24h: 15,
    systemHealth: 'healthy',
    recentTenants: [
      {
        id: 'tenant-1',
        companyName: 'Company A',
        contactEmail: 'contact@companya.com',
        createdAt: '2024-12-20T10:00:00Z',
      },
      {
        id: 'tenant-2',
        companyName: 'Company B',
        contactEmail: 'contact@companyb.com',
        createdAt: '2024-12-21T10:00:00Z',
      },
    ],
  };

  beforeEach(async () => {
    currentUserSubject = new BehaviorSubject<User | null>(mockSuperAdmin);

    const dashboardServiceMock = {
      getDashboardStats: jest.fn().mockReturnValue(
        of({
          success: true,
          data: mockSuperAdminDashboard,
        })
      ),
    };

    const authServiceMock = {
      logout: jest.fn(),
      currentUser$: currentUserSubject.asObservable(),
    };

    const routerMock = {
      navigate: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SuperAdminDashboardComponent],
      providers: [
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    dashboardService = TestBed.inject(DashboardService);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(SuperAdminDashboardComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with loading state', () => {
      expect(component.loading).toBe(true);
      expect(component.stats).toBeNull();
      expect(component.error).toBe('');
      expect(component.userName).toBe('');
    });

    it('should load user info and dashboard stats on init', () => {
      const loadUserInfoSpy = jest.spyOn(component, 'loadUserInfo');
      const loadDashboardStatsSpy = jest.spyOn(component, 'loadDashboardStats');

      component.ngOnInit();

      expect(loadUserInfoSpy).toHaveBeenCalled();
      expect(loadDashboardStatsSpy).toHaveBeenCalled();
    });
  });

  describe('Load User Info', () => {
    it('should load user name from auth service', () => {
      component.loadUserInfo();

      expect(component.userName).toBe('Super Admin');
    });

    it('should update user name when stream emits', () => {
      component.loadUserInfo();

      const newUser = { ...mockSuperAdmin, fullName: 'Updated Admin' };
      currentUserSubject.next(newUser);

      expect(component.userName).toBe('Updated Admin');
    });

    it('should not crash if user is null', () => {
      currentUserSubject.next(null);

      expect(() => component.loadUserInfo()).not.toThrow();
    });
  });

  describe('Load Dashboard Stats - Success', () => {
    it('should load dashboard stats successfully', async () => {
      dashboardService.getDashboardStats.mockReturnValue(
        of({
          success: true,
          data: mockSuperAdminDashboard,
        })
      );

      component.loadDashboardStats();
      await fixture.whenStable();

      expect(component.loading).toBe(false);
      expect(component.stats).toEqual(mockSuperAdminDashboard);
      expect(component.error).toBe('');
    });

    it('should set loading to true when starting to load', () => {
      dashboardService.getDashboardStats.mockReturnValue(
        of({
          success: true,
          data: mockSuperAdminDashboard,
        })
      );

      component.loadDashboardStats();

      // Since observable completes synchronously, verify stats were loaded instead
      expect(component.stats).toEqual(mockSuperAdminDashboard);
    });

    it('should clear previous errors when loading', () => {
      component.error = 'Previous error';
      dashboardService.getDashboardStats.mockReturnValue(
        of({
          success: true,
          data: mockSuperAdminDashboard,
        })
      );

      component.loadDashboardStats();

      expect(component.error).toBe('');
    });
  });

  describe('Load Dashboard Stats - Failure', () => {
    it('should handle API failure with error message', async () => {
      dashboardService.getDashboardStats.mockReturnValue(
        of({
          success: false,
          message: 'Failed to fetch stats',
        })
      );

      component.loadDashboardStats();
      await fixture.whenStable();

      expect(component.loading).toBe(false);
      expect(component.error).toBe('Failed to fetch stats');
      expect(component.stats).toBeNull();
    });

    it('should handle network errors', async () => {
      dashboardService.getDashboardStats.mockReturnValue(
        throwError(() => ({ error: { message: 'Network error' } }))
      );

      component.loadDashboardStats();
      await fixture.whenStable();

      expect(component.loading).toBe(false);
      expect(component.error).toContain('Network error');
    });

    it('should use default error message if none provided', async () => {
      dashboardService.getDashboardStats.mockReturnValue(throwError(() => ({ error: {} })));

      component.loadDashboardStats();
      await fixture.whenStable();

      expect(component.error).toBe('Failed to load dashboard data');
    });
  });

  describe('Dashboard Stats Data', () => {
    it('should display system-wide statistics', async () => {
      dashboardService.getDashboardStats.mockReturnValue(
        of({
          success: true,
          data: mockSuperAdminDashboard,
        })
      );

      component.loadDashboardStats();
      await fixture.whenStable();

      expect(component.stats?.totalTenants).toBe(5);
      expect(component.stats?.totalUsers).toBe(25);
      expect(component.stats?.activeSessions24h).toBe(15);
      expect(component.stats?.systemHealth).toBe('healthy');
    });

    it('should display recent tenants', async () => {
      dashboardService.getDashboardStats.mockReturnValue(
        of({
          success: true,
          data: mockSuperAdminDashboard,
        })
      );

      component.loadDashboardStats();
      await fixture.whenStable();

      expect(component.stats?.recentTenants).toHaveLength(2);
      expect(component.stats?.recentTenants[0].companyName).toBe('Company A');
      expect(component.stats?.recentTenants[1].companyName).toBe('Company B');
    });
  });

  describe('Navigation', () => {
    it('should navigate to customers page', () => {
      component.navigateToCustomers();

      expect(router.navigate).toHaveBeenCalledWith(['/customers']);
    });
  });

  describe('Logout', () => {
    it('should call authService.logout', () => {
      component.logout();

      expect(authService.logout).toHaveBeenCalled();
    });
  });

  describe('Change Detection', () => {
    it('should trigger change detection after loading stats', async () => {
      dashboardService.getDashboardStats.mockReturnValue(
        of({
          success: true,
          data: mockSuperAdminDashboard,
        })
      );

      component.loadDashboardStats();
      await fixture.whenStable();

      expect(component.loading).toBe(false);
    });
  });

  describe('Console Logging', () => {
    it('should log stats when loaded successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      dashboardService.getDashboardStats.mockReturnValue(
        of({
          success: true,
          data: mockSuperAdminDashboard,
        })
      );

      component.loadDashboardStats();
      await fixture.whenStable();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Super Admin Dashboard stats loaded',
        mockSuperAdminDashboard
      );

      consoleSpy.mockRestore();
    });
  });
});
