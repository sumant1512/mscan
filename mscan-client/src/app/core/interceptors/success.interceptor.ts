/**
 * HTTP Success Interceptor
 * Automatically shows success messages for POST/PUT/PATCH/DELETE requests
 */

import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class SuccessInterceptor implements HttpInterceptor {
  private notification = inject(NotificationService);

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          this.handleSuccess(event, request);
        }
      })
    );
  }

  private handleSuccess(response: HttpResponse<any>, request: HttpRequest<any>): void {
    // Skip success messages for GET requests
    if (request.method === 'GET') {
      return;
    }

    // Skip success messages for silent requests
    if (request.headers.has('X-Silent-Success')) {
      return;
    }

    // Only show for successful status codes (2xx)
    if (response.status < 200 || response.status >= 300) {
      return;
    }

    // Extract message from response
    const message = response.body?.message || this.getDefaultSuccessMessage(request.method);

    if (message) {
      this.notification.success(message);
    }
  }

  private getDefaultSuccessMessage(method: string): string {
    switch (method) {
      case 'POST':
        return 'Created successfully';
      case 'PUT':
      case 'PATCH':
        return 'Updated successfully';
      case 'DELETE':
        return 'Deleted successfully';
      default:
        return 'Operation completed successfully';
    }
  }
}
