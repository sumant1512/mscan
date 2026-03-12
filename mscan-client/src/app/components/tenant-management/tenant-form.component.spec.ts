import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { TenantFormComponent } from './tenant-form.component';
import { TenantService } from '../../services/tenant.service';
import { TenantsFacade } from '../../store/tenants';
import { Router, ActivatedRoute } from '@angular/router';
import { of, BehaviorSubject } from 'rxjs';

describe('TenantFormComponent - Subdomain Features', () => {
  let component: TenantFormComponent;
  let fixture: ComponentFixture<TenantFormComponent>;
  let tenantService: {
    checkSubdomainAvailability: jest.Mock;
    getSubdomainSuggestions: jest.Mock;
    createTenant: jest.Mock;
    updateTenant: jest.Mock;
  };
  let tenantsFacade: {
    operationInProgress$: BehaviorSubject<boolean>;
    error$: BehaviorSubject<string | null>;
    successMessage$: BehaviorSubject<string | null>;
    clearSuccess: jest.Mock;
    clearError: jest.Mock;
    getTenantById: jest.Mock;
    createTenant: jest.Mock;
    updateTenant: jest.Mock;
  };
  let router: { navigate: jest.Mock };

  beforeEach(async () => {
    tenantService = {
      checkSubdomainAvailability: jest.fn().mockReturnValue(of({ success: true, data: { available: true, message: 'Available' } })),
      getSubdomainSuggestions: jest.fn().mockReturnValue(of({ success: true, data: { suggestions: [], count: 0 } })),
      createTenant: jest.fn(),
      updateTenant: jest.fn()
    };

    tenantsFacade = {
      operationInProgress$: new BehaviorSubject<boolean>(false),
      error$: new BehaviorSubject<string | null>(null),
      successMessage$: new BehaviorSubject<string | null>(null),
      clearSuccess: jest.fn(),
      clearError: jest.fn(),
      getTenantById: jest.fn().mockReturnValue(of(null)),
      createTenant: jest.fn(),
      updateTenant: jest.fn()
    };

    router = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [TenantFormComponent, ReactiveFormsModule],
      providers: [
        { provide: TenantService, useValue: tenantService },
        { provide: TenantsFacade, useValue: tenantsFacade },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => null } } }
        }
      ]
    }).compileComponents();

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
      tenantService.checkSubdomainAvailability.mockReturnValue(
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
      tenantService.checkSubdomainAvailability.mockReturnValue(
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
      tenantService.checkSubdomainAvailability.mockReturnValue(
        of({ success: true, data: { available: false, message: 'Taken' } })
      );
      tenantService.getSubdomainSuggestions.mockReturnValue(
        of({ success: true, data: { suggestions: ['alt1', 'alt2', 'alt3'], count: 3 } })
      );

      component.isEditMode = false;
      fixture.detectChanges();

      // Set tenant_name silently so the availability handler can find it when slug is checked
      component.tenantForm.get('tenant_name')?.setValue('Taken Company', { emitEvent: false });
      component.tenantForm.patchValue({ subdomain_slug: 'taken-slug' });

      setTimeout(() => {
        expect(tenantService.getSubdomainSuggestions).toHaveBeenCalled();
        expect(component.suggestions.length).toBe(3);
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
      fixture.detectChanges();

      component.tenantForm.patchValue({
        tenant_name: 'Test',
        email: 'test@test.com',
        phone: '1234567890',
        subdomain_slug: 'taken'
      });

      component.onSubmit();

      expect(tenantsFacade.createTenant).not.toHaveBeenCalled();
    });

    it('should allow submission if subdomain available', () => {
      component.isEditMode = false;
      component.subdomainAvailable = true;
      fixture.detectChanges();

      component.tenantForm.patchValue({
        tenant_name: 'Test',
        contact_person: 'Test Person',
        email: 'test@test.com',
        phone: '1234567890',
        subdomain_slug: 'available-slug'
      });

      component.onSubmit();

      expect(tenantsFacade.createTenant).toHaveBeenCalledWith(expect.objectContaining({
        subdomain_slug: 'available-slug'
      }));
    });
  });

  describe('Suggestion Selection', () => {
    it('should populate field when suggestion is clicked', () => {
      component.isEditMode = false;
      component.suggestions = ['suggestion-1', 'suggestion-2'];
      fixture.detectChanges();

      component.selectSuggestion('suggestion-1');

      expect(component.tenantForm.get('subdomain_slug')?.value).toBe('suggestion-1');
    });
  });

  // ── Task 8.1: max_verification_apps field ──────────────────────────────────
  describe('Max Verification Apps field', () => {
    it('should have max_verification_apps control in the form', () => {
      const control = component.tenantForm.get('max_verification_apps');
      expect(control).not.toBeNull();
    });

    it('should default max_verification_apps to 1', () => {
      const control = component.tenantForm.get('max_verification_apps');
      expect(control?.value).toBe(1);
    });

    it('should be invalid when max_verification_apps is 0', () => {
      const control = component.tenantForm.get('max_verification_apps');
      control?.setValue(0);
      expect(control?.valid).toBe(false);
      expect(control?.hasError('min')).toBe(true);
    });

    it('should be invalid when max_verification_apps is empty', () => {
      const control = component.tenantForm.get('max_verification_apps');
      control?.setValue(null);
      expect(control?.valid).toBe(false);
      expect(control?.hasError('required')).toBe(true);
    });

    it('should be valid when max_verification_apps is a positive integer', () => {
      const control = component.tenantForm.get('max_verification_apps');
      control?.setValue(5);
      expect(control?.valid).toBe(true);
    });
  });
});
