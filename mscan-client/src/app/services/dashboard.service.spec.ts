/**
 * Unit Tests for Dashboard Service - Jest
 */
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import { environment } from '../../environments/environment';
import { SuperAdminDashboard, TenantDashboard } from '../models';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DashboardService]
    });

    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('getDashboardStats - Super Admin', () => {
    const mockSuperAdminDashboard: SuperAdminDashboard = {
      totalTenants: 10,
      totalUsers: 50,
      activeSessions24h: 30,
      systemHealth: 'healthy',
      recentTenants: [
        {
          id: 'tenant-1',
          companyName: 'Company A',
          contactEmail: 'contact@companya.com',
          createdAt: '2024-12-20T10:00:00Z'
        },
        {
          id: 'tenant-2',
          companyName: 'Company B',
          contactEmail: 'contact@companyb.com',
          createdAt: '2024-12-21T10:00:00Z'
        }
      ]
    };

    it('should fetch super admin dashboard stats', async () => {
      const mockResponse = {
        success: true,
        data: mockSuperAdminDashboard
      };

      service.getDashboardStats().subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toEqual(mockSuperAdminDashboard);
        const data = response.data as SuperAdminDashboard;
        expect(data.totalTenants).toBe(10);
        expect(data.totalUsers).toBe(50);
        expect(data.systemHealth).toBe('healthy');
      });

      const req = httpMock.expectOne(`${apiUrl}/dashboard/stats`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include recent tenants in super admin stats', async () => {
      const mockResponse = {
        success: true,
        data: mockSuperAdminDashboard
      };

      service.getDashboardStats().subscribe(response => {
        const data = response.data as SuperAdminDashboard;
        expect(data.recentTenants).toHaveLength(2);
        expect(data.recentTenants[0].companyName).toBe('Company A');
      });

      const req = httpMock.expectOne(`${apiUrl}/dashboard/stats`);
      req.flush(mockResponse);
    });
  });

  describe('getDashboardStats - Tenant', () => {
    const mockTenantDashboard: TenantDashboard = {
      tenant: {
        companyName: 'Test Company',
        contactEmail: 'contact@test.com',
        memberSince: '2024-01-01'
      },
      totalUsers: 15,
      activeUsers24h: 8,
      recentActivity: [
        {
          action: 'LOGIN',
          user: 'John Doe',
          email: 'john@test.com',
          timestamp: '2024-12-26T10:00:00Z'
        },
        {
          action: 'LOGOUT',
          user: 'Jane Smith',
          email: 'jane@test.com',
          timestamp: '2024-12-26T09:30:00Z'
        }
      ]
    };

    it('should fetch tenant dashboard stats', async () => {
      const mockResponse = {
        success: true,
        data: mockTenantDashboard
      };

      service.getDashboardStats().subscribe(response => {
        expect(response.success).toBe(true);
        const data = response.data as TenantDashboard;
        expect(data.tenant.companyName).toBe('Test Company');
        expect(data.totalUsers).toBe(15);
        expect(data.activeUsers24h).toBe(8);
      });

      const req = httpMock.expectOne(`${apiUrl}/dashboard/stats`);
      req.flush(mockResponse);
    });

    it('should include recent activity in tenant stats', async () => {
      const mockResponse = {
        success: true,
        data: mockTenantDashboard
      };

      service.getDashboardStats().subscribe(response => {
        const data = response.data as TenantDashboard;
        expect(data.recentActivity).toHaveLength(2);
        expect(data.recentActivity[0].action).toBe('LOGIN');
        expect(data.recentActivity[1].action).toBe('LOGOUT');
      });

      const req = httpMock.expectOne(`${apiUrl}/dashboard/stats`);
      req.flush(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 unauthorized error', async () => {
      service.getDashboardStats().subscribe({
        error: (error) => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/dashboard/stats`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle 403 forbidden error', async () => {
      service.getDashboardStats().subscribe({
        error: (error) => {
          expect(error.status).toBe(403);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/dashboard/stats`);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    it('should handle 500 server error', async () => {
      service.getDashboardStats().subscribe({
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/dashboard/stats`);
      req.flush('Internal Server Error', { 
        status: 500, 
        statusText: 'Internal Server Error' 
      });
    });

    it('should handle network errors', async () => {
      service.getDashboardStats().subscribe({
        error: (error) => {
          expect(error.error).toBeInstanceOf(ProgressEvent);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/dashboard/stats`);
      req.error(new ProgressEvent('error'));
    });

    it('should handle API failure response', async () => {
      const mockResponse = {
        success: false,
        message: 'Failed to fetch dashboard data'
      };

      service.getDashboardStats().subscribe(response => {
        expect(response.success).toBe(false);
        expect(response.message).toBe('Failed to fetch dashboard data');
      });

      const req = httpMock.expectOne(`${apiUrl}/dashboard/stats`);
      req.flush(mockResponse);
    });
  });

  describe('API Configuration', () => {
    it('should use correct API endpoint', async () => {
      service.getDashboardStats().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/dashboard/stats`);
      expect(req.request.url).toBe(`${apiUrl}/dashboard/stats`);
      req.flush({ success: true });
    });

    it('should use GET method', async () => {
      service.getDashboardStats().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/dashboard/stats`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true });
    });
  });

  describe('Response Type Checking', () => {
    it('should handle both dashboard types in response', async () => {
      // This test verifies that the service can handle either SuperAdminDashboard or TenantDashboard
      const mockResponse = {
        success: true,
        data: {
          totalTenants: 5,
          totalUsers: 20,
          activeSessions24h: 10,
          systemHealth: 'healthy',
          recentTenants: []
        } as SuperAdminDashboard
      };

      service.getDashboardStats().subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
      });

      const req = httpMock.expectOne(`${apiUrl}/dashboard/stats`);
      req.flush(mockResponse);
    });
  });

  describe('Multiple Requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const mockResponse = {
        success: true,
        data: {
          totalTenants: 5,
          totalUsers: 20,
          activeSessions24h: 10,
          systemHealth: 'healthy',
          recentTenants: []
        }
      };

      let completedRequests = 0;
      const totalRequests = 3;

      for (let i = 0; i < totalRequests; i++) {
        service.getDashboardStats().subscribe(() => {
          completedRequests++;
          if (completedRequests === totalRequests) {
          }
        });
      }

      const requests = httpMock.match(`${apiUrl}/dashboard/stats`);
      expect(requests.length).toBe(totalRequests);
      requests.forEach(req => req.flush(mockResponse));
    });
  });
});
