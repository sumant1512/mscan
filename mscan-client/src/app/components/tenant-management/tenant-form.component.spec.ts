import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { TenantFormComponent } from './tenant-form.component';
import { TenantService } from '../../services/tenant.service';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('TenantFormComponent - Subdomain Features', () => {
  let component: TenantFormComponent;
  let fixture: ComponentFixture<TenantFormComponent>;
  let tenantService: jasmine.SpyObj<TenantService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const tenantServiceSpy = jasmine.createSpyObj('TenantService', [
      'checkSubdomainAvailability',
      'getSubdomainSuggestions',
      'createTenant',
      'updateTenant'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [TenantFormComponent, ReactiveFormsModule],
      providers: [
        { provide: TenantService, useValue: tenantServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => null } } }
        }
      ]
    }).compileComponents();

    tenantService = TestBed.inject(TenantService) as jasmine.SpyObj<TenantService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    
    fixture = TestBed.createComponent(TenantFormComponent);
    component = fixture.componentInstance;
  });

  describe('Subdomain Input Field', () => {
    it('should show subdomain field in create mode', () => {
      component.isEditMode = false;
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const subdomainField = compiled.querySelector('input[formControlName="subdomain_slug"]');
      
      expect(subdomainField).toBeTruthy();
    });

    it('should hide subdomain field in edit mode', () => {
      component.isEditMode = true;
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement;
      const subdomainField = compiled.querySelector('input[formControlName="subdomain_slug"]');
      
      expect(subdomainField).toBeFalsy();
    });
  });

  describe('Auto-generate Slug from Tenant Name', () => {
    it('should auto-populate subdomain when tenant name changes', (done) => {
      component.isEditMode = false;
      fixture.detectChanges();

      component.tenantForm.patchValue({ tenant_name: 'Test Company' });

      setTimeout(() => {
        expect(component.tenantForm.get('subdomain_slug')?.value).toBe('test-company');
        done();
      }, 600); // Wait for debounce
    });

    it('should sanitize tenant name to valid slug format', (done) => {
      component.isEditMode = false;
      fixture.detectChanges();

      component.tenantForm.patchValue({ tenant_name: 'Test & Company Ltd.' });

      setTimeout(() => {
        const slug = component.tenantForm.get('subdomain_slug')?.value;
        expect(slug).toMatch(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
        done();
      }, 600);
    });
  });

  describe('Real-time Availability Check', () => {
    it('should check availability when subdomain changes', (done) => {
      tenantService.checkSubdomainAvailability.and.returnValue(
        of({ success: true, data: { available: true, message: 'Available' } })
      );

      component.isEditMode = false;
      fixture.detectChanges();

      component.tenantForm.patchValue({ subdomain_slug: 'available-slug' });

      setTimeout(() => {
        expect(tenantService.checkSubdomainAvailability).toHaveBeenCalledWith('available-slug');
        expect(component.subdomainAvailable).toBe(true);
        done();
      }, 600);
    });

    it('should mark as unavailable if slug is taken', (done) => {
      tenantService.checkSubdomainAvailability.and.returnValue(
        of({ success: true, data: { available: false, message: 'Taken' } })
      );

      component.isEditMode = false;
      fixture.detectChanges();

      component.tenantForm.patchValue({ subdomain_slug: 'taken-slug' });

      setTimeout(() => {
        expect(component.subdomainAvailable).toBe(false);
        done();
      }, 600);
    });

    it('should fetch suggestions for unavailable slug', (done) => {
      tenantService.checkSubdomainAvailability.and.returnValue(
        of({ success: true, data: { available: false, message: 'Taken' } })
      );
      tenantService.getSubdomainSuggestions.and.returnValue(
        of({ success: true, data: { suggestions: ['alt1', 'alt2', 'alt3'], count: 3 } })
      );

      component.isEditMode = false;
      fixture.detectChanges();

      component.tenantForm.patchValue({ subdomain_slug: 'taken-slug' });

      setTimeout(() => {
        expect(tenantService.getSubdomainSuggestions).toHaveBeenCalled();
        expect(component.subdomainSuggestions.length).toBe(3);
        done();
      }, 600);
    });
  });

  describe('Subdomain Validation', () => {
    it('should validate minimum length (3 chars)', () => {
      component.isEditMode = false;
      fixture.detectChanges();

      component.tenantForm.patchValue({ subdomain_slug: 'ab' });
      
      const control = component.tenantForm.get('subdomain_slug');
      expect(control?.hasError('minlength')).toBe(true);
    });

    it('should validate maximum length (50 chars)', () => {
      component.isEditMode = false;
      fixture.detectChanges();

      component.tenantForm.patchValue({ subdomain_slug: 'a'.repeat(51) });
      
      const control = component.tenantForm.get('subdomain_slug');
      expect(control?.hasError('maxlength')).toBe(true);
    });

    it('should validate slug pattern (lowercase, alphanumeric, hyphens)', () => {
      component.isEditMode = false;
      fixture.detectChanges();

      component.tenantForm.patchValue({ subdomain_slug: 'Invalid_Slug' });
      
      const control = component.tenantForm.get('subdomain_slug');
      expect(control?.hasError('pattern')).toBe(true);
    });
  });

  describe('Subdomain Preview', () => {
    it('should show preview URL', () => {
      component.isEditMode = false;
      fixture.detectChanges();

      component.tenantForm.patchValue({ subdomain_slug: 'my-tenant' });
      
      const preview = component.getSubdomainPreview();
      expect(preview).toContain('my-tenant');
      expect(preview).toMatch(/\.(localhost|mscan\.com)/);
    });
  });

  describe('Form Submission', () => {
    it('should prevent submission if subdomain unavailable', () => {
      component.isEditMode = false;
      component.subdomainAvailable = false;
      tenantService.createTenant.and.returnValue(of({ success: true, data: {} }));
      fixture.detectChanges();

      component.tenantForm.patchValue({
        tenant_name: 'Test',
        email: 'test@test.com',
        phone: '1234567890',
        subdomain_slug: 'taken'
      });

      component.onSubmit();

      expect(tenantService.createTenant).not.toHaveBeenCalled();
    });

    it('should allow submission if subdomain available', () => {
      component.isEditMode = false;
      component.subdomainAvailable = true;
      tenantService.createTenant.and.returnValue(of({ success: true, data: { id: 1 } }));
      fixture.detectChanges();

      component.tenantForm.patchValue({
        tenant_name: 'Test',
        email: 'test@test.com',
        phone: '1234567890',
        subdomain_slug: 'available'
      });

      component.onSubmit();

      expect(tenantService.createTenant).toHaveBeenCalledWith(jasmine.objectContaining({
        subdomain_slug: 'available'
      }));
    });
  });

  describe('Suggestion Selection', () => {
    it('should populate field when suggestion is clicked', () => {
      component.isEditMode = false;
      component.subdomainSuggestions = ['suggestion-1', 'suggestion-2'];
      fixture.detectChanges();

      component.selectSuggestion('suggestion-1');

      expect(component.tenantForm.get('subdomain_slug')?.value).toBe('suggestion-1');
    });
  });
});
