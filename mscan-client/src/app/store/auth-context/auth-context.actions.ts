import { createAction, props } from '@ngrx/store';
import { User } from '../../models';

// Load user context
export const loadUserContext = createAction(
  '[Auth Context] Load User Context'
);

export const loadUserContextSuccess = createAction(
  '[Auth Context] Load User Context Success',
  props<{ user: User }>()
);

export const loadUserContextFailure = createAction(
  '[Auth Context] Load User Context Failure',
  props<{ error: string }>()
);

// Update user context (after profile updates)
export const updateUserContext = createAction(
  '[Auth Context] Update User Context',
  props<{ user: User }>()
);

// Clear user context (on logout)
export const clearUserContext = createAction(
  '[Auth Context] Clear User Context'
);

// Clear error
export const clearError = createAction(
  '[Auth Context] Clear Error'
);
