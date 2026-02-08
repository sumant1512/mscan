import { createReducer, on } from '@ngrx/store';
import { TagsState } from './tags.models';
import * as TagsActions from './tags.actions';

export const initialState: TagsState = {
  tags: [],
  selectedAppId: null,
  loading: false,
  error: null,
  loaded: false
};

export const tagsReducer = createReducer(
  initialState,

  // Load tags for specific app
  on(TagsActions.loadTags, (state, { appId }) => ({
    ...state,
    loading: true,
    error: null,
    selectedAppId: appId
  })),

  on(TagsActions.loadTagsSuccess, (state, { tags, appId }) => ({
    ...state,
    tags,
    selectedAppId: appId,
    loading: false,
    loaded: true,
    error: null
  })),

  on(TagsActions.loadTagsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    loaded: false
  })),

  // Load all tags
  on(TagsActions.loadAllTags, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TagsActions.loadAllTagsSuccess, (state, { tags }) => ({
    ...state,
    tags,
    loading: false,
    loaded: true,
    error: null
  })),

  on(TagsActions.loadAllTagsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    loaded: false
  })),

  // Create tag
  on(TagsActions.createTag, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TagsActions.createTagSuccess, (state, { tag }) => ({
    ...state,
    tags: [...state.tags, tag],
    loading: false,
    error: null
  })),

  on(TagsActions.createTagFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update tag
  on(TagsActions.updateTag, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TagsActions.updateTagSuccess, (state, { tag }) => ({
    ...state,
    tags: state.tags.map(t => t.id === tag.id ? tag : t),
    loading: false,
    error: null
  })),

  on(TagsActions.updateTagFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Delete tag
  on(TagsActions.deleteTag, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TagsActions.deleteTagSuccess, (state, { id }) => ({
    ...state,
    tags: state.tags.filter(t => t.id !== id),
    loading: false,
    error: null
  })),

  on(TagsActions.deleteTagFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Set selected app
  on(TagsActions.setSelectedAppForTags, (state, { appId }) => ({
    ...state,
    selectedAppId: appId
  })),

  // Clear error
  on(TagsActions.clearTagsError, (state) => ({
    ...state,
    error: null
  })),

  // Clear tags
  on(TagsActions.clearTags, () => initialState)
);
