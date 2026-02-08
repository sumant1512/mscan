/**
 * Permission Guard
 * Route guard for permission-based access control
 */
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Get required permission(s) from route data
    const requiredPermission = route.data['requiredPermission'] as string;
    const requiredPermissions = route.data['requiredPermissions'] as string[];
    const permissionMode = route.data['permissionMode'] as 'any' | 'all' || 'any';

    // If no permission requirement specified, allow access
    if (!requiredPermission && !requiredPermissions) {
      console.warn('PermissionGuard: No permission requirement specified for route', state.url);
      return true;
    }

    // Check single permission
    if (requiredPermission) {
      const hasPermission = this.authService.hasPermission(requiredPermission);

      if (!hasPermission) {
        console.log(`PermissionGuard: Access denied. Required permission: ${requiredPermission}`);
        this.handleUnauthorizedAccess(state.url);
        return false;
      }

      return true;
    }

    // Check multiple permissions
    if (requiredPermissions && requiredPermissions.length > 0) {
      let hasPermission = false;

      if (permissionMode === 'all') {
        // AND logic - user must have ALL permissions
        hasPermission = this.authService.hasAllPermissions(requiredPermissions);
      } else {
        // OR logic (default) - user must have at least ONE permission
        hasPermission = this.authService.hasAnyPermission(requiredPermissions);
      }

      if (!hasPermission) {
        console.log(`PermissionGuard: Access denied. Required permissions (${permissionMode}): ${requiredPermissions.join(', ')}`);
        this.handleUnauthorizedAccess(state.url);
        return false;
      }

      return true;
    }

    return true;
  }

  /**
   * Handle unauthorized access attempt
   */
  private handleUnauthorizedAccess(attemptedUrl: string): void {
    // Get user role to determine where to redirect
    const user = this.authService.getCurrentUser();

    if (user) {
      // User is logged in but lacks permission
      // Redirect to their appropriate dashboard
      if (user.role === 'SUPER_ADMIN') {
        this.router.navigate(['/admin/dashboard']);
      } else {
        this.router.navigate(['/tenant/dashboard']);
      }

      // Optionally show a toast/snackbar notification
      console.error(`You don't have permission to access: ${attemptedUrl}`);
    } else {
      // User not logged in, redirect to login
      this.router.navigate(['/login']);
    }
  }
}
