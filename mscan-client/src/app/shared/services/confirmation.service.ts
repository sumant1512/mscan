import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

/**
 * Confirmation Dialog Service
 *
 * Centralized confirmation and alert dialog management
 * Replaces browser alert() and confirm() calls across 6+ components
 *
 * Benefits:
 * - Consistent UX for confirmations
 * - Observable-based API for easier integration with RxJS
 * - Can be easily replaced with custom modal implementation later
 * - Testable (mock in tests)
 *
 * Usage:
 * ```typescript
 * // Simple confirmation
 * this.confirmationService.confirm('Are you sure?')
 *   .pipe(
 *     filter(confirmed => confirmed),
 *     switchMap(() => this.service.deleteItem(id))
 *   )
 *   .subscribe();
 *
 * // With custom title
 * this.confirmationService.confirm(
 *   'This action cannot be undone. Continue?',
 *   'Delete Item'
 * ).subscribe(confirmed => {
 *   if (confirmed) {
 *     // perform action
 *   }
 * });
 *
 * // Alert
 * this.confirmationService.alert('Changes saved successfully!')
 *   .subscribe();
 * ```
 */

@Injectable({
  providedIn: 'root'
})
export class ConfirmationService {

  /**
   * Show confirmation dialog
   * Returns Observable<boolean> - true if user confirms, false if cancelled
   *
   * @param message - Confirmation message to display
   * @param title - Optional title (currently not used with browser confirm, but useful for future custom modals)
   */
  confirm(message: string, title?: string): Observable<boolean> {
    // TODO: Replace with custom modal component for better UX
    // For now, using browser's native confirm dialog
    const result = window.confirm(message);
    return of(result);
  }

  /**
   * Show alert dialog
   * Returns Observable<void> for easier chaining
   *
   * @param message - Alert message to display
   * @param title - Optional title (currently not used with browser alert, but useful for future custom modals)
   */
  alert(message: string, title?: string): Observable<void> {
    // TODO: Replace with custom modal component for better UX
    // For now, using browser's native alert dialog
    window.alert(message);
    return of(void 0);
  }

  /**
   * Show confirmation with delete action styling/messaging
   * Convenience method for destructive actions
   *
   * @param itemName - Name of the item being deleted
   */
  confirmDelete(itemName: string): Observable<boolean> {
    return this.confirm(
      `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      'Confirm Delete'
    );
  }

  /**
   * Show confirmation for approval action
   * Convenience method for approval workflows
   *
   * @param itemDescription - Description of what's being approved
   */
  confirmApprove(itemDescription: string): Observable<boolean> {
    return this.confirm(
      `Are you sure you want to approve ${itemDescription}?`,
      'Confirm Approval'
    );
  }

  /**
   * Show confirmation for rejection action
   * Convenience method for rejection workflows
   *
   * @param itemDescription - Description of what's being rejected
   */
  confirmReject(itemDescription: string): Observable<boolean> {
    return this.confirm(
      `Are you sure you want to reject ${itemDescription}?`,
      'Confirm Rejection'
    );
  }

  /**
   * Show confirmation for activation/deactivation toggle
   * Convenience method for status toggle actions
   *
   * @param action - 'activate' or 'deactivate'
   * @param itemName - Name of the item being toggled
   */
  confirmToggle(action: 'activate' | 'deactivate', itemName: string): Observable<boolean> {
    return this.confirm(
      `Are you sure you want to ${action} "${itemName}"?`,
      `Confirm ${action === 'activate' ? 'Activation' : 'Deactivation'}`
    );
  }

  /**
   * Show success alert
   * Convenience method for success messages
   *
   * @param message - Success message
   */
  alertSuccess(message: string): Observable<void> {
    return this.alert(message, 'Success');
  }

  /**
   * Show error alert
   * Convenience method for error messages
   *
   * @param message - Error message
   */
  alertError(message: string): Observable<void> {
    return this.alert(message, 'Error');
  }
}
