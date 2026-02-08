import { createReducer, on } from '@ngrx/store';
import { AuthContextState } from './auth-context.models';
import * as AuthContextActions from './auth-context.actions';

export const initialState: AuthContextState = {
  user: null,
  loading: false,
  error: null,
  loaded: false
};

export const authContextReducer = createReducer(
  initialState,

  // Load user context
  on(AuthContextActions.loadUserContext, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AuthContextActions.loadUserContextSuccess, (state, { user }) => ({
    ...state,
    user,
    loading: false,
    loaded: true,
    error: null
  })),

  on(AuthContextActions.loadUserContextFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    loaded: false
  })),

  // Update user context
  on(AuthContextActions.updateUserContext, (state, { user }) => ({
    ...state,
    user,
    loaded: true
  })),

  // Clear user context
  on(AuthContextActions.clearUserContext, () => initialState),

  // Clear error
  on(AuthContextActions.clearError, (state) => ({
    ...state,
    error: null
  }))
);
