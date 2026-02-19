import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { VerificationAppService } from './verification-app.service';
import * as VerificationAppsActions from './verification-apps.actions';

@Injectable()
export class VerificationAppsEffects {
  private actions$ = inject(Actions);
  private router = inject(Router);
  private verificationAppService = inject(VerificationAppService);

  loadVerificationApps$ = createEffect(() =>
    this.actions$.pipe(
      ofType(VerificationAppsActions.loadVerificationApps),
      switchMap(() =>
        this.verificationAppService.getVerificationApps().pipe(
          map((response) =>
            VerificationAppsActions.loadVerificationAppsSuccess({
              apps: response?.data?.apps || [],
            }),
          ),
          catchError((error) =>
            of(
              VerificationAppsActions.loadVerificationAppsFailure({
                error: error.error?.message || error.message || 'Failed to load verification apps',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  createVerificationApp$ = createEffect(() =>
    this.actions$.pipe(
      ofType(VerificationAppsActions.createVerificationApp),
      switchMap(({ app }) =>
        this.verificationAppService.createVerificationApp(app).pipe(
          map((response) => {
            if (!response.status) {
              throw new Error('Internal Server Error');
            }
            this.router.navigate(['/tenant/verification-app']);
            return VerificationAppsActions.loadVerificationApps();
          }),
          catchError((error) =>
            of(
              VerificationAppsActions.createVerificationAppFailure({
                error: error.error?.message || error.message || 'Failed to create verification app',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  updateVerificationApp$ = createEffect(() =>
    this.actions$.pipe(
      ofType(VerificationAppsActions.updateVerificationApp),
      switchMap(({ id, changes }) =>
        this.verificationAppService.updateVerificationApp(id, changes).pipe(
          map((response) => {
            if (!response.status) {
              throw new Error('Internal Server Error');
            }
            this.router.navigate(['/tenant/verification-app']);
            return VerificationAppsActions.loadVerificationApps();
          }),
          catchError((error) =>
            of(
              VerificationAppsActions.updateVerificationAppFailure({
                error: error.error?.message || error.message || 'Failed to update verification app',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  deleteVerificationApp$ = createEffect(() =>
    this.actions$.pipe(
      ofType(VerificationAppsActions.deleteVerificationApp),
      switchMap(({ id }) =>
        this.verificationAppService.deleteVerificationApp(id).pipe(
          map(() => {
            this.router.navigate(['/tenant/verification-app']);
            return VerificationAppsActions.loadVerificationApps();
          }),
          catchError((error) =>
            of(
              VerificationAppsActions.deleteVerificationAppFailure({
                error: error.error?.message || error.message || 'Failed to delete verification app',
              }),
            ),
          ),
        ),
      ),
    ),
  );
}
