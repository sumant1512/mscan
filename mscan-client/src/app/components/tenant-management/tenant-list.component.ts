import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TenantService } from '../../services/tenant.service';
import { Tenant, PaginationParams } from '../../models/rewards.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-tenant-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenant-list.component.html',
  styleUrls: ['./tenant-list.component.css']
})
export class TenantListComponent implements OnInit {
  tenants: Tenant[] = [];
  loading = false;
  error = '';
  
  // Pagination
  currentPage = 1;
  limit = 10;
  totalTenants = 0;
  totalPages = 0;
  
  // Filters
  searchQuery = '';
  statusFilter: 'all' | 'active' | 'inactive' | 'suspended' = 'all';
  sortBy: 'name' | 'created_at' | 'total_credits' = 'created_at';
  sortOrder: 'asc' | 'desc' = 'desc';

  constructor(
    private tenantService: TenantService,
    private router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadTenants();
  }

  loadTenants() {
    this.loading = true;
    this.error = '';
    
    const params: PaginationParams & any = {
      page: this.currentPage,
      limit: this.limit
    };
    
    if (this.searchQuery) params.search = this.searchQuery;
    if (this.statusFilter !== 'all') params.status = this.statusFilter;
    params.sort_by = this.sortBy;
    params.sort_order = this.sortOrder;
    
    this.tenantService.getAllTenants(params)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.tenants = response.tenants;
          this.totalTenants = response.total;
          this.totalPages = response.total_pages;
        },
        error: (err) => {
          console.error('Load tenants error:', err);
          this.error = err.error?.error || err.message || 'Failed to load tenants';
        }
      });
  }

  onSearch() {
    this.currentPage = 1;
    this.loadTenants();
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadTenants();
  }

  onSortChange() {
    this.loadTenants();
  }

  toggleSortOrder() {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.loadTenants();
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadTenants();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadTenants();
    }
  }

  viewTenant(id: number | string) {
    this.router.navigate(['/super-admin/tenants', id]);
  }

  editTenant(id: number | string) {
    this.router.navigate(['/super-admin/tenants', id, 'edit']);
  }

  createTenant() {
    this.router.navigate(['/super-admin/tenants/new']);
  }

  toggleStatus(tenant: Tenant) {
    if (confirm(`Are you sure you want to ${tenant.status === 'active' ? 'deactivate' : 'activate'} ${tenant.tenant_name}?`)) {
      this.tenantService.toggleTenantStatus(tenant.id).subscribe({
        next: () => {
          this.loadTenants();
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
