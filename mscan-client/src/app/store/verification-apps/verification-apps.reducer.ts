import { createReducer, on } from '@ngrx/store';
import { VerificationAppsState } from './verification-apps.models';
import * as VerificationAppsActions from './verification-apps.actions';

export const initialState: VerificationAppsState = {
  apps: [],
  selectedApp: null,
  loading: false,
  error: null,
  loaded: false
};

export const verificationAppsReducer = createReducer(
  initialState,

  // Load apps
  on(VerificationAppsActions.loadVerificationApps, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(VerificationAppsActions.loadVerificationAppsSuccess, (state, { apps }) => ({
    ...state,
    apps,
    loading: false,
    loaded: true,
    error: null
  })),

  on(VerificationAppsActions.loadVerificationAppsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    loaded: false
  })),

  // Select app
  on(VerificationAppsActions.selectApp, (state, { app }) => ({
    ...state,
    selectedApp: app
  })),

  // Create app
  on(VerificationAppsActions.createVerificationApp, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(VerificationAppsActions.createVerificationAppSuccess, (state, { app }) => ({
    ...state,
    apps: [...state.apps, app],
    loading: false,
    error: null
  })),

  on(VerificationAppsActions.createVerificationAppFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update app
  on(VerificationAppsActions.updateVerificationApp, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(VerificationAppsActions.updateVerificationAppSuccess, (state, { app }) => ({
    ...state,
    apps: state.apps.map(a => a.verification_app_id === app.verification_app_id ? app : a),
    selectedApp: state.selectedApp?.verification_app_id === app.verification_app_id ? app : state.selectedApp,
    loading: false,
    error: null
  })),

  on(VerificationAppsActions.updateVerificationAppFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Delete app
  on(VerificationAppsActions.deleteVerificationApp, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(VerificationAppsActions.deleteVerificationAppSuccess, (state, { id }) => ({
    ...state,
    apps: state.apps.filter(a => a.verification_app_id !== id),
    selectedApp: state.selectedApp?.verification_app_id === id ? null : state.selectedApp,
    loading: false,
    error: null
  })),

  on(VerificationAppsActions.deleteVerificationAppFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Clear error
  on(VerificationAppsActions.clearError, (state) => ({
    ...state,
    error: null
  }))
);
