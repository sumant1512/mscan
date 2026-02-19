/**
 * Tenant Users List Component
 * Displays and manages tenant users with permissions
 */
import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TenantUsersService } from '../../services/tenant-users.service';
import { AuthService } from '../../services/auth.service';
import { TenantUser } from '../../models';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-tenant-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenant-users-list.component.html',
  styleUrls: ['./tenant-users-list.component.css']
})
export class TenantUsersListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  users: TenantUser[] = [];
  private loadingService = inject(LoadingService);

  loading$ = this.loadingService.loading$;
  error = '';
  successMessage = '';
  searchQuery = '';
  roleFilter = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 50;
  totalPages = 1;
  totalUsers = 0;

  // Delete modal
  selectedUser: TenantUser | null = null;
  showDeleteModal = false;

  // Permission flags
  canManageUsers = false;
  canViewUsers = false;

  constructor(
    private tenantUsersService: TenantUsersService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.canManageUsers = this.authService.hasPermission('manage_tenant_users');
    this.canViewUsers = this.authService.hasPermission('view_tenant_users');
  }

  ngOnInit() {
    if (!this.canViewUsers) {
      this.error = 'You do not have permission to view users';
      return;
    }
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers() {
    this.error = '';
    this.successMessage = '';

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.tenant?.id) {
      this.error = 'No tenant context available';
      return;
    }

    const filters = {
      search: this.searchQuery || undefined,
      role: this.roleFilter || undefined,
      page: this.currentPage,
      limit: this.itemsPerPage
    };

    this.tenantUsersService.listTenantUsers(currentUser.tenant.id, filters)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          if (response.status && response.data) {
            this.users = response.data.users || [];
            this.totalUsers = response.data.pagination.total;
            this.totalPages = response.data.pagination.pages;
            this.currentPage = response.data.pagination.page;
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to load users');
          this.users = [];
          this.cdr.detectChanges();
        }
      });
  }

  onSearch() {
    this.currentPage = 1; // Reset to first page on search
    this.loadUsers();
  }

  onRoleFilterChange() {
    this.currentPage = 1; // Reset to first page on filter change
    this.loadUsers();
  }

  createUser() {
    this.router.navigate(['/tenant/users/create']);
  }

  editUser(user: TenantUser) {
    this.router.navigate(['/tenant/users/edit', user.id]);
  }

  viewUserPermissions(user: TenantUser) {
    this.router.navigate(['/tenant/users', user.id, 'permissions']);
  }

  confirmDelete(user: TenantUser) {
    this.selectedUser = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.selectedUser = null;
    this.showDeleteModal = false;
  }

  deleteUser() {
    if (!this.selectedUser) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.tenant?.id) {
      this.error = 'No tenant context available';
      return;
    }

    this.tenantUsersService.deleteTenantUser(currentUser.tenant.id, this.selectedUser.id)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          if (response.status) {
            this.successMessage = `User "${this.selectedUser?.full_name}" deleted successfully`;
            this.closeDeleteModal();
            this.loadUsers();
          }
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to delete user');
          this.closeDeleteModal();
          this.cdr.detectChanges();
        }
      });
  }

  // Pagination methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  nextPage() {
    this.goToPage(this.currentPage + 1);
  }

  previousPage() {
    this.goToPage(this.currentPage - 1);
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'TENANT_ADMIN':
        return 'role-badge admin';
      case 'TENANT_USER':
        return 'role-badge user';
      default:
        return 'role-badge';
    }
  }

  getStatusBadgeClass(user: TenantUser): string {
    if (user.deleted_at) {
      return 'status-badge deleted';
    }
    return user.is_active ? 'status-badge active' : 'status-badge inactive';
  }

  getStatusText(user: TenantUser): string {
    if (user.deleted_at) {
      return 'Deleted';
    }
    return user.is_active ? 'Active' : 'Inactive';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
