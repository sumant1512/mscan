import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { TenantAdminService } from '../../services/tenant-admin.service';
import * as TenantsActions from './tenants.actions';

@Injectable()
export class TenantsEffects {
  private actions$ = inject(Actions);
  private tenantAdminService = inject(TenantAdminService);

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
}
