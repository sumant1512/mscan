import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize, tap } from 'rxjs';

/**
 * Loading State Management Service
 *
 * Centralized loading state management for async operations
 * Replaces ~80 lines of manual loading boolean management across 27+ components
 *
 * Benefits:
 * - Single source of truth for loading state
 * - Automatic loading indicator management
 * - Observable-based for reactive templates
 * - No need for manual finalize() in components
 * - Support for multiple concurrent operations
 *
 * Usage in component:
 * ```typescript
 * // Option 1: Simple wrapping (most common)
 * loadData() {
 *   this.dataService.getData()
 *     .pipe(this.loadingService.wrapLoading())
 *     .subscribe({ ... });
 * }
 *
 * // In template:
 * <div *ngIf="loadingService.loading$ | async" class="spinner"></div>
 *
 * // Option 2: Manual control
 * loadData() {
 *   this.loadingService.show();
 *   this.dataService.getData()
 *     .pipe(finalize(() => this.loadingService.hide()))
 *     .subscribe({ ... });
 * }
 *
 * // Option 3: Named loading states (for multiple operations)
 * loadData() {
 *   this.dataService.getData()
 *     .pipe(this.loadingService.wrapLoading('data'))
 *     .subscribe({ ... });
 * }
 *
 * // Check specific loading state:
 * <div *ngIf="loadingService.isLoading('data') | async"></div>
 * ```
 */

@Injectable({
  providedIn: 'root'
})
export class LoadingService {

  private loadingSubject = new BehaviorSubject<boolean>(false);
  private loadingStateMap = new Map<string, BehaviorSubject<boolean>>();
  private loadingCounter = 0;

  /**
   * Observable for global loading state
   * Use in templates: *ngIf="loadingService.loading$ | async"
   */
  public readonly loading$ = this.loadingSubject.asObservable();

  /**
   * Show global loading indicator
   */
  show(): void {
    this.loadingCounter++;
    if (!this.loadingSubject.value) {
      this.loadingSubject.next(true);
    }
  }

  /**
   * Hide global loading indicator
   * Uses counter to handle multiple concurrent operations
   */
  hide(): void {
    this.loadingCounter = Math.max(0, this.loadingCounter - 1);
    if (this.loadingCounter === 0 && this.loadingSubject.value) {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Get current loading state (synchronous)
   */
  isCurrentlyLoading(): boolean {
    return this.loadingSubject.value;
  }

  /**
   * Wrap an observable to automatically show/hide loading
   * This is the most common usage pattern
   *
   * @param key - Optional key for named loading state
   * @returns RxJS operator to wrap the source observable
   */
  wrapLoading<T>(key?: string): (source: Observable<T>) => Observable<T> {
    return (source: Observable<T>) => {
      if (key) {
        return this.wrapNamedLoading(source, key);
      } else {
        return this.wrapGlobalLoading(source);
      }
    };
  }

  /**
   * Wrap observable with global loading state
   */
  private wrapGlobalLoading<T>(source: Observable<T>): Observable<T> {
    return source.pipe(
      tap(() => this.show()),
      finalize(() => this.hide())
    );
  }

  /**
   * Wrap observable with named loading state
   */
  private wrapNamedLoading<T>(source: Observable<T>, key: string): Observable<T> {
    return source.pipe(
      tap(() => this.showNamed(key)),
      finalize(() => this.hideNamed(key))
    );
  }

  /**
   * Show named loading state
   */
  private showNamed(key: string): void {
    let subject = this.loadingStateMap.get(key);
    if (!subject) {
      subject = new BehaviorSubject<boolean>(false);
      this.loadingStateMap.set(key, subject);
    }
    subject.next(true);
    this.show(); // Also increment global counter
  }

  /**
   * Hide named loading state
   */
  private hideNamed(key: string): void {
    const subject = this.loadingStateMap.get(key);
    if (subject) {
      subject.next(false);
    }
    this.hide(); // Also decrement global counter
  }

  /**
   * Get observable for a specific named loading state
   * Use in templates: *ngIf="loadingService.isLoading('data') | async"
   */
  isLoading(key: string): Observable<boolean> {
    let subject = this.loadingStateMap.get(key);
    if (!subject) {
      subject = new BehaviorSubject<boolean>(false);
      this.loadingStateMap.set(key, subject);
    }
    return subject.asObservable();
  }

  /**
   * Get current state of a named loading operation (synchronous)
   */
  isCurrentlyLoadingNamed(key: string): boolean {
    const subject = this.loadingStateMap.get(key);
    return subject ? subject.value : false;
  }

  /**
   * Reset all loading states
   * Useful for testing or handling errors
   */
  resetAll(): void {
    this.loadingCounter = 0;
    this.loadingSubject.next(false);
    this.loadingStateMap.forEach(subject => subject.next(false));
  }

  /**
   * Clear a specific named loading state
   */
  clearNamed(key: string): void {
    const subject = this.loadingStateMap.get(key);
    if (subject) {
      subject.next(false);
      this.loadingStateMap.delete(key);
    }
  }
}
