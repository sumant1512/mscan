import { createAction, props } from '@ngrx/store';
import { Tag, CreateTagRequest } from '../../models/templates.model';

// Load tags for selected app
export const loadTags = createAction(
  '[Tags] Load Tags',
  props<{ appId: string }>()
);

export const loadTagsSuccess = createAction(
  '[Tags] Load Tags Success',
  props<{ tags: Tag[]; appId: string }>()
);

export const loadTagsFailure = createAction(
  '[Tags] Load Tags Failure',
  props<{ error: string }>()
);

// Load all tags (for all apps)
export const loadAllTags = createAction(
  '[Tags] Load All Tags'
);

export const loadAllTagsSuccess = createAction(
  '[Tags] Load All Tags Success',
  props<{ tags: Tag[] }>()
);

export const loadAllTagsFailure = createAction(
  '[Tags] Load All Tags Failure',
  props<{ error: string }>()
);

// Create tag
export const createTag = createAction(
  '[Tags] Create Tag',
  props<{ tag: CreateTagRequest }>()
);

export const createTagSuccess = createAction(
  '[Tags] Create Tag Success',
  props<{ tag: Tag }>()
);

export const createTagFailure = createAction(
  '[Tags] Create Tag Failure',
  props<{ error: string }>()
);

// Update tag
export const updateTag = createAction(
  '[Tags] Update Tag',
  props<{ id: string; changes: Partial<CreateTagRequest> }>()
);

export const updateTagSuccess = createAction(
  '[Tags] Update Tag Success',
  props<{ tag: Tag }>()
);

export const updateTagFailure = createAction(
  '[Tags] Update Tag Failure',
  props<{ error: string }>()
);

// Delete tag
export const deleteTag = createAction(
  '[Tags] Delete Tag',
  props<{ id: string }>()
);

export const deleteTagSuccess = createAction(
  '[Tags] Delete Tag Success',
  props<{ id: string }>()
);

export const deleteTagFailure = createAction(
  '[Tags] Delete Tag Failure',
  props<{ error: string }>()
);

// Set selected app (to filter tags)
export const setSelectedAppForTags = createAction(
  '[Tags] Set Selected App',
  props<{ appId: string | null }>()
);

// Clear error
export const clearTagsError = createAction(
  '[Tags] Clear Error'
);

// Clear tags state
export const clearTags = createAction(
  '[Tags] Clear Tags'
);
