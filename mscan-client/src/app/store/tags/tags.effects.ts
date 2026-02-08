import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import * as TagsActions from './tags.actions';
import { TagService } from '../../services/tag.service';

@Injectable()
export class TagsEffects {
  private actions$ = inject(Actions);
  private tagService = inject(TagService);

  loadTags$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TagsActions.loadTags),
      switchMap(({ appId }) =>
        this.tagService.getAllTags({ app_id: appId }).pipe(
          map((response) =>
            {
              console.log('Loaded tags for appId:', response);
              return TagsActions.loadTagsSuccess({
              tags: response.data,
              appId,
            })
          }
          ),
          catchError((error) =>
            of(
              TagsActions.loadTagsFailure({
                error: error.error?.message || 'Failed to load tags',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  loadAllTags$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TagsActions.loadAllTags),
      switchMap(() =>
        this.tagService.getAllTags().pipe(
          map((response) =>
            TagsActions.loadAllTagsSuccess({
              tags: response.data,
            }),
          ),
          catchError((error) =>
            of(
              TagsActions.loadAllTagsFailure({
                error: error.error?.message || 'Failed to load tags',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  createTag$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TagsActions.createTag),
      switchMap(({ tag }) =>
        this.tagService.createTag(tag).pipe(
          map((response) =>
            TagsActions.createTagSuccess({
              tag: response.data,
            }),
          ),
          catchError((error) =>
            of(
              TagsActions.createTagFailure({
                error: error.error?.message || 'Failed to create tag',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  updateTag$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TagsActions.updateTag),
      switchMap(({ id, changes }) =>
        this.tagService.updateTag(id, changes).pipe(
          map((response) =>
            TagsActions.updateTagSuccess({
              tag: response.data,
            }),
          ),
          catchError((error) =>
            of(
              TagsActions.updateTagFailure({
                error: error.error?.message || 'Failed to update tag',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  deleteTag$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TagsActions.deleteTag),
      switchMap(({ id }) =>
        this.tagService.deleteTag(id).pipe(
          map(() => TagsActions.deleteTagSuccess({ id })),
          catchError((error) =>
            of(
              TagsActions.deleteTagFailure({
                error: error.error?.message || 'Failed to delete tag',
              }),
            ),
          ),
        ),
      ),
    ),
  );
}
