/**
 * Tenant User Form Component
 * Create and edit tenant users with permission assignments
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
import { TenantUser, Permission, CreateTenantUserRequest } from '../../models';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-tenant-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenant-user-form.component.html',
  styleUrls: ['./tenant-user-form.component.css']
})
export class TenantUserFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isEditMode = false;
  userId: string | null = null;
  private loadingService = inject(LoadingService);

  loading$ = this.loadingService.loading$;
  saving = false;
  error = '';

  // Form data
  formData: CreateTenantUserRequest = {
    email: '',
    full_name: '',
    phone: '',
    role: 'TENANT_USER',
    permission_ids: []
  };

  // Available permissions
  availablePermissions: Permission[] = [];
  loadingPermissions = false;

  // Selected permissions
  selectedPermissionIds: string[] = [];

  // Permission flags
  canManageUsers = false;

  constructor(
    private tenantUsersService: TenantUsersService,
    private permissionsService: PermissionsService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.canManageUsers = this.authService.hasPermission('manage_tenant_users');
  }

  ngOnInit() {
    if (!this.canManageUsers) {
      this.error = 'You do not have permission to manage users';
      return;
    }

    // Check if we're in edit mode
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['id']) {
          this.isEditMode = true;
          this.userId = params['id'];
          this.loadUser();
        }
      });

    this.loadAvailablePermissions();
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
            const user = response.data.user;
            this.formData = {
              email: user.email,
              full_name: user.full_name,
              phone: user.phone || '',
              role: user.role
            };

            // Load user permissions to pre-select them
            this.loadUserPermissions();
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

    this.tenantUsersService.getUserPermissions(currentUser.tenant.id, this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status && response.data) {
            this.selectedPermissionIds = response.data.permissions.map(p => p.id);
            this.cdr.detectChanges();
          }
        },
        error: () => {
          // Silently fail - permissions will default to empty
        }
      });
  }

  loadAvailablePermissions() {
    this.loadingPermissions = true;

    // Get permissions available for assignment
    this.permissionsService.listPermissions({ limit: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status && response.data) {
            this.availablePermissions = response.data.permissions;
          }
          this.loadingPermissions = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Failed to load permissions';
          this.loadingPermissions = false;
          this.cdr.detectChanges();
        }
      });
  }

  togglePermission(permissionId: string) {
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

  onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.tenant?.id) {
      this.error = 'No tenant context available';
      return;
    }

    this.error = '';

    // Prepare form data with selected permissions
    const userData: CreateTenantUserRequest = {
      ...this.formData,
      permission_ids: this.selectedPermissionIds
    };

    if (this.isEditMode && this.userId) {
      // For edit mode, we need to assign permissions separately
      // (In a real implementation, you might want an update user endpoint)
      this.assignPermissions(currentUser.tenant.id, this.userId);
    } else {
      // Create new user
      this.tenantUsersService.createTenantUser(currentUser.tenant.id, userData)
        .pipe(
          this.loadingService.wrapLoading(),
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: (response) => {
            if (response.status) {
              this.router.navigate(['/tenant/users']);
            }
          },
          error: (err) => {
            this.error = HttpErrorHandler.getMessage(err, 'Failed to create user');
            this.cdr.detectChanges();
          }
        });
    }
  }

  assignPermissions(tenantId: string, userId: string) {
    if (this.selectedPermissionIds.length === 0) {
      this.router.navigate(['/tenant/users']);
      return;
    }

    this.tenantUsersService.assignUserPermissions(tenantId, userId, {
      permission_ids: this.selectedPermissionIds
    })
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          if (response.status) {
            this.router.navigate(['/tenant/users']);
          }
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to assign permissions');
          this.cdr.detectChanges();
        }
      });
  }

  validateForm(): boolean {
    if (!this.formData.email || !this.formData.full_name || !this.formData.role) {
      this.error = 'Please fill in all required fields';
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.formData.email)) {
      this.error = 'Please enter a valid email address';
      return false;
    }

    return true;
  }

  cancel() {
    this.router.navigate(['/tenant/users']);
  }

  getPermissionsByScope(scope: string): Permission[] {
    return this.availablePermissions.filter(p => p.scope === scope);
  }
}
