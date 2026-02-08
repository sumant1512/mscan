import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import * as AuthContextActions from './auth-context.actions';

@Injectable()
export class AuthContextEffects {
  private actions$ = inject(Actions);
  private authService = inject(AuthService);

  loadUserContext$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthContextActions.loadUserContext),
      switchMap(() =>
        this.authService.getUserContext().pipe(
          map((response) => {
            if (response.success && response.data) {
              return AuthContextActions.loadUserContextSuccess({ user: response.data });
            } else {
              return AuthContextActions.loadUserContextFailure({
                error: 'Failed to load user context'
              });
            }
          }),
          catchError((error: any) =>
            of(AuthContextActions.loadUserContextFailure({
              error: error.error?.message || error.message || 'Failed to load user context'
            }))
          )
        )
      )
    )
  );
}
