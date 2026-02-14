import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { TenantAdminService } from '../../services/tenant-admin.service';
import { TenantService } from '../../services/tenant.service';
import * as TenantsActions from './tenants.actions';

@Injectable()
export class TenantsEffects {
  private actions$ = inject(Actions);
  private tenantAdminService = inject(TenantAdminService);
  private tenantService = inject(TenantService);

  // Load tenants
  loadTenants$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TenantsActions.loadTenants),
      switchMap(() =>
        this.tenantAdminService.getTenants().pipe(
          map(response =>
            TenantsActions.loadTenantsSuccess({ tenants: response.tenants })
          ),
          catchError(error =>
            of(TenantsActions.loadTenantsFailure({
              error: error.error?.error || error.message || 'Failed to load tenants'
            }))
          )
        )
      )
    )
  );

  // Create tenant
  createTenant$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TenantsActions.createTenant),
      switchMap(({ tenant }) =>
        this.tenantService.createTenant(tenant).pipe(
          map(response =>
            TenantsActions.createTenantSuccess({
              tenant: response.tenant,
              message: response.message || 'Tenant created successfully'
            })
          ),
          catchError(error =>
            of(TenantsActions.createTenantFailure({
              error: error.error?.error || error.message || 'Failed to create tenant'
            }))
          )
        )
      )
    )
  );

  // Reload tenants after successful create
  createTenantSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TenantsActions.createTenantSuccess),
      map(() => TenantsActions.loadTenants())
    )
  );

  // Update tenant
  updateTenant$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TenantsActions.updateTenant),
      switchMap(({ id, tenant }) =>
        this.tenantService.updateTenant(id, tenant).pipe(
          map(response =>
            TenantsActions.updateTenantSuccess({
              tenant: response.tenant,
              message: response.message || 'Tenant updated successfully'
            })
          ),
          catchError(error =>
            of(TenantsActions.updateTenantFailure({
              error: error.error?.error || error.message || 'Failed to update tenant'
            }))
          )
        )
      )
    )
  );

  // Reload tenants after successful update
  updateTenantSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TenantsActions.updateTenantSuccess),
      map(() => TenantsActions.loadTenants())
    )
  );

  // Toggle tenant status (activate/deactivate)
  toggleTenantStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TenantsActions.toggleTenantStatus),
      switchMap(({ id }) =>
        this.tenantService.toggleTenantStatus(id).pipe(
          map(response =>
            TenantsActions.toggleTenantStatusSuccess({
              tenant: response.tenant,
              message: response.message || 'Tenant status updated successfully'
            })
          ),
          catchError(error =>
            of(TenantsActions.toggleTenantStatusFailure({
              error: error.error?.error || error.message || 'Failed to toggle tenant status'
            }))
          )
        )
      )
    )
  );

  // Reload tenants after successful status toggle
  toggleTenantStatusSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TenantsActions.toggleTenantStatusSuccess),
      map(() => TenantsActions.loadTenants())
    )
  );

  // Delete tenant (if API endpoint exists)
  deleteTenant$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TenantsActions.deleteTenant),
      switchMap(({ id }) =>
        // Note: Add deleteTenant method to TenantService when backend supports it
        of(TenantsActions.deleteTenantFailure({
          error: 'Delete tenant functionality not yet implemented in backend'
        }))
        // When backend is ready, use:
        // this.tenantService.deleteTenant(id).pipe(
        //   map(response =>
        //     TenantsActions.deleteTenantSuccess({
        //       id,
        //       message: response.message || 'Tenant deleted successfully'
        //     })
        //   ),
        //   catchError(error =>
        //     of(TenantsActions.deleteTenantFailure({
        //       error: error.error?.error || error.message || 'Failed to delete tenant'
        //     }))
        //   )
        // )
      )
    )
  );

  // Reload tenants after successful delete
  deleteTenantSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TenantsActions.deleteTenantSuccess),
      map(() => TenantsActions.loadTenants())
    )
  );
}
