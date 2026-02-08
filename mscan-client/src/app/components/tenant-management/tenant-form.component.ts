import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TenantService } from '../../services/tenant.service';
import { debounceTime, distinctUntilChanged, switchMap, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-tenant-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tenant-form.component.html',
  styleUrls: ['./tenant-form.component.css']
})
export class TenantFormComponent implements OnInit {
  tenantForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  isEditMode = false;
  tenantId?: string;
  
  // Subdomain validation
  subdomainAvailable: boolean | null = null;
  checkingAvailability = false;
  suggestions: string[] = [];
  domainBase = environment.domainBase || 'localhost';

  constructor(
    private fb: FormBuilder,
    private tenantService: TenantService,
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
    const id = this.route.snapshot.paramMap.get('id');
    console.log('TenantFormComponent initialized with id:', id);
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
      this.error = 'Invalid tenant ID';
      return;
    }
    
    this.loading = true;
    this.tenantService.getTenantById(this.tenantId)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          this.tenantForm.patchValue({
            tenant_name: response.tenant.tenant_name,
            contact_person: response.tenant.contact_person,
            email: response.tenant.email,
            phone: response.tenant.phone,
            address: response.tenant.address,
            subdomain_slug: response.tenant.subdomain_slug
          });
        },
        error: (err) => {
          console.error('Load tenant error:', err);
          this.error = err.error?.error || err.message || 'Failed to load tenant';
        }
      });
  }

  onSubmit() {
    if (this.tenantForm.invalid || this.checkingAvailability || (!this.isEditMode && this.subdomainAvailable !== true)) {
      Object.keys(this.tenantForm.controls).forEach(key => {
        this.tenantForm.controls[key].markAsTouched();
      });
      if (!this.isEditMode && this.subdomainAvailable !== true) {
        this.error = 'Please choose an available subdomain';
      }
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const formData = this.tenantForm.value;

    if (this.isEditMode && this.tenantId) {
      this.tenantService.updateTenant(this.tenantId, formData)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: () => {
            this.success = 'Tenant updated successfully';
            setTimeout(() => this.router.navigate(['/super-admin/tenants']), 1500);
          },
          error: (err) => {
            console.error('Update tenant error:', err);
            this.error = err.error?.error || err.message || 'Failed to update tenant';
          }
        });
    } else {
      this.tenantService.createTenant(formData)
        .pipe(finalize(() => this.loading = false))
        .subscribe({
          next: () => {
            this.success = 'Tenant created successfully';
            setTimeout(() => this.router.navigate(['/super-admin/tenants']), 1500);
          },
          error: (err) => {
            console.error('Create tenant error:', err);
            this.error = err.error?.error || err.message || 'Failed to create tenant';
          }
        });
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
