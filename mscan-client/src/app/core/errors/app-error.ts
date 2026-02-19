/**
 * Application Error Classes
 * Centralized error handling for the frontend
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public errorCode?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network error occurred') {
    super(message, 0, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

/**
 * Parse error from HTTP response
 */
export function parseError(error: any): AppError {
  // Network error
  if (!error.status) {
    return new NetworkError(error.message || 'Network error occurred');
  }

  const message = error.error?.error?.message || error.error?.message || error.message || 'An error occurred';
  const statusCode = error.status || 500;
  const errorCode = error.error?.error?.code || error.error?.code;
  const details = error.error?.error?.details || error.error?.details;

  switch (statusCode) {
    case 400:
      return new ValidationError(message, details);
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new AuthorizationError(message);
    case 404:
      return new NotFoundError(message);
    case 409:
      return new ConflictError(message, details);
    default:
      return new AppError(message, statusCode, errorCode, details);
  }
}
