import { createReducer, on } from '@ngrx/store';
import { VerificationAppsState } from './verification-apps.models';
import * as VerificationAppsActions from './verification-apps.actions';

export const initialState: VerificationAppsState = {
  apps: [],
  selectedApp: null,
  selectedAppId: null,
  loading: false,
  error: null,
  loaded: false,
  successMessage: null,
  lastCreatedAppId: null,
  lastUpdatedAppId: null,
  lastDeletedAppId: null
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
    selectedApp: app,
    selectedAppId: app?.verification_app_id || null
  })),

  // Create app
  on(VerificationAppsActions.createVerificationApp, (state) => ({
    ...state,
    loading: true,
    error: null,
    successMessage: null,
    lastCreatedAppId: null
  })),

  on(VerificationAppsActions.createVerificationAppSuccess, (state, { app }) => ({
    ...state,
    apps: [...state.apps, app],
    loading: false,
    error: null,
    successMessage: 'Verification app created successfully',
    lastCreatedAppId: app.verification_app_id
  })),

  on(VerificationAppsActions.createVerificationAppFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    successMessage: null,
    lastCreatedAppId: null
  })),

  // Update app
  on(VerificationAppsActions.updateVerificationApp, (state) => ({
    ...state,
    loading: true,
    error: null,
    successMessage: null,
    lastUpdatedAppId: null
  })),

  on(VerificationAppsActions.updateVerificationAppSuccess, (state, { app }) => ({
    ...state,
    apps: state.apps.map(a => a.verification_app_id === app.verification_app_id ? app : a),
    selectedApp: state.selectedApp?.verification_app_id === app.verification_app_id ? app : state.selectedApp,
    loading: false,
    error: null,
    successMessage: 'Verification app updated successfully',
    lastUpdatedAppId: app.verification_app_id
  })),

  on(VerificationAppsActions.updateVerificationAppFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    successMessage: null,
    lastUpdatedAppId: null
  })),

  // Delete app
  on(VerificationAppsActions.deleteVerificationApp, (state) => ({
    ...state,
    loading: true,
    error: null,
    successMessage: null,
    lastDeletedAppId: null
  })),

  on(VerificationAppsActions.deleteVerificationAppSuccess, (state, { id }) => ({
    ...state,
    apps: state.apps.filter(a => a.verification_app_id !== id),
    selectedApp: state.selectedApp?.verification_app_id === id ? null : state.selectedApp,
    loading: false,
    error: null,
    successMessage: 'Verification app deleted successfully',
    lastDeletedAppId: id
  })),

  on(VerificationAppsActions.deleteVerificationAppFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    successMessage: null,
    lastDeletedAppId: null
  })),

  // Clear error
  on(VerificationAppsActions.clearError, (state) => ({
    ...state,
    error: null,
    successMessage: null
  }))
);
