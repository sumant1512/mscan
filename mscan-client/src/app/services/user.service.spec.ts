/**
 * Unit Tests for User Service - Jest
 */
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { environment } from '../../environments/environment';
import { CreateCustomerRequest, Customer, User, UserRole } from '../models';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService]
    });

    service = TestBed.inject(UserService);
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

  describe('createCustomer', () => {
    const mockCustomerRequest: CreateCustomerRequest = {
      companyName: 'Test Company',
      adminEmail: 'admin@test.com',
      adminName: 'Test Admin',
      contactPhone: '+1234567890',
      address: '123 Test St'
    };

    it('should create a customer successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Customer created successfully'
      };

      service.createCustomer(mockCustomerRequest).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/users/customers`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockCustomerRequest);
      req.flush(mockResponse);
    });

    it('should handle customer creation error', async () => {
      const errorMessage = 'Email already exists';

      service.createCustomer(mockCustomerRequest).subscribe({
        error: (error) => {
          expect(error.error).toBe(errorMessage);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/users/customers`);
      req.flush(errorMessage, { status: 400, statusText: 'Bad Request' });
    });

    it('should send correct headers for customer creation', async () => {
      service.createCustomer(mockCustomerRequest).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/users/customers`);
      expect(req.request.headers.has('Content-Type')).toBe(false); // Angular sets this automatically
      req.flush({ success: true });
    });
  });

  describe('getAllCustomers', () => {
    const mockCustomers: Customer[] = [
      {
        id: 'customer-1',
        companyName: 'Company A',
        contactEmail: 'contact@companya.com',
        contactPhone: '+1234567890',
        address: '123 Street',
        isActive: true,
        userCount: 5,
        createdAt: '2024-12-01'
      },
      {
        id: 'customer-2',
        companyName: 'Company B',
        contactEmail: 'contact@companyb.com',
        isActive: true,
        userCount: 3,
        createdAt: '2024-12-15'
      }
    ];

    it('should fetch all customers successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockCustomers
      };

      service.getAllCustomers().subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toEqual(mockCustomers);
        expect(response.data?.length).toBe(2);
      });

      const req = httpMock.expectOne(`${apiUrl}/users/customers`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle empty customer list', async () => {
      const mockResponse = {
        success: true,
        data: []
      };

      service.getAllCustomers().subscribe(response => {
        expect(response.data).toEqual([]);
        expect(response.data?.length).toBe(0);
      });

      const req = httpMock.expectOne(`${apiUrl}/users/customers`);
      req.flush(mockResponse);
    });

    it('should handle authorization error', async () => {
      service.getAllCustomers().subscribe({
        error: (error) => {
          expect(error.status).toBe(403);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/users/customers`);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('getUserProfile', () => {
    const mockUser: User = {
      id: 'user-123',
      email: 'user@test.com',
      fullName: 'Test User',
      phone: '+1234567890',
      role: UserRole.TENANT_ADMIN,
      permissions: ['view_dashboard'],
      tenant: {
        id: 'tenant-123',
        companyName: 'Test Company',
        contactEmail: 'contact@test.com'
      }
    };

    it('should fetch user profile successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockUser
      };

      service.getUserProfile().subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toEqual(mockUser);
        expect(response.data?.email).toBe('user@test.com');
      });

      const req = httpMock.expectOne(`${apiUrl}/users/profile`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle unauthorized access', async () => {
      service.getUserProfile().subscribe({
        error: (error) => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/users/profile`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('updateUserProfile', () => {
    const updateData = {
      fullName: 'Updated Name',
      phone: '+9876543210'
    };

    const mockUpdatedUser: User = {
      id: 'user-123',
      email: 'user@test.com',
      fullName: 'Updated Name',
      phone: '+9876543210',
      role: UserRole.TENANT_ADMIN,
      permissions: ['view_dashboard'],
      tenant: {
        id: 'tenant-123',
        companyName: 'Test Company',
        contactEmail: 'contact@test.com'
      }
    };

    it('should update user profile successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockUpdatedUser
      };

      service.updateUserProfile(updateData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data?.fullName).toBe('Updated Name');
        expect(response.data?.phone).toBe('+9876543210');
      });

      const req = httpMock.expectOne(`${apiUrl}/users/profile`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush(mockResponse);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { fullName: 'Just Name' };

      service.updateUserProfile(partialUpdate).subscribe(response => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`${apiUrl}/users/profile`);
      expect(req.request.body).toEqual(partialUpdate);
      req.flush({ success: true, data: mockUpdatedUser });
    });

    it('should handle update validation errors', async () => {
      const errorMessage = 'Phone number invalid';

      service.updateUserProfile(updateData).subscribe({
        error: (error) => {
          expect(error.error).toBe(errorMessage);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/users/profile`);
      req.flush(errorMessage, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('HTTP Error Handling', () => {
    it('should handle network errors', async () => {
      service.getUserProfile().subscribe({
        error: (error) => {
          expect(error.error).toBeInstanceOf(ProgressEvent);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/users/profile`);
      req.error(new ProgressEvent('error'));
    });

    it('should handle server errors', async () => {
      service.getAllCustomers().subscribe({
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/users/customers`);
      req.flush('Internal Server Error', { 
        status: 500, 
        statusText: 'Internal Server Error' 
      });
    });
  });

  describe('API URL Configuration', () => {
    it('should use correct API base URL', async () => {
      service.getUserProfile().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/users/profile`);
      expect(req.request.url).toBe(`${apiUrl}/users/profile`);
      req.flush({ success: true });
    });
  });
});
