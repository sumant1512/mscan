/**
 * Retry Interceptor
 * Automatically retries failed HTTP requests
 */

import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { retry, retryWhen, mergeMap } from 'rxjs/operators';

@Injectable()
export class RetryInterceptor implements HttpInterceptor {
  private readonly maxRetries = 2;
  private readonly retryDelay = 1000; // 1 second

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only retry GET requests
    if (request.method !== 'GET') {
      return next.handle(request);
    }

    // Skip retry for specific endpoints
    if (this.shouldSkipRetry(request)) {
      return next.handle(request);
    }

    return next.handle(request).pipe(
      retryWhen(errors =>
        errors.pipe(
          mergeMap((error: HttpErrorResponse, index: number) => {
            // Only retry on network errors or 5xx errors
            if (index >= this.maxRetries || !this.shouldRetry(error)) {
              return throwError(() => error);
            }

            console.log(`Retrying request (${index + 1}/${this.maxRetries}):`, request.url);
            return timer(this.retryDelay * (index + 1));
          })
        )
      )
    );
  }

  private shouldRetry(error: HttpErrorResponse): boolean {
    // Retry on network errors or 5xx server errors
    return !error.status || error.status >= 500;
  }

  private shouldSkipRetry(request: HttpRequest<any>): boolean {
    return request.headers.has('X-Skip-Retry');
  }
}
