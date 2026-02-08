import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { User } from '../../models';
import * as AuthContextActions from './auth-context.actions';
import * as AuthContextSelectors from './auth-context.selectors';

/**
 * Facade service for Auth Context state management
 *
 * This service provides a simplified API for components to interact
 * with the user authentication context stored in NgRx.
 *
 * Usage in components:
 *
 * @example
 * ```typescript
 * export class HeaderComponent implements OnInit {
 *   private facade = inject(AuthContextFacade);
 *
 *   user$ = this.facade.currentUser$;
 *   isAuthenticated$ = this.facade.isAuthenticated$;
 *   loading$ = this.facade.loading$;
 *
 *   ngOnInit() {
 *     this.facade.loadUserContext();
 *   }
 *
 *   logout() {
 *     this.facade.clearUserContext();
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class AuthContextFacade {
  private store = inject(Store);

  // Selectors - Observables for component consumption

  /** Current authenticated user */
  readonly currentUser$: Observable<User | null> = this.store.select(
    AuthContextSelectors.selectCurrentUser
  );

  /** User role */
  readonly userRole$: Observable<string | null> = this.store.select(
    AuthContextSelectors.selectUserRole
  );

  /** User permissions array */
  readonly userPermissions$: Observable<string[]> = this.store.select(
    AuthContextSelectors.selectUserPermissions
  );

  /** User tenant information */
  readonly userTenant$: Observable<{
    id: string | null;
    name: string | null;
    subdomain: string | null;
  }> = this.store.select(
    AuthContextSelectors.selectUserTenant
  );

  /** Is user authenticated */
  readonly isAuthenticated$: Observable<boolean> = this.store.select(
    AuthContextSelectors.selectIsAuthenticated
  );

  /** Is super admin */
  readonly isSuperAdmin$: Observable<boolean> = this.store.select(
    AuthContextSelectors.selectIsSuperAdmin
  );

  /** Is tenant admin */
  readonly isTenantAdmin$: Observable<boolean> = this.store.select(
    AuthContextSelectors.selectIsTenantAdmin
  );

  /** Is tenant user */
  readonly isTenantUser$: Observable<boolean> = this.store.select(
    AuthContextSelectors.selectIsTenantUser
  );

  /** Loading state */
  readonly loading$: Observable<boolean> = this.store.select(
    AuthContextSelectors.selectAuthContextLoading
  );

  /** Error state */
  readonly error$: Observable<string | null> = this.store.select(
    AuthContextSelectors.selectAuthContextError
  );

  /** Whether context has been loaded */
  readonly loaded$: Observable<boolean> = this.store.select(
    AuthContextSelectors.selectAuthContextLoaded
  );

  // Action dispatchers

  /**
   * Load user context from the API
   *
   * @example
   * ```typescript
   * ngOnInit() {
   *   this.facade.loadUserContext();
   * }
   * ```
   */
  loadUserContext(): void {
    this.store.dispatch(AuthContextActions.loadUserContext());
  }

  /**
   * Update user context (after profile updates)
   *
   * @param user - Updated user object
   *
   * @example
   * ```typescript
   * onProfileUpdate(user: User) {
   *   this.facade.updateUserContext(user);
   * }
   * ```
   */
  updateUserContext(user: User): void {
    this.store.dispatch(AuthContextActions.updateUserContext({ user }));
  }

  /**
   * Clear user context (on logout)
   *
   * @example
   * ```typescript
   * onLogout() {
   *   this.facade.clearUserContext();
   * }
   * ```
   */
  clearUserContext(): void {
    this.store.dispatch(AuthContextActions.clearUserContext());
  }

  /**
   * Clear any error state
   *
   * @example
   * ```typescript
   * this.facade.clearError();
   * ```
   */
  clearError(): void {
    this.store.dispatch(AuthContextActions.clearError());
  }

  // Dynamic selectors

  /**
   * Check if user has a specific permission
   *
   * @param permission - Permission code to check
   * @returns Observable of boolean
   *
   * @example
   * ```typescript
   * canEdit$ = this.facade.hasPermission('edit_product');
   * ```
   */
  hasPermission(permission: string): Observable<boolean> {
    return this.store.select(AuthContextSelectors.selectHasPermission(permission));
  }

  /**
   * Check if user has any of the specified permissions
   *
   * @param permissions - Array of permission codes
   * @returns Observable of boolean
   *
   * @example
   * ```typescript
   * canModify$ = this.facade.hasAnyPermission(['edit_product', 'delete_product']);
   * ```
   */
  hasAnyPermission(permissions: string[]): Observable<boolean> {
    return this.store.select(AuthContextSelectors.selectHasAnyPermission(permissions));
  }

  /**
   * Check if user has all of the specified permissions
   *
   * @param permissions - Array of permission codes
   * @returns Observable of boolean
   *
   * @example
   * ```typescript
   * canFullyManage$ = this.facade.hasAllPermissions(['edit_product', 'delete_product']);
   * ```
   */
  hasAllPermissions(permissions: string[]): Observable<boolean> {
    return this.store.select(AuthContextSelectors.selectHasAllPermissions(permissions));
  }
}
