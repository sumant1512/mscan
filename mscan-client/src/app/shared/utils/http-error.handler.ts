/**
 * HTTP Error Handler Utility
 *
 * Centralized error handling for HTTP requests
 * Replaces ~80+ lines of duplicated error extraction and logging across 23+ components
 *
 * Features:
 * - Extracts user-friendly error messages from API responses
 * - Provides consistent error message format
 * - Optional console logging for development
 * - Support for both synchronous and observable error handling
 *
 * Usage:
 * ```typescript
 * // In component subscribe error callback:
 * error: (err) => {
 *   this.errorMessage = HttpErrorHandler.getMessage(err, 'Failed to load data');
 * }
 *
 * // With logging:
 * error: (err) => {
 *   this.errorMessage = HttpErrorHandler.getMessageWithLog(err, 'LoadProducts', 'Failed to load products');
 * }
 *
 * // With alert:
 * error: (err) => {
 *   HttpErrorHandler.alertError(err, 'Failed to save changes');
 * }
 * ```
 */

export class HttpErrorHandler {
  /**
   * Extract error message from various error formats
   * Handles: err.error.error, err.error.message, err.message
   */
  static getMessage(error: any, defaultMessage: string = 'An error occurred'): string {
    if (!error) {
      return defaultMessage;
    }

    // Try different error message paths
    return (
      error?.error?.error?.message || defaultMessage
    );
  }

  /**
   * Get error message with console logging
   * Useful during development
   */
  static getMessageWithLog(
    error: any,
    context: string,
    defaultMessage: string = 'An error occurred'
  ): string {
    const message = this.getMessage(error, defaultMessage);
    console.error(`${context} error:`, error);
    return message;
  }

  /**
   * Show alert dialog with error message
   * Used for critical errors that need immediate user attention
   */
  static alertError(error: any, defaultMessage: string = 'An error occurred'): void {
    const message = this.getMessage(error, defaultMessage);
    alert(message);
  }

  /**
   * Show alert with console logging
   */
  static alertErrorWithLog(
    error: any,
    context: string,
    defaultMessage: string = 'An error occurred'
  ): void {
    const message = this.getMessageWithLog(error, context, defaultMessage);
    alert(message);
  }

  /**
   * Get detailed error info for debugging
   * Returns object with all available error information
   */
  static getErrorDetails(error: any): {
    message: string;
    status?: number;
    statusText?: string;
    url?: string;
    details?: any;
  } {
    return {
      message: this.getMessage(error, 'Unknown error'),
      status: error?.status,
      statusText: error?.statusText,
      url: error?.url,
      details: error?.error
    };
  }

  /**
   * Check if error is a specific HTTP status code
   */
  static isStatus(error: any, statusCode: number): boolean {
    return error?.status === statusCode;
  }

  /**
   * Check if error is a client error (4xx)
   */
  static isClientError(error: any): boolean {
    return error?.status >= 400 && error?.status < 500;
  }

  /**
   * Check if error is a server error (5xx)
   */
  static isServerError(error: any): boolean {
    return error?.status >= 500 && error?.status < 600;
  }

  /**
   * Check if error is a network error
   */
  static isNetworkError(error: any): boolean {
    return error?.status === 0 || !navigator.onLine;
  }

  /**
   * Get user-friendly message based on error type
   */
  static getFriendlyMessage(error: any, defaultMessage?: string): string {
    if (this.isNetworkError(error)) {
      return 'Network error. Please check your internet connection.';
    }

    if (this.isStatus(error, 401)) {
      return 'Unauthorized. Please log in again.';
    }

    if (this.isStatus(error, 403)) {
      return 'You do not have permission to perform this action.';
    }

    if (this.isStatus(error, 404)) {
      return 'The requested resource was not found.';
    }

    if (this.isStatus(error, 409)) {
      return 'Conflict. The resource already exists or has been modified.';
    }

    if (this.isStatus(error, 422)) {
      return 'Validation error. Please check your input.';
    }

    if (this.isServerError(error)) {
      return 'Server error. Please try again later.';
    }

    return this.getMessage(error, defaultMessage || 'An error occurred');
  }
}
