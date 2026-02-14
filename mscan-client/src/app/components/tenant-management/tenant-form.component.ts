import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TenantService } from '../../services/tenant.service';
import { TenantsFacade } from '../../store/tenants';
import { debounceTime, distinctUntilChanged, switchMap, finalize, filter, takeUntil } from 'rxjs/operators';
import { of, Subject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-tenant-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tenant-form.component.html',
  styleUrls: ['./tenant-form.component.css']
})
export class TenantFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  tenantForm: FormGroup;
  isEditMode = false;
  tenantId?: string;

  // Subdomain validation
  subdomainAvailable: boolean | null = null;
  checkingAvailability = false;
  suggestions: string[] = [];
  domainBase = environment.domainBase || 'localhost';

  // NgRx state observables
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;
  successMessage$!: Observable<string | null>;

  constructor(
    private fb: FormBuilder,
    private tenantService: TenantService,
    private tenantsFacade: TenantsFacade,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.tenantForm = this.fb.group({
      tenant_name: ['', [Validators.required, Validators.minLength(2)]],
      subdomain_slug: ['', [
        Validators.required, 
        Validators.minLength(3),
        Validators.maxLength(50),
        Validators.pattern(/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/)
      ]],
      contact_person: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^\+?[\d\s-()]+$/)]],
      address: ['']
    });
  }

  ngOnInit() {
    // Initialize NgRx observables
    this.loading$ = this.tenantsFacade.operationInProgress$;
    this.error$ = this.tenantsFacade.error$;
    this.successMessage$ = this.tenantsFacade.successMessage$;

    const id = this.route.snapshot.paramMap.get('id');
    console.log('TenantFormComponent initialized with id:', id);

    // Listen for success messages and navigate
    this.successMessage$
      .pipe(
        filter(msg => !!msg),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        setTimeout(() => {
          this.tenantsFacade.clearSuccess();
          this.router.navigate(['/super-admin/tenants']);
        }, 1500);
      });

    if (id && id !== 'new') {
      this.isEditMode = true;
      this.tenantId = id;
      console.log('Edit mode enabled for tenant ID:', this.tenantId);
      this.loadTenant();
    } else {
      // Setup subdomain auto-suggestion and validation for new tenants
      this.setupSubdomainValidation();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupSubdomainValidation() {
    // Auto-suggest subdomain from tenant name
    this.tenantForm.get('tenant_name')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(name => {
        // Only auto-suggest in create mode
        if (name && name.length >= 3 && !this.isEditMode) {
          this.generateSlugSuggestion(name);
        }
      });
    
    // Real-time availability check
    this.tenantForm.get('subdomain_slug')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(slug => {
          if (!slug || slug.length < 3 || this.tenantForm.get('subdomain_slug')?.invalid) {
            this.subdomainAvailable = null;
            return of(null);
          }
          this.checkingAvailability = true;
          return this.tenantService.checkSubdomainAvailability(slug);
        })
      )
      .subscribe(result => {
        this.checkingAvailability = false;
        if (result) {
          this.subdomainAvailable = result.available;
          if (!result.available) {
            // Get suggestions if not available
            const tenantName = this.tenantForm.get('tenant_name')?.value;
            if (tenantName) {
              this.tenantService.getSubdomainSuggestions(tenantName).subscribe(
                res => this.suggestions = res.suggestions
              );
            }
          }
        }
      });
  }

  generateSlugSuggestion(tenantName: string) {
    const slug = tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
    
    this.tenantForm.patchValue({ subdomain_slug: slug }, { emitEvent: true });
    
    // Also get server suggestions
    this.tenantService.getSubdomainSuggestions(tenantName).subscribe(result => {
      this.suggestions = result.suggestions;
    });
  }

  selectSuggestion(slug: string) {
    this.tenantForm.patchValue({ subdomain_slug: slug });
  }

  getSubdomainPreview(): string {
    const slug = this.tenantForm.get('subdomain_slug')?.value;
    const port = window.location.port ? `:${window.location.port}` : '';
    return slug ? `${slug}.${this.domainBase}${port}` : `your-subdomain.${this.domainBase}`;
  }

  loadTenant() {
    if (!this.tenantId) {
      return;
    }

    this.tenantsFacade.getTenantById(this.tenantId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tenant) => {
          if (tenant) {
            this.tenantForm.patchValue({
              tenant_name: tenant.tenant_name,
              contact_person: tenant.contact_person,
              email: tenant.email,
              phone: tenant.phone,
              address: tenant.address,
              subdomain_slug: tenant.subdomain_slug
            });
          }
        }
      });
  }

  onSubmit() {
    if (this.tenantForm.invalid || this.checkingAvailability || (!this.isEditMode && this.subdomainAvailable !== true)) {
      Object.keys(this.tenantForm.controls).forEach(key => {
        this.tenantForm.controls[key].markAsTouched();
      });
      return;
    }

    // Clear previous error
    this.tenantsFacade.clearError();

    const formData = this.tenantForm.value;

    if (this.isEditMode && this.tenantId) {
      // Update existing tenant via NgRx
      this.tenantsFacade.updateTenant(this.tenantId, formData);
      // List will auto-reload and navigate on success!
    } else {
      // Create new tenant via NgRx
      this.tenantsFacade.createTenant(formData);
      // List will auto-reload and navigate on success!
    }
  }

  cancel() {
    this.router.navigate(['/super-admin/tenants']);
  }

  goToTenantList() {
    this.router.navigate(['/super-admin/tenants']);
  }

  isFieldInvalid(field: string): boolean {
    const control = this.tenantForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  getFieldError(field: string): string {
    const control = this.tenantForm.get(field);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('email')) {
      return 'Invalid email format';
    }
    if (control?.hasError('minlength')) {
      return `Minimum ${control.errors?.['minlength'].requiredLength} characters required`;
    }
    if (control?.hasError('maxlength')) {
      return `Maximum ${control.errors?.['maxlength'].requiredLength} characters allowed`;
    }
    if (control?.hasError('pattern')) {
      if (field === 'subdomain_slug') {
        return 'Only lowercase letters, numbers, and hyphens. Must start and end with letter or number.';
      }
      return 'Invalid format';
    }
    return '';
  }
}
