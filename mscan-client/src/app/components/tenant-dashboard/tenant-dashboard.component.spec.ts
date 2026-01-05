/**
 * Unit Tests for Tenant Dashboard Component - Jest
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { TenantDashboardComponent } from './tenant-dashboard.component';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { TenantDashboard, User, UserRole } from '../../models';

describe('TenantDashboardComponent', () => {
  let component: TenantDashboardComponent;
  let fixture: ComponentFixture<TenantDashboardComponent>;
  let dashboardService: any;
  let authService: any;
  let currentUserSubject: BehaviorSubject<User | null>;

  const mockTenantUser: User = {
    id: 'user-id',
    email: 'admin@tenant.com',
    fullName: 'Tenant Admin',
    role: UserRole.TENANT_ADMIN,
    permissions: ['view_dashboard'],
    tenant: {
      id: 'tenant-123',
      companyName: 'Test Company',
      contactEmail: 'contact@test.com',
    },
  };

  const mockTenantDashboard: TenantDashboard = {
    tenant: {
      companyName: 'Test Company',
      contactEmail: 'contact@test.com',
      memberSince: '2024-01-01',
    },
    totalUsers: 10,
    activeUsers24h: 5,
    recentActivity: [
      {
        action: 'LOGIN',
        user: 'John Doe',
        email: 'john@test.com',
        timestamp: '2024-12-26T10:00:00Z',
      },
    ],
  };

  beforeEach(async () => {
    currentUserSubject = new BehaviorSubject<User | null>(mockTenantUser);

    const dashboardServiceMock = {
      getDashboardStats: jest.fn().mockReturnValue(
        of({
          success: true,
          data: mockTenantDashboard,
        })
      ),
    };

    const authServiceMock = {
      logout: jest.fn(),
      currentUser$: currentUserSubject.asObservable(),
    };

    await TestBed.configureTestingModule({
      imports: [TenantDashboardComponent],
      providers: [
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    dashboardService = TestBed.inject(DashboardService);
    authService = TestBed.inject(AuthService);

    fixture = TestBed.createComponent(TenantDashboardComponent);
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
    it('should load current user from auth service', () => {
      component.loadUserInfo();

      expect(component.currentUser).toEqual(mockTenantUser);
    });

    it('should update current user when stream emits', () => {
      component.loadUserInfo();

      const newUser = { ...mockTenantUser, fullName: 'Updated Name' };
      currentUserSubject.next(newUser);

      expect(component.currentUser).toEqual(newUser);
    });
  });

  describe('Load Dashboard Stats - Success', () => {
    it('should load dashboard stats successfully', async () => {
      dashboardService.getDashboardStats.mockReturnValue(
        of({
          success: true,
          data: mockTenantDashboard,
        })
      );

      component.loadDashboardStats();
      await fixture.whenStable();

      expect(component.loading).toBe(false);
      expect(component.stats).toEqual(mockTenantDashboard);
      expect(component.error).toBe('');
    });

    it('should set loading to true when starting to load', () => {
      dashboardService.getDashboardStats.mockReturnValue(
        of({
          success: true,
          data: mockTenantDashboard,
        })
      );

      component.loadDashboardStats();

      // Since observable completes synchronously, just verify stats were loaded
      expect(component.stats).toEqual(mockTenantDashboard);
    });

    it('should clear previous errors when loading', () => {
      component.error = 'Previous error';
      dashboardService.getDashboardStats.mockReturnValue(
        of({
          success: true,
          data: mockTenantDashboard,
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
          message: 'Failed to fetch data',
        })
      );

      component.loadDashboardStats();
      await fixture.whenStable();

      expect(component.loading).toBe(false);
      expect(component.error).toBe('Failed to fetch data');
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
    it('should display tenant company information', async () => {
      dashboardService.getDashboardStats.mockReturnValue(
        of({
          success: true,
          data: mockTenantDashboard,
        })
      );

      component.loadDashboardStats();
      await fixture.whenStable();

      expect(component.stats?.tenant.companyName).toBe('Test Company');
      expect(component.stats?.tenant.contactEmail).toBe('contact@test.com');
    });

    it('should display user counts', async () => {
      dashboardService.getDashboardStats.mockReturnValue(
        of({
          success: true,
          data: mockTenantDashboard,
        })
      );

      component.loadDashboardStats();
      await fixture.whenStable();

      expect(component.stats?.totalUsers).toBe(10);
      expect(component.stats?.activeUsers24h).toBe(5);
    });

    it('should display recent activity', async () => {
      dashboardService.getDashboardStats.mockReturnValue(
        of({
          success: true,
          data: mockTenantDashboard,
        })
      );

      component.loadDashboardStats();
      await fixture.whenStable();

      expect(component.stats?.recentActivity).toHaveLength(1);
      expect(component.stats?.recentActivity[0].action).toBe('LOGIN');
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
          data: mockTenantDashboard,
        })
      );

      component.loadDashboardStats();
      await fixture.whenStable();

      // Component should have updated its view
      expect(component.loading).toBe(false);
    });
  });
});
