import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TagsState } from './tags.models';

export const selectTagsState = createFeatureSelector<TagsState>('tags');

export const selectAllTags = createSelector(
  selectTagsState,
  (state) => state.tags
);

export const selectActiveTags = createSelector(
  selectAllTags,
  (tags) => tags.filter(tag => tag.is_active)
);

export const selectTagsForSelectedApp = createSelector(
  selectTagsState,
  (state) => {
    if (!state.selectedAppId) {
      return state.tags;
    }
    return state.tags.filter(tag => tag.verification_app_id === state.selectedAppId);
  }
);

export const selectActiveTagsForSelectedApp = createSelector(
  selectTagsForSelectedApp,
  (tags) => tags.filter(tag => tag.is_active)
);

export const selectSelectedAppId = createSelector(
  selectTagsState,
  (state) => state.selectedAppId
);

export const selectTagsLoading = createSelector(
  selectTagsState,
  (state) => state.loading
);

export const selectTagsError = createSelector(
  selectTagsState,
  (state) => state.error
);

export const selectTagsLoaded = createSelector(
  selectTagsState,
  (state) => state.loaded
);

export const selectTagById = (id: string) => createSelector(
  selectAllTags,
  (tags) => tags.find(tag => tag.id === id)
);

export const selectTagsByAppId = (appId: string) => createSelector(
  selectAllTags,
  (tags) => tags.filter(tag => tag.verification_app_id === appId)
);

export const selectActiveTagsByAppId = (appId: string) => createSelector(
  selectTagsByAppId(appId),
  (tags) => tags.filter(tag => tag.is_active)
);
