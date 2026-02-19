/**
 * Loading Interceptor
 * Shows/hides global loading indicator for HTTP requests
 */

import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private activeRequests = 0;

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip loading for specific endpoints
    if (this.shouldSkipLoading(request)) {
      return next.handle(request);
    }

    this.activeRequests++;
    this.updateLoadingState();

    return next.handle(request).pipe(
      finalize(() => {
        this.activeRequests--;
        this.updateLoadingState();
      })
    );
  }

  private shouldSkipLoading(request: HttpRequest<any>): boolean {
    // Skip loading indicator for polling endpoints
    return request.url.includes('/health') ||
           request.url.includes('/ping') ||
           request.headers.has('X-Skip-Loading');
  }

  private updateLoadingState(): void {
    const isLoading = this.activeRequests > 0;
    // Emit loading state to a service or update DOM
    document.body.classList.toggle('loading', isLoading);
  }
}
