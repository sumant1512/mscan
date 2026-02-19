import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { TemplateService } from '../../services/template.service';
import * as TemplatesActions from './templates.actions';

@Injectable()
export class TemplatesEffects {
  private actions$ = inject(Actions);
  private templateService = inject(TemplateService);

  loadTemplates$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TemplatesActions.loadTemplates),
      switchMap(({ filters }) =>
        this.templateService.getAllTemplates(filters).pipe(
          map((response) => 
             TemplatesActions.loadTemplatesSuccess({
              templates: response?.data?.templates || [],
              pagination: response?.data?.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
              },
            }),
          ),
          catchError((error) =>
            of(
              TemplatesActions.loadTemplatesFailure({
                error: error.error?.message || error.message || 'Failed to load templates',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  loadTemplate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TemplatesActions.loadTemplate),
      switchMap(({ id }) =>
        this.templateService.getTemplateById(id).pipe(
          map((response) => {
            if (!response.data) {
              throw new Error('Invalid response format');
            }
            return TemplatesActions.loadTemplateSuccess({
              template: response.data,
            });
          }),
          catchError((error) =>
            of(
              TemplatesActions.loadTemplateFailure({
                error: error.error?.message || error.message || 'Failed to load template',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  createTemplate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TemplatesActions.createTemplate),
      switchMap(({ template }) =>
        this.templateService.createTemplate(template).pipe(
          map((response) => {
            if (!response.status) {
              throw new Error('Internal Server Error');
            }
            return TemplatesActions.createTemplateSuccess({
              template: response.data,
            });
          }),
          catchError((error) =>
            of(
              TemplatesActions.createTemplateFailure({
                error: error.error?.message || error.message || 'Failed to create template',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  updateTemplate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TemplatesActions.updateTemplate),
      switchMap(({ id, changes }) =>
        this.templateService.updateTemplate(id, changes).pipe(
          map((response) => {
            if (!response.status) {
              throw new Error('Internal Server Error');
            }
            return TemplatesActions.updateTemplateSuccess({
              template: response.data,
            });
          }),
          catchError((error) =>
            of(
              TemplatesActions.updateTemplateFailure({
                error: error.error?.message || error.message || 'Failed to update template',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  deleteTemplate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TemplatesActions.deleteTemplate),
      switchMap(({ id }) =>
        this.templateService.deleteTemplate(id).pipe(
          map(() => TemplatesActions.deleteTemplateSuccess({ id })),
          catchError((error) =>
            of(
              TemplatesActions.deleteTemplateFailure({
                error: error.error?.message || error.message || 'Failed to delete template',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  toggleTemplateStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TemplatesActions.toggleTemplateStatus),
      switchMap(({ id }) =>
        this.templateService.toggleTemplateStatus(id).pipe(
          map((response) => {
            if (!response.status) {
              throw new Error('Internal Server Error');
            }
            return TemplatesActions.toggleTemplateStatusSuccess({
              template: response.data,
            });
          }),
          catchError((error) =>
            of(
              TemplatesActions.toggleTemplateStatusFailure({
                error: error.error?.message || error.message || 'Failed to toggle template status',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  // Reload templates after successful delete to ensure list is fresh
  reloadAfterDelete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TemplatesActions.deleteTemplateSuccess),
      map(() => TemplatesActions.loadTemplates({ filters: undefined }))
    )
  );
}
