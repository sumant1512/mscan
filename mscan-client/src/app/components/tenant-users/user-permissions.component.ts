/**
 * User Permissions Component
 * View and manage permissions for a specific user
 */
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TenantUsersService } from '../../services/tenant-users.service';
import { PermissionsService } from '../../services/permissions.service';
import { AuthService } from '../../services/auth.service';
import { TenantUser, Permission } from '../../models';

@Component({
  selector: 'app-user-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-permissions.component.html',
  styleUrls: ['./user-permissions.component.css']
})
export class UserPermissionsComponent implements OnInit {
  userId: string | null = null;
  user: TenantUser | null = null;
  loading = false;
  error = '';
  successMessage = '';

  // Current permissions
  currentPermissions: Permission[] = [];
  loadingCurrentPermissions = false;

  // Available permissions for assignment
  availablePermissions: Permission[] = [];
  loadingAvailablePermissions = false;

  // Selected permissions for bulk assignment
  selectedPermissionIds: string[] = [];
  showAssignModal = false;

  // Permission flags
  canAssignPermissions = false;
  canViewPermissions = false;

  constructor(
    private tenantUsersService: TenantUsersService,
    private permissionsService: PermissionsService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.canAssignPermissions = this.authService.hasPermission('assign_permissions');
    this.canViewPermissions = this.authService.hasPermission('view_permissions');
  }

  ngOnInit() {
    if (!this.canViewPermissions) {
      this.error = 'You do not have permission to view user permissions';
      return;
    }

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.userId = params['id'];
        this.loadUser();
        this.loadUserPermissions();
      }
    });
  }

  loadUser() {
    if (!this.userId) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.tenant?.id) {
      this.error = 'No tenant context available';
      return;
    }

    this.loading = true;
    this.tenantUsersService.getTenantUser(currentUser.tenant.id, this.userId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.user = response.data.user;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load user';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadUserPermissions() {
    if (!this.userId) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.tenant?.id) return;

    this.loadingCurrentPermissions = true;
    this.tenantUsersService.getUserPermissions(currentUser.tenant.id, this.userId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentPermissions = response.data.permissions;
        }
        this.loadingCurrentPermissions = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load permissions';
        this.loadingCurrentPermissions = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadAvailablePermissions() {
    this.loadingAvailablePermissions = true;

    this.permissionsService.listPermissions({ limit: 100 }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Filter out already assigned permissions
          const currentPermissionIds = this.currentPermissions.map(p => p.id);
          this.availablePermissions = response.data.permissions.filter(
            p => !currentPermissionIds.includes(p.id)
          );
        }
        this.loadingAvailablePermissions = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load available permissions:', err);
        this.loadingAvailablePermissions = false;
        this.cdr.detectChanges();
      }
    });
  }

  openAssignModal() {
    this.loadAvailablePermissions();
    this.selectedPermissionIds = [];
    this.showAssignModal = true;
  }

  closeAssignModal() {
    this.showAssignModal = false;
    this.selectedPermissionIds = [];
  }

  togglePermissionSelection(permissionId: string) {
    const index = this.selectedPermissionIds.indexOf(permissionId);
    if (index > -1) {
      this.selectedPermissionIds.splice(index, 1);
    } else {
      this.selectedPermissionIds.push(permissionId);
    }
  }

  isPermissionSelected(permissionId: string): boolean {
    return this.selectedPermissionIds.includes(permissionId);
  }

  assignPermissions() {
    if (!this.userId || this.selectedPermissionIds.length === 0) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.tenant?.id) return;

    this.loading = true;
    this.tenantUsersService.assignUserPermissions(currentUser.tenant.id, this.userId, {
      permission_ids: this.selectedPermissionIds
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = `${this.selectedPermissionIds.length} permission(s) assigned successfully`;
          this.closeAssignModal();
          this.loadUserPermissions(); // Reload to show new permissions
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to assign permissions';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  goBack() {
    this.router.navigate(['/tenant/users']);
  }

  getPermissionsByScope(scope: string): Permission[] {
    return this.currentPermissions.filter(p => p.scope === scope);
  }

  getAvailablePermissionsByScope(scope: string): Permission[] {
    return this.availablePermissions.filter(p => p.scope === scope);
  }
}
