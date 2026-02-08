import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { VerificationAppsFacade } from '../store/verification-apps';
import { VerificationApp } from '../store/verification-apps/verification-apps.models';

export interface AppContextState {
  selectedAppId: string | null;  // null means "All Apps"
  selectedApp: VerificationApp | null;
  availableApps: VerificationApp[];
}

@Injectable({
  providedIn: 'root'
})
export class AppContextService {
  subscription = new Subscription();

  private appContextSubject = new BehaviorSubject<AppContextState>({
    selectedAppId: null,
    selectedApp: null,
    availableApps: []
  });

  public appContext$: Observable<AppContextState> = this.appContextSubject.asObservable();

  constructor(
    private authService: AuthService,
    private verificationAppsFacade: VerificationAppsFacade
  ) {
    // Load apps when user changes (login/logout)
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadApps();
      } else {
        // Clear apps when user logs out
        this.appContextSubject.next({
          selectedAppId: null,
          selectedApp: null,
          availableApps: []
        });
      }
    });
  }

  /**
   * Load available verification apps for the current tenant
   */
  private loadApps(): void {
    // Subscribe to apps from store
    this.subscription.add(
      this.verificationAppsFacade.allApps$.subscribe(apps => {
        const currentState = this.appContextSubject.value;
        this.appContextSubject.next({
          ...currentState,
          availableApps: apps as any
        });
      })
    )
  }

  /**
   * Reload apps (call after creating/updating apps)
   */
  public reloadApps(): void {
    this.loadApps();
  }

  /**
   * Select a specific app (or null for "All Apps")
   */
  public selectApp(appId: string | null | undefined): void {
    // Handle undefined or null
    if (appId === undefined || appId === null) {
      appId = null;
    }

    const currentState = this.appContextSubject.value;
    const selectedApp = appId
      ? currentState.availableApps.find(app => app.verification_app_id === appId) || null
      : null;

    this.appContextSubject.next({
      ...currentState,
      selectedAppId: appId,
      selectedApp
    });

    // Persist to localStorage for page refresh
    if (appId !== null && appId !== undefined) {
      localStorage.setItem('selectedAppId', appId.toString());
    } else {
      localStorage.removeItem('selectedAppId');
    }
  }

  /**
   * Get current selected app ID
   */
  public getSelectedAppId(): string | null {
    return this.appContextSubject.value.selectedAppId;
  }

  /**
   * Get current selected app
   */
  public getSelectedApp(): VerificationApp | null {
    return this.appContextSubject.value.selectedApp;
  }

  /**
   * Get all available apps
   */
  public getAvailableApps(): VerificationApp[] {
    return this.appContextSubject.value.availableApps;
  }

  /**
   * Check if "All Apps" is selected
   */
  public isAllAppsSelected(): boolean {
    return this.appContextSubject.value.selectedAppId === null;
  }

  /**
   * Restore previously selected app from localStorage
   */
  public restoreSelection(): void {
    const savedAppId = localStorage.getItem('selectedAppId');
    if (savedAppId) {
      this.selectApp(savedAppId);
    }
  }

  /**
   * Clear app selection (select "All Apps")
   */
  public clearSelection(): void {
    this.selectApp(null);
  }
}
