import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { VerificationApp } from './verification-apps.models';
import * as VerificationAppsActions from './verification-apps.actions';
import * as VerificationAppsSelectors from './verification-apps.selectors';

/**
 * Facade service for Verification Apps state management
 * 
 * This service provides a simplified API for components to interact
 * with the NgRx store without directly dispatching actions or selecting state.
 * 
 * Usage in components:
 * 
 * @example
 * ```typescript
 * export class MyComponent implements OnInit {
 *   private facade = inject(VerificationAppsFacade);
 *   
 *   apps$ = this.facade.allApps$;
 *   loading$ = this.facade.loading$;
 *   
 *   ngOnInit() {
 *     this.facade.loadApps();
 *   }
 *   
 *   onSelectApp(app: VerificationApp) {
 *     this.facade.selectApp(app);
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class VerificationAppsFacade {
  private store = inject(Store);

  // Selectors - Observables for component consumption
  
  /** All verification apps */
  readonly allApps$: Observable<VerificationApp[]> = this.store.select(
    VerificationAppsSelectors.selectAllVerificationApps
  );

  /** Active verification apps only */
  readonly activeApps$: Observable<VerificationApp[]> = this.store.select(
    VerificationAppsSelectors.selectActiveVerificationApps
  );

  /** Currently selected app */
  readonly selectedApp$: Observable<VerificationApp | null> = this.store.select(
    VerificationAppsSelectors.selectSelectedApp
  );

    /** Currently selected app */
  readonly selectedAppId$: Observable<string | null> = this.store.select(
    VerificationAppsSelectors.selectSelectedAppId
  );

  /** Loading state */
  readonly loading$: Observable<boolean> = this.store.select(
    VerificationAppsSelectors.selectVerificationAppsLoading
  );

  /** Error state */
  readonly error$: Observable<string | null> = this.store.select(
    VerificationAppsSelectors.selectVerificationAppsError
  );

  /** Whether apps have been loaded */
  readonly loaded$: Observable<boolean> = this.store.select(
    VerificationAppsSelectors.selectVerificationAppsLoaded
  );

  /** Success message from operations */
  readonly successMessage$: Observable<string | null> = this.store.select(
    VerificationAppsSelectors.selectSuccessMessage
  );

  /** Last created app ID for navigation */
  readonly lastCreatedAppId$: Observable<string | null> = this.store.select(
    VerificationAppsSelectors.selectLastCreatedAppId
  );

  /** Last updated app ID for navigation */
  readonly lastUpdatedAppId$: Observable<string | null> = this.store.select(
    VerificationAppsSelectors.selectLastUpdatedAppId
  );

  /** Last deleted app ID */
  readonly lastDeletedAppId$: Observable<string | null> = this.store.select(
    VerificationAppsSelectors.selectLastDeletedAppId
  );

  // Action dispatchers

  /**
   * Load all verification apps from the API
   * 
   * @example
   * ```typescript
   * ngOnInit() {
   *   this.facade.loadApps();
   * }
   * ```
   */
  loadApps(): void {
    this.store.dispatch(VerificationAppsActions.loadVerificationApps());
  }

  /**
   * Select a verification app (sets it as the currently selected app)
   * 
   * @param app - The app to select, or null to deselect
   * 
   * @example
   * ```typescript
   * onAppClick(app: VerificationApp) {
   *   this.facade.selectApp(app);
   * }
   * 
   * onClearSelection() {
   *   this.facade.selectApp(null);
   * }
   * ```
   */
  selectApp(app: VerificationApp | null): void {
    this.store.dispatch(VerificationAppsActions.selectApp({ app }));
    this.store.dispatch(VerificationAppsActions.setSelectedAppId({ appId: app ? app.verification_app_id : null }));
  }

  /**
   * Create a new verification app
   * 
   * @param app - Partial app data for creation
   * 
   * @example
   * ```typescript
   * onCreateApp(formData: any) {
   *   this.facade.createApp({
   *     app_name: formData.name,
   *     app_code: formData.code,
   *     status: 'active'
   *   });
   * }
   * ```
   */
  createApp(app: Partial<VerificationApp>): void {
    this.store.dispatch(VerificationAppsActions.createVerificationApp({ app }));
  }

  /**
   * Update an existing verification app
   * 
   * @param id - The app ID to update
   * @param changes - Partial app data with changes
   * 
   * @example
   * ```typescript
   * onUpdateApp(appId: string, formData: any) {
   *   this.facade.updateApp(appId, {
   *     app_name: formData.name,
   *     description: formData.description
   *   });
   * }
   * ```
   */
  updateApp(id: string, changes: Partial<VerificationApp>): void {
    this.store.dispatch(VerificationAppsActions.updateVerificationApp({ id, changes }));
  }

  /**
   * Delete a verification app
   * 
   * @param id - The app ID to delete
   * 
   * @example
   * ```typescript
   * onDeleteApp(appId: string) {
   *   if (confirm('Are you sure?')) {
   *     this.facade.deleteApp(appId);
   *   }
   * }
   * ```
   */
  deleteApp(id: string): void {
    this.store.dispatch(VerificationAppsActions.deleteVerificationApp({ id }));
  }

  /**
   * Clear any error messages
   * 
   * @example
   * ```typescript
   * onDismissError() {
   *   this.facade.clearError();
   * }
   * ```
   */
  clearError(): void {
    this.store.dispatch(VerificationAppsActions.clearError());
  }

  // Convenience methods for dynamic selectors

  /**
   * Get a specific app by ID as an observable
   * 
   * @param id - The app ID
   * @returns Observable of the app or undefined
   * 
   * @example
   * ```typescript
   * app$ = this.facade.getAppById(this.appId);
   * ```
   */
  getAppById(id: string): Observable<VerificationApp | undefined> {
    return this.store.select(VerificationAppsSelectors.selectVerificationAppById(id));
  }

  /**
   * Get a specific app by code as an observable
   * 
   * @param code - The app code
   * @returns Observable of the app or undefined
   * 
   * @example
   * ```typescript
   * app$ = this.facade.getAppByCode('app1');
   * ```
   */
  getAppByCode(code: string): Observable<VerificationApp | undefined> {
    return this.store.select(VerificationAppsSelectors.selectVerificationAppByCode(code));
  }
}
