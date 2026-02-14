/**
 * Inactivity Tracking Service
 * Monitors user activity and provides inactivity detection for session management
 */
import { Injectable, NgZone } from '@angular/core';
import { fromEvent, merge, Observable, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private lastActivityTime: number = Date.now();
  private readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
  private activitySubject = new Subject<void>();

  // Observable that emits when user becomes inactive
  public inactive$: Observable<void>;

  private isMonitoring = false;
  private eventListeners: (() => void)[] = [];

  constructor(private ngZone: NgZone) {
    this.inactive$ = this.activitySubject.asObservable();
  }

  /**
   * Start monitoring user activity
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.lastActivityTime = Date.now();

    // Run outside Angular zone for better performance
    this.ngZone.runOutsideAngular(() => {
      // Track various user activity events
      const events = [
        'mousedown',
        'mousemove',
        'keypress',
        'scroll',
        'touchstart',
        'click'
      ];

      // Add event listeners
      events.forEach(eventName => {
        const listener = () => this.resetActivityTimer();
        document.addEventListener(eventName, listener, { passive: true });
        this.eventListeners.push(() => document.removeEventListener(eventName, listener));
      });

      // Check inactivity every minute
      const intervalId = setInterval(() => {
        this.checkInactivity();
      }, 60 * 1000); // Check every minute

      this.eventListeners.push(() => clearInterval(intervalId));
    });

    console.log('InactivityService: Started monitoring user activity');
  }

  /**
   * Stop monitoring user activity
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    // Remove all event listeners
    this.eventListeners.forEach(removeListener => removeListener());
    this.eventListeners = [];
    this.isMonitoring = false;

    console.log('InactivityService: Stopped monitoring user activity');
  }

  /**
   * Reset activity timer (called on user interaction)
   */
  private resetActivityTimer(): void {
    this.lastActivityTime = Date.now();
  }

  /**
   * Manually reset activity timer (can be called from HTTP interceptor)
   */
  recordActivity(): void {
    this.lastActivityTime = Date.now();
  }

  /**
   * Check if user is currently inactive
   */
  private checkInactivity(): void {
    const inactiveDuration = Date.now() - this.lastActivityTime;

    if (inactiveDuration >= this.INACTIVITY_TIMEOUT) {
      this.ngZone.run(() => {
        console.log('InactivityService: User inactive for 30 minutes, emitting inactive event');
        this.activitySubject.next();
      });
    }
  }

  /**
   * Get time since last activity in milliseconds
   */
  getInactiveDuration(): number {
    return Date.now() - this.lastActivityTime;
  }

  /**
   * Check if user is currently active (active within the last 30 minutes)
   */
  isUserActive(): boolean {
    return this.getInactiveDuration() < this.INACTIVITY_TIMEOUT;
  }

  /**
   * Get last activity timestamp
   */
  getLastActivityTime(): number {
    return this.lastActivityTime;
  }

  /**
   * Get remaining time before inactivity timeout (in milliseconds)
   */
  getRemainingTime(): number {
    const remaining = this.INACTIVITY_TIMEOUT - this.getInactiveDuration();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Check if user will be inactive soon (within 5 minutes)
   */
  isNearInactivity(): boolean {
    const remaining = this.getRemainingTime();
    return remaining > 0 && remaining <= 5 * 60 * 1000; // 5 minutes
  }
}
