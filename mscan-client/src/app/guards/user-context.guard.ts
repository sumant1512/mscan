/**
 * User Context Guard
 * Ensures user context is fully loaded before allowing navigation to protected routes
 *
 * This guard prevents the race condition where routes render before user permissions
 * are loaded from the API, which would cause permission checks to fail.
 */
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthContextFacade } from '../store/auth-context';
import { Observable, of, combineLatest } from 'rxjs';
import { map, take, catchError, timeout, filter, switchMap, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const userContextGuard: CanActivateFn = () => {
  const authContextFacade = inject(AuthContextFacade);
  const authService = inject(AuthService);
  const router = inject(Router);

  // First check if user is logged in
  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  // Combine loaded and error states to handle all scenarios
  return combineLatest([
    authContextFacade.loaded$,
    authContextFacade.error$,
    authContextFacade.loading$
  ]).pipe(
    switchMap(([loaded, error, loading]) => {
      // If there's an error, redirect to login
      if (error) {
        console.error('UserContextGuard: Error detected in user context', error);
        authService.logout();
        return of(false);
      }

      // If context is already loaded, allow navigation
      if (loaded) {
        console.log('UserContextGuard: User context already loaded');
        return of(true);
      }

      // If not loaded and not loading, trigger load
      if (!loaded && !loading) {
        console.log('UserContextGuard: User context not loaded, triggering load...');
        authContextFacade.loadUserContext();
      }

      // Wait for either loaded to become true or an error to occur
      return combineLatest([
        authContextFacade.loaded$,
        authContextFacade.error$
      ]).pipe(
        filter(([isLoaded, err]) => isLoaded === true || err !== null),
        take(1),
        timeout(10000), // 10 second timeout
        map(([isLoaded, err]) => {
          if (err) {
            console.error('UserContextGuard: Failed to load user context', err);
            authService.logout();
            return false;
          }
          console.log('UserContextGuard: User context loaded successfully');
          return true;
        }),
        catchError(error => {
          console.error('UserContextGuard: Timeout or error while loading user context', error);
          authService.logout();
          return of(false);
        })
      );
    }),
    take(1)
  );
};
