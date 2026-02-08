/**
 * Add Tenant Admin Component
 * Form for creating new Tenant Admin users
 */
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TenantAdminService } from '../../../services/tenant-admin.service';
import { TenantsFacade } from '../../../store/tenants';
import { Tenant, CreateTenantAdminRequest } from '../../../models/tenant-admin.model';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-add-tenant-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-tenant-admin.component.html',
  styleUrls: ['./add-tenant-admin.component.css']
})
export class AddTenantAdminComponent implements OnInit {
  private tenantAdminService = inject(TenantAdminService);
  private tenantsFacade = inject(TenantsFacade);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  saving = false;
  error = '';
  successMessage = '';

  // NgRx observables
  tenants$: Observable<Tenant[]> = this.tenantsFacade.activeTenants$;
  loading$: Observable<boolean> = this.tenantsFacade.loading$;

  tenantSearch = '';
  filteredTenants$: Observable<Tenant[]> = this.tenants$;
  showTenantDropdown = false;

  formData: CreateTenantAdminRequest = {
    email: '',
    full_name: '',
    phone_number: '',
    password: '',
    role: 'TENANT_ADMIN',
    send_welcome_email: true
  };

  selectedTenantId: string | null = null;
  selectedTenantName = '';

  ngOnInit() {
    // Check for pre-selected tenant from query params
    this.route.queryParams.subscribe(params => {
      if (params['tenantId']) {
        this.selectedTenantId = params['tenantId'];
        this.selectedTenantName = params['tenantName'] || '';
        this.tenantSearch = this.selectedTenantName;
      }
    });

    // Load tenants via facade
    this.tenantsFacade.loadTenants();
  }

  onTenantSearchChange() {
    if (!this.tenantSearch) {
      this.filteredTenants$ = this.tenants$;
      this.selectedTenantId = null;
      this.selectedTenantName = '';
      return;
    }

    const query = this.tenantSearch.toLowerCase();
    this.filteredTenants$ = this.tenants$.pipe(
      map(tenants => tenants.filter(t => 
        t.tenant_name.toLowerCase().includes(query) ||
        t.email.toLowerCase().includes(query) ||
        t.subdomain_slug?.toLowerCase().includes(query)
      ))
    );
    this.showTenantDropdown = true;
  }

  selectTenant(tenant: Tenant) {
    this.selectedTenantId = tenant.id;
    this.selectedTenantName = tenant.tenant_name;
    this.tenantSearch = tenant.tenant_name;
    this.showTenantDropdown = false;
  }

  onTenantFocus() {
    this.showTenantDropdown = true;
    this.filteredTenants$ = this.tenants$;
  }

  onTenantBlur() {
    // Delay to allow click on dropdown item
    setTimeout(() => {
      this.showTenantDropdown = false;
    }, 200);
  }

  validateForm(): boolean {
    if (!this.selectedTenantId) {
      this.error = 'Please select a tenant';
      return false;
    }

    if (!this.formData.email) {
      this.error = 'Email is required';
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.formData.email)) {
      this.error = 'Please enter a valid email address';
      return false;
    }

    if (!this.formData.full_name) {
      this.error = 'Full name is required';
      return false;
    }

    return true;
  }

  onSubmit() {
    this.error = '';
    this.successMessage = '';

    if (!this.validateForm()) {
      return;
    }

    this.saving = true;

    // Generate a temporary password
    const tempPassword = this.generateTempPassword();
    const payload = { ...this.formData, password: tempPassword };

    this.tenantAdminService.createTenantAdmin(this.selectedTenantId!, payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.successMessage = `Tenant Admin created successfully for ${this.selectedTenantName}`;
        
        if (response.data.welcome_email_sent) {
          this.successMessage += '. Welcome email sent.';
        } else if (response.warnings && response.warnings.length > 0) {
          this.successMessage += '. However, welcome email could not be sent.';
        }

        // Reload tenants to update admin counts
        this.tenantsFacade.loadTenants();

        // Reset form
        setTimeout(() => {
          this.router.navigate(['/super-admin/tenant-admins/tenant', this.selectedTenantId]);
        }, 2000);
      },
      error: (err) => {
        console.error('Failed to create Tenant Admin:', err);
        this.saving = false;
        
        if (err.status === 409) {
          this.error = 'A user with this email already exists in this tenant';
        } else if (err.status === 404) {
          this.error = 'Tenant not found';
        } else if (err.error && err.error.message) {
          this.error = err.error.message;
        } else {
          this.error = 'Failed to create Tenant Admin. Please try again.';
        }
      }
    });
  }

  cancel() {
    this.router.navigate(['/super-admin/tenant-admins']);
  }

  private generateTempPassword(): string {
    // Generate a secure temporary password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
