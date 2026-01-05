import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TenantService } from '../../services/tenant.service';
import { Tenant } from '../../models/rewards.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-tenant-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tenant-detail.component.html',
  styleUrls: ['./tenant-detail.component.css']
})
export class TenantDetailComponent implements OnInit {
  tenant?: Tenant;
  loading = false;
  error = '';
  tenantId!: string;

  constructor(
    private tenantService: TenantService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.tenantId = id;
      this.loadTenant();
    }
  }

  loadTenant() {
    if (!this.tenantId) {
      this.error = 'Invalid tenant ID';
      this.router.navigate(['/super-admin/tenants']);
      return;
    }
    
    this.loading = true;
    this.error = '';
    
    this.tenantService.getTenantById(this.tenantId)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.tenant = response.tenant;
        },
        error: (err) => {
          console.error('Load tenant error:', err);
          this.error = err.error?.error || err.message || 'Failed to load tenant details';
        }
      });
  }

  editTenant() {
    this.router.navigate(['/super-admin/tenants', this.tenantId, 'edit']);
  }

  goBack() {
    this.router.navigate(['/super-admin/tenants']);
  }

  toggleStatus() {
    if (!this.tenant) return;
    
    if (confirm(`Are you sure you want to ${this.tenant.status === 'active' ? 'deactivate' : 'activate'} ${this.tenant.tenant_name}?`)) {
      this.tenantService.toggleTenantStatus(this.tenant.id).subscribe({
        next: () => {
          this.loadTenant();
        },
        error: (err) => {
          console.error('Toggle status error:', err);
          alert(err.error?.error || err.message || 'Failed to update tenant status');
        }
      });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      case 'suspended': return 'status-suspended';
      default: return '';
    }
  }
}
