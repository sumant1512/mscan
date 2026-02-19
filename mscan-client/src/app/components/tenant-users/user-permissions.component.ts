/**
 * User Permissions Component
 * View and manage permissions for a specific user
 */
import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TenantUsersService } from '../../services/tenant-users.service';
import { PermissionsService } from '../../services/permissions.service';
import { AuthService } from '../../services/auth.service';
import { TenantUser, Permission, UserPermissionsResponse } from '../../models';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-user-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-permissions.component.html',
  styleUrls: ['./user-permissions.component.css']
})
export class UserPermissionsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  userId: string | null = null;
  user: TenantUser | null = null;
  private loadingService = inject(LoadingService);

  loading$ = this.loadingService.loading$;
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

    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['id']) {
          this.userId = params['id'];
          this.loadUser();
          this.loadUserPermissions();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUser() {
    if (!this.userId) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.tenant?.id) {
      this.error = 'No tenant context available';
      return;
    }

    this.tenantUsersService.getTenantUser(currentUser.tenant.id, this.userId)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          if (response.status && response.data) {
            this.user = response.data.user;
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to load user');
          this.cdr.detectChanges();
        }
      });
  }

  loadUserPermissions() {
    if (!this.userId) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.tenant?.id) return;

    this.loadingCurrentPermissions = true;
    this.tenantUsersService.getUserPermissions(currentUser.tenant.id, this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status && response.data) {
            this.currentPermissions = response.data.permissions;
          }
          this.loadingCurrentPermissions = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to load permissions');
          this.loadingCurrentPermissions = false;
          this.cdr.detectChanges();
        }
      });
  }

  loadAvailablePermissions() {
    this.loadingAvailablePermissions = true;

    this.permissionsService.listPermissions({ limit: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status && response.data) {
            // Filter out already assigned permissions
            const currentPermissionIds = this.currentPermissions.map(p => p.id);
            this.availablePermissions = response.data.permissions.filter(
              p => !currentPermissionIds.includes(p.id)
            );
          }
          this.loadingAvailablePermissions = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Failed to load available permissions';
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

    this.tenantUsersService.assignUserPermissions(currentUser.tenant.id, this.userId, {
      permission_ids: this.selectedPermissionIds
    })
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          if (response.status) {
            this.successMessage = `${this.selectedPermissionIds.length} permission(s) assigned successfully`;
            this.closeAssignModal();
            this.loadUserPermissions(); // Reload to show new permissions
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to assign permissions');
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
