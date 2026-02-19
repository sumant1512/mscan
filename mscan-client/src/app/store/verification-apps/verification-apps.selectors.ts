import { createFeatureSelector, createSelector } from '@ngrx/store';
import { VerificationAppsState } from './verification-apps.models';

export const selectVerificationAppsState = createFeatureSelector<VerificationAppsState>('verificationApps');

export const selectAllVerificationApps = createSelector(
  selectVerificationAppsState,
  (state) => state.apps
);

export const selectActiveVerificationApps = createSelector(
  selectAllVerificationApps,
  (apps) => apps.filter(app => app.is_active)
);

export const selectSelectedApp = createSelector(
  selectVerificationAppsState,
  (state) => state.selectedApp
);

export const selectSelectedAppId = createSelector(
  selectVerificationAppsState,
  (state) => state.selectedAppId
);

export const selectVerificationAppsLoading = createSelector(
  selectVerificationAppsState,
  (state) => state.loading
);

export const selectVerificationAppsError = createSelector(
  selectVerificationAppsState,
  (state) => state.error
);

export const selectVerificationAppsLoaded = createSelector(
  selectVerificationAppsState,
  (state) => state.loaded
);

export const selectVerificationAppById = (id: string) => createSelector(
  selectAllVerificationApps,
  (apps) => apps.find(app => app.verification_app_id === id)
);

export const selectVerificationAppByCode = (code: string) => createSelector(
  selectAllVerificationApps,
  (apps) => apps.find(app => app.code === code)
);

export const selectSuccessMessage = createSelector(
  selectVerificationAppsState,
  (state) => state.successMessage
);

export const selectLastCreatedAppId = createSelector(
  selectVerificationAppsState,
  (state) => state.lastCreatedAppId
);

export const selectLastUpdatedAppId = createSelector(
  selectVerificationAppsState,
  (state) => state.lastUpdatedAppId
);

export const selectLastDeletedAppId = createSelector(
  selectVerificationAppsState,
  (state) => state.lastDeletedAppId
);
