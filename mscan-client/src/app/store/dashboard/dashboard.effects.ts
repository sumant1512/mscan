import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { DashboardService } from '../../services/dashboard.service';
import * as DashboardActions from './dashboard.actions';

@Injectable()
export class DashboardEffects {
  private actions$ = inject(Actions);
  private dashboardService = inject(DashboardService);

  loadDashboardStats$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DashboardActions.loadDashboardStats, DashboardActions.refreshDashboardStats),
      switchMap(() =>
        this.dashboardService.getDashboardStats().pipe(
          map((response) => {
            if (response.status && response.data) {
              return DashboardActions.loadDashboardStatsSuccess({ stats: response.data });
            } else {
              return DashboardActions.loadDashboardStatsFailure({
                error: 'Failed to load dashboard stats'
              });
            }
          }),
          catchError((error: any) =>
            of(DashboardActions.loadDashboardStatsFailure({
              error: error.error?.message || error.message || 'Failed to load dashboard stats'
            }))
          )
        )
      )
    )
  );
}
