import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { VerificationAppService } from './verification-app.service';
import * as VerificationAppsActions from './verification-apps.actions';

@Injectable()
export class VerificationAppsEffects {
  private actions$ = inject(Actions);
  private verificationAppService = inject(VerificationAppService);

  loadVerificationApps$ = createEffect(() =>
    this.actions$.pipe(
      ofType(VerificationAppsActions.loadVerificationApps),
      switchMap(() =>
        this.verificationAppService.getVerificationApps().pipe(
          map(response => 
            VerificationAppsActions.loadVerificationAppsSuccess({ apps: response.apps })
          ),
          catchError(error =>
            of(VerificationAppsActions.loadVerificationAppsFailure({ 
              error: error.error?.message || error.message || 'Failed to load verification apps' 
            }))
          )
        )
      )
    )
  );

  createVerificationApp$ = createEffect(() =>
    this.actions$.pipe(
      ofType(VerificationAppsActions.createVerificationApp),
      switchMap(({ app }) =>
        this.verificationAppService.createVerificationApp(app).pipe(
          map(response =>
            VerificationAppsActions.createVerificationAppSuccess({ app: response.app })
          ),
          catchError(error =>
            of(VerificationAppsActions.createVerificationAppFailure({ 
              error: error.error?.message || error.message || 'Failed to create verification app' 
            }))
          )
        )
      )
    )
  );

  updateVerificationApp$ = createEffect(() =>
    this.actions$.pipe(
      ofType(VerificationAppsActions.updateVerificationApp),
      switchMap(({ id, changes }) =>
        this.verificationAppService.updateVerificationApp(id, changes).pipe(
          map(response =>
            VerificationAppsActions.updateVerificationAppSuccess({ app: response.app })
          ),
          catchError(error =>
            of(VerificationAppsActions.updateVerificationAppFailure({ 
              error: error.error?.message || error.message || 'Failed to update verification app' 
            }))
          )
        )
      )
    )
  );

  deleteVerificationApp$ = createEffect(() =>
    this.actions$.pipe(
      ofType(VerificationAppsActions.deleteVerificationApp),
      switchMap(({ id }) =>
        this.verificationAppService.deleteVerificationApp(id).pipe(
          map(() =>
            VerificationAppsActions.deleteVerificationAppSuccess({ id })
          ),
          catchError(error =>
            of(VerificationAppsActions.deleteVerificationAppFailure({ 
              error: error.error?.message || error.message || 'Failed to delete verification app' 
            }))
          )
        )
      )
    )
  );
}
