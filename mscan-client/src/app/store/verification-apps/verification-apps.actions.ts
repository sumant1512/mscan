import { createAction, props } from '@ngrx/store';
import { VerificationApp } from './verification-apps.models';

// Load verification apps
export const loadVerificationApps = createAction(
  '[Verification Apps] Load Verification Apps'
);

export const loadVerificationAppsSuccess = createAction(
  '[Verification Apps] Load Verification Apps Success',
  props<{ apps: VerificationApp[] }>()
);

export const loadVerificationAppsFailure = createAction(
  '[Verification Apps] Load Verification Apps Failure',
  props<{ error: string }>()
);

// Select app
export const selectApp = createAction(
  '[Verification Apps] Select App',
  props<{ app: VerificationApp | null }>()
);

// Create app
export const createVerificationApp = createAction(
  '[Verification Apps] Create Verification App',
  props<{ app: Partial<VerificationApp> }>()
);

export const createVerificationAppSuccess = createAction(
  '[Verification Apps] Create Verification App Success',
  props<{ app: VerificationApp }>()
);

export const createVerificationAppFailure = createAction(
  '[Verification Apps] Create Verification App Failure',
  props<{ error: string }>()
);

// Update app
export const updateVerificationApp = createAction(
  '[Verification Apps] Update Verification App',
  props<{ id: string; changes: Partial<VerificationApp> }>()
);

export const updateVerificationAppSuccess = createAction(
  '[Verification Apps] Update Verification App Success',
  props<{ app: VerificationApp }>()
);

export const updateVerificationAppFailure = createAction(
  '[Verification Apps] Update Verification App Failure',
  props<{ error: string }>()
);

// Delete app
export const deleteVerificationApp = createAction(
  '[Verification Apps] Delete Verification App',
  props<{ id: string }>()
);

export const deleteVerificationAppSuccess = createAction(
  '[Verification Apps] Delete Verification App Success',
  props<{ id: string }>()
);

export const deleteVerificationAppFailure = createAction(
  '[Verification Apps] Delete Verification App Failure',
  props<{ error: string }>()
);

// Clear error
export const clearError = createAction(
  '[Verification Apps] Clear Error'
);
