/**
 * Auth Guard
 */
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

/**
 * Super Admin Guard
 */
export const superAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  // Check current user if available, otherwise fallback to localStorage
  const currentUser = authService.getCurrentUser();
  const userType = currentUser?.role || authService.getUserType();
  
  if (userType === 'SUPER_ADMIN') {
    return true;
  }

  router.navigate(['/tenant/dashboard']);
  return false;
};
