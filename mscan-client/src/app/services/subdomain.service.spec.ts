import { TestBed } from '@angular/core/testing';
import { SubdomainService } from './subdomain.service';
import { environment } from '../../environments/environment';

describe('SubdomainService', () => {
  let service: SubdomainService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubdomainService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCurrentSubdomain', () => {
    it('should extract subdomain from hostname', () => {
      // Mock window.location.hostname
      Object.defineProperty(window, 'location', {
        value: { hostname: 'test-company.localhost' },
        writable: true
      });

      const subdomain = service.getCurrentSubdomain();
      expect(subdomain).toBe('test-company');
    });

    it('should return null for root domain', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost' },
        writable: true
      });

      const subdomain = service.getCurrentSubdomain();
      expect(subdomain).toBeNull();
    });

    it('should handle production domain', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'tenant-name.mscan.com' },
        writable: true
      });

      const subdomain = service.getCurrentSubdomain();
      expect(subdomain).toBe('tenant-name');
    });

    it('should handle localhost with port', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'tenant-1.localhost', port: '4200' },
        writable: true
      });

      const subdomain = service.getCurrentSubdomain();
      expect(subdomain).toBe('tenant-1');
    });

    it('should handle multi-level subdomains', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'app.tenant.mscan.com' },
        writable: true
      });

      const subdomain = service.getCurrentSubdomain();
      expect(subdomain).toBe('app');
    });
  });

  describe('isRootDomain', () => {
    it('should return true for root domain', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost' },
        writable: true
      });

      expect(service.isRootDomain()).toBe(true);
    });

    it('should return false for subdomain', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'tenant.localhost' },
        writable: true
      });

      expect(service.isRootDomain()).toBe(false);
    });
  });

  describe('buildSubdomainUrl', () => {
    it('should build localhost URL with subdomain', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:', hostname: 'localhost', port: '4200' },
        writable: true
      });

      const url = service.buildSubdomainUrl('test-tenant', '/dashboard');
      expect(url).toBe('http://test-tenant.localhost:4200/dashboard');
    });

    it('should build production URL with subdomain', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:', hostname: 'mscan.com', port: '' },
        writable: true
      });

      const url = service.buildSubdomainUrl('test-tenant', '/dashboard');
      expect(url).toBe('https://test-tenant.mscan.com/dashboard');
    });

    it('should default to root path', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:', hostname: 'localhost', port: '4200' },
        writable: true
      });

      const url = service.buildSubdomainUrl('test-tenant');
      expect(url).toBe('http://test-tenant.localhost:4200/');
    });

    it('should handle paths with query params', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:', hostname: 'localhost', port: '4200' },
        writable: true
      });

      const url = service.buildSubdomainUrl('test-tenant', '/search?q=test');
      expect(url).toBe('http://test-tenant.localhost:4200/search?q=test');
    });
  });

  describe('getApiBaseUrl', () => {
    it('should return subdomain-aware API URL', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:', hostname: 'test-tenant.localhost', port: '4200' },
        writable: true
      });

      const apiUrl = service.getApiBaseUrl();
      expect(apiUrl).toContain('test-tenant.localhost');
      expect(apiUrl).toContain(':3000/api');
    });

    it('should return root API URL for root domain', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:', hostname: 'localhost', port: '4200' },
        writable: true
      });

      const apiUrl = service.getApiBaseUrl();
      expect(apiUrl).toBe('http://localhost:3000/api');
    });

    it('should handle production environment', () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:', hostname: 'tenant.mscan.com', port: '' },
        writable: true
      });

      const apiUrl = service.getApiBaseUrl();
      expect(apiUrl).toBe('https://tenant.mscan.com/api');
    });
  });

  describe('redirectToSubdomain', () => {
    it('should construct redirect URL', () => {
      const originalHref = window.location.href;
      delete (window as any).location;
      window.location = { href: '' } as any;

      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:', hostname: 'localhost', port: '4200', href: '' },
        writable: true
      });

      service.redirectToSubdomain('new-tenant', '/dashboard');
      
      expect(window.location.href).toBe('http://new-tenant.localhost:4200/dashboard');
    });
  });

  describe('redirectToRootDomain', () => {
    it('should redirect to root domain', () => {
      delete (window as any).location;
      window.location = { href: '' } as any;

      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:', hostname: 'tenant.localhost', port: '4200', href: '' },
        writable: true
      });

      service.redirectToRootDomain('/login');
      
      expect(window.location.href).toBe('http://localhost:4200/login');
    });
  });
});
