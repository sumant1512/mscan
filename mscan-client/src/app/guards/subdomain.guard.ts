import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SubdomainService } from '../services/subdomain.service';
import { AuthService } from '../services/auth.service';

/**
 * Subdomain Guard
 * 
 * Ensures users can only access resources from their assigned tenant subdomain.
 * - Super admins can access the root domain and any subdomain
 * - Tenant users (ADMIN, EMPLOYEE) must access from their tenant's subdomain
 * - Redirects users to the correct subdomain if they're on the wrong one
 */
export const subdomainGuard: CanActivateFn = (route, state) => {
  const subdomainService = inject(SubdomainService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentSubdomain = subdomainService.getCurrentSubdomain();
  const isAuthenticated = authService.isLoggedIn();

  if (!isAuthenticated) {
    // Not authenticated - let auth guard handle this
    return true;
  }

  const currentUser = authService.getCurrentUser();
  const userRole = currentUser?.role || authService.getUserType();
  const userSubdomain = authService.getTenantSubdomain();

  // Super admin can access from any domain
  if (userRole === 'SUPER_ADMIN') {
    return true;
  }

  // Tenant users (ADMIN, EMPLOYEE) must be on their tenant subdomain
  if (!userSubdomain) {
    // User has no subdomain assigned - shouldn't happen but handle gracefully
    console.error('User has no tenant subdomain assigned');
    router.navigate(['/unauthorized']);
    return false;
  }

  // Check if current subdomain matches user's assigned subdomain
  if (currentSubdomain !== userSubdomain) {
    console.warn(
      `Subdomain mismatch: Current="${currentSubdomain}", Expected="${userSubdomain}"`
    );

    // Redirect to correct subdomain
    const currentPath = state.url;
    subdomainService.redirectToSubdomain(userSubdomain, currentPath);
    return false;
  }

  // User is on correct subdomain
  return true;
};
