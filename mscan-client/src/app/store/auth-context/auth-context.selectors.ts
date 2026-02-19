import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthContextState } from './auth-context.models';

export const selectAuthContextState = createFeatureSelector<AuthContextState>('authContext');

// Current user
export const selectCurrentUser = createSelector(selectAuthContextState, (state) => state.user);

// User role
export const selectUserRole = createSelector(selectCurrentUser, (user) => user?.role || null);

// User permissions
export const selectUserPermissions = createSelector(
  selectCurrentUser,
  (user) => user?.permissions || [],
);

// User tenant
export const selectUserTenant = createSelector(selectCurrentUser, (user) => ({
  id: user?.tenant?.id || null,
  name: user?.tenant?.tenant_name || null,
  subdomain: user?.tenant?.subdomain_slug || null,
}));

// Is user authenticated
export const selectIsAuthenticated = createSelector(selectCurrentUser, (user) => user !== null);

// Is super admin
export const selectIsSuperAdmin = createSelector(selectUserRole, (role) => role === 'SUPER_ADMIN');

// Is tenant admin
export const selectIsTenantAdmin = createSelector(
  selectUserRole,
  (role) => role === 'TENANT_ADMIN',
);

// Is tenant user
export const selectIsTenantUser = createSelector(selectUserRole, (role) => role === 'TENANT_USER');

// Loading state
export const selectAuthContextLoading = createSelector(
  selectAuthContextState,
  (state) => state.loading,
);

// Error state
export const selectAuthContextError = createSelector(
  selectAuthContextState,
  (state) => state.error,
);

// Loaded state
export const selectAuthContextLoaded = createSelector(
  selectAuthContextState,
  (state) => state.loaded,
);

// User has permission
export const selectHasPermission = (permission: string) =>
  createSelector(selectUserPermissions, selectUserRole, (permissions, role) => {
    // Super admin has all permissions
    if (role === 'SUPER_ADMIN') return true;
    // Check if user has the specific permission
    return permissions.includes(permission);
  });

// User has any of permissions
export const selectHasAnyPermission = (requiredPermissions: string[]) =>
  createSelector(selectUserPermissions, selectUserRole, (permissions, role) => {
    // Super admin has all permissions
    if (role === 'SUPER_ADMIN') return true;
    // Check if user has any of the required permissions
    return requiredPermissions.some((perm) => permissions.includes(perm));
  });

// User has all permissions
export const selectHasAllPermissions = (requiredPermissions: string[]) =>
  createSelector(selectUserPermissions, selectUserRole, (permissions, role) => {
    // Super admin has all permissions
    if (role === 'SUPER_ADMIN') return true;
    // Check if user has all required permissions
    return requiredPermissions.every((perm) => permissions.includes(perm));
  });
