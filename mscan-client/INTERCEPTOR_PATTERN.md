# Global Interceptor Pattern - No Manual Error Handling!

## Overview

All HTTP errors and success messages are handled automatically by interceptors. Components and services **don't need any error handling code**.

## Architecture

```
Component
    ↓
  Service (just makes HTTP call)
    ↓
HTTP Interceptors (handle everything)
    ├── LoadingInterceptor (shows/hides loader)
    ├── RetryInterceptor (retries failed requests)
    ├── Request (goes to server)
    ├── ErrorInterceptor (catches errors, shows notification)
    └── SuccessInterceptor (shows success message)
    ↓
  Component (just receives data)
```

## Interceptors Created

### 1. ErrorInterceptor
- Catches ALL HTTP errors automatically
- Parses errors into AppError types
- Shows error notification automatically
- Handles authentication (clears token, redirects to login)
- Handles validation errors
- Re-throws error if component needs custom handling

### 2. SuccessInterceptor
- Shows success messages for POST/PUT/PATCH/DELETE
- Uses message from API response or generates default
- Skips GET requests (no notification noise)

### 3. LoadingInterceptor
- Shows global loading indicator
- Counts active requests
- Hides when all requests complete

### 4. RetryInterceptor
- Auto-retries failed GET requests
- Exponential backoff
- Only retries network errors and 5xx errors

## Before vs After

### ❌ OLD WAY - Manual Error Handling Everywhere

```typescript
// Component
requestCredits() {
  this.loading = true;
  this.creditService.requestCredits(this.amount, this.justification).subscribe({
    next: (result) => {
      this.loading = false;
      this.showSuccessMessage('Credit request submitted successfully');
      this.dialogRef.close(true);
    },
    error: (error: any) => {
      this.loading = false;
      if (error.status === 401) {
        this.showErrorMessage('Session expired. Please login again.');
        this.router.navigate(['/login']);
      } else if (error.status === 400) {
        this.showErrorMessage(error.error?.message || 'Invalid request');
      } else if (error.status === 409) {
        this.showErrorMessage('You already have a pending request');
      } else {
        this.showErrorMessage('Failed to submit request. Please try again.');
      }
    }
  });
}

// Service
requestCredits(amount: number, justification?: string): Observable<CreditRequest> {
  return this.http.post<ApiResponse<{ request: CreditRequest }>>(
    `${this.apiUrl}/request`,
    { requested_amount: amount, justification }
  ).pipe(
    map(response => {
      if (!response.success) {
        throw new Error(response.error?.message || 'Request failed');
      }
      return response.data?.request;
    }),
    catchError((error: HttpErrorResponse) => {
      const appError = parseError(error);
      return throwError(() => appError);
    })
  );
}
```

### ✅ NEW WAY - Zero Error Handling!

```typescript
// Component - SO SIMPLE!
requestCredits() {
  this.creditService.requestCredits(this.amount, this.justification).subscribe({
    next: () => {
      this.dialogRef.close(true); // That's it!
    }
  });
}

// Service - SO CLEAN!
requestCredits(amount: number, justification?: string): Observable<CreditRequest> {
  return this.http.post<any>(
    `${this.apiUrl}/request`,
    { requested_amount: amount, justification }
  ).pipe(
    map(response => response.data?.request || response.request)
  );
}
```

**What happens automatically:**
- ✅ Loading indicator shows/hides
- ✅ Error caught and displayed as toast
- ✅ Success message shown
- ✅ Auth errors handled (redirect to login)
- ✅ Validation errors displayed
- ✅ Network errors retried

## Component Examples

### Example 1: Simple List Loading

```typescript
// ❌ OLD WAY
loadRequests() {
  this.loading = true;
  this.error = null;

  this.creditService.getRequests({ status: 'pending' }).subscribe({
    next: (data) => {
      this.loading = false;
      this.requests = data.requests;
      this.pagination = data.pagination;
    },
    error: (error) => {
      this.loading = false;
      this.error = 'Failed to load requests';
      console.error(error);
    }
  });
}

// ✅ NEW WAY
loadRequests() {
  this.creditService.getRequests({ status: 'pending' }).subscribe({
    next: (data) => {
      this.requests = data.requests;
      this.pagination = data.pagination;
    }
  });
}
```

### Example 2: Form Submission

```typescript
// ❌ OLD WAY
onSubmit() {
  if (this.form.invalid) {
    this.showErrorMessage('Please fill all required fields');
    return;
  }

  this.submitting = true;
  this.error = null;

  this.tenantService.createTenant(this.form.value).subscribe({
    next: (tenant) => {
      this.submitting = false;
      this.showSuccessMessage('Tenant created successfully');
      this.router.navigate(['/tenants', tenant.id]);
    },
    error: (error) => {
      this.submitting = false;
      if (error.status === 409) {
        this.showErrorMessage('Tenant with this email already exists');
      } else if (error.status === 400) {
        this.showErrorMessage(error.error?.message || 'Invalid data');
      } else {
        this.showErrorMessage('Failed to create tenant');
      }
    }
  });
}

// ✅ NEW WAY
onSubmit() {
  if (this.form.invalid) {
    markFormGroupTouched(this.form); // Utility from form.utils
    return;
  }

  this.tenantService.createTenant(this.form.value).subscribe({
    next: (tenant) => {
      this.router.navigate(['/tenants', tenant.id]);
    }
  });
}
```

### Example 3: Delete Confirmation

```typescript
// ❌ OLD WAY
deleteTemplate(id: string) {
  if (!confirm('Are you sure you want to delete this template?')) {
    return;
  }

  this.deleting = true;

  this.templateService.deleteTemplate(id).subscribe({
    next: () => {
      this.deleting = false;
      this.showSuccessMessage('Template deleted successfully');
      this.loadTemplates(); // Refresh list
    },
    error: (error) => {
      this.deleting = false;
      if (error.status === 409) {
        this.showErrorMessage('Cannot delete template with existing products');
      } else {
        this.showErrorMessage('Failed to delete template');
      }
    }
  });
}

// ✅ NEW WAY
deleteTemplate(id: string) {
  if (!confirm('Are you sure you want to delete this template?')) {
    return;
  }

  this.templateService.deleteTemplate(id).subscribe({
    next: () => {
      this.loadTemplates(); // Refresh list
    }
  });
}
```

## Special Cases

### Silent Requests (No Notifications)

For background polling or silent operations:

```typescript
// Add X-Silent-Error header to skip error notifications
this.http.get('/api/health', {
  headers: { 'X-Silent-Error': 'true' }
}).subscribe();

// Add X-Silent-Success header to skip success notifications
this.http.post('/api/analytics/track', data, {
  headers: { 'X-Silent-Success': 'true' }
}).subscribe();
```

### Custom Error Handling

If you need custom error handling for a specific case:

```typescript
this.creditService.approveRequest(id).subscribe({
  next: (result) => {
    // Do something with result
    this.updateBalance(result.new_balance);
  },
  error: (error: AppError) => {
    // Custom handling (error already displayed by interceptor)
    if (error.errorCode === 'INSUFFICIENT_CREDITS') {
      this.openTopUpDialog();
    }
  }
});
```

### Custom Success Messages

Override default success message:

```typescript
// Service can include custom message in response
// Backend: sendSuccess(res, { tenant }, 'Welcome! Tenant created successfully');
// Interceptor will use this message instead of default
```

## Setup Required

Add interceptors to `app.config.ts`:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import { SuccessInterceptor } from './core/interceptors/success.interceptor';
import { LoadingInterceptor } from './core/interceptors/loading.interceptor';
import { RetryInterceptor } from './core/interceptors/retry.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([
        LoadingInterceptor,
        RetryInterceptor,
        ErrorInterceptor,
        SuccessInterceptor
      ])
    )
  ]
};
```

## Benefits

1. **Less Code**: 50-70% reduction in component code
2. **Consistency**: All errors handled the same way
3. **Maintainability**: Change error handling in one place
4. **Reliability**: Can't forget error handling
5. **User Experience**: Consistent notifications
6. **Developer Experience**: Write less, test less
7. **Type Safety**: AppError types for custom handling

## Result

**Before**: 30-50 lines per API call (with error handling)
**After**: 5-10 lines per API call

**Before**: Error handling logic duplicated in every component
**After**: Zero error handling code needed

**Before**: Easy to forget error handling
**After**: Impossible to miss - happens automatically!
