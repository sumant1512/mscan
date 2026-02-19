# Interceptor Setup Guide

## Step 1: Register Interceptors in app.config.ts

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, HTTP_INTERCEPTORS } from '@angular/common/http';

import { routes } from './app.routes';

// Import interceptors
import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import { SuccessInterceptor } from './core/interceptors/success.interceptor';
import { LoadingInterceptor } from './core/interceptors/loading.interceptor';
import { RetryInterceptor } from './core/interceptors/retry.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),

    // Register HTTP interceptors (ORDER MATTERS!)
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: RetryInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: SuccessInterceptor,
      multi: true
    }
  ]
};
```

## Step 2: Add Toast Notification Component

Create a simple toast component to display notifications:

```typescript
// src/app/shared/components/toast/toast.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../../core/services/notification.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let notification of (notifications$ | async)"
           class="toast toast-{{ notification.type }}"
           (click)="remove(notification.id)">
        <div class="toast-icon">
          <span *ngIf="notification.type === 'success'">✓</span>
          <span *ngIf="notification.type === 'error'">✕</span>
          <span *ngIf="notification.type === 'warning'">⚠</span>
          <span *ngIf="notification.type === 'info'">ℹ</span>
        </div>
        <div class="toast-message">{{ notification.message }}</div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
    }

    .toast {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      margin-bottom: 10px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      cursor: pointer;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast-success {
      background-color: #4caf50;
      color: white;
    }

    .toast-error {
      background-color: #f44336;
      color: white;
    }

    .toast-warning {
      background-color: #ff9800;
      color: white;
    }

    .toast-info {
      background-color: #2196f3;
      color: white;
    }

    .toast-icon {
      margin-right: 12px;
      font-size: 20px;
      font-weight: bold;
    }

    .toast-message {
      flex: 1;
    }
  `]
})
export class ToastComponent implements OnInit {
  notifications$!: Observable<Notification[]>;

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.notifications$ = this.notificationService.getNotifications();
  }

  remove(id: string) {
    this.notificationService.remove(id);
  }
}
```

## Step 3: Add Toast Component to App Component

```typescript
// src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  template: `
    <router-outlet />
    <app-toast />
  `
})
export class AppComponent {
  title = 'mscan-client';
}
```

## Step 4: Add Loading Indicator (Optional)

Add global CSS for loading indicator:

```css
/* src/styles.css */
body.loading::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #4caf50, #2196f3);
  animation: loading 1s ease-in-out infinite;
  z-index: 10000;
}

@keyframes loading {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

## Step 5: Update Services (Remove Error Handling)

Before:
```typescript
getBalance(): Observable<CreditBalance> {
  return this.http.get<any>(`${this.apiUrl}/balance`).pipe(
    map(response => response.data || response),
    catchError((error: HttpErrorResponse) => {
      console.error('Error loading balance:', error);
      return throwError(() => new Error('Failed to load balance'));
    })
  );
}
```

After:
```typescript
getBalance(): Observable<CreditBalance> {
  return this.http.get<any>(`${this.apiUrl}/balance`).pipe(
    extractResponseData<CreditBalance>()
  );
}
```

## Step 6: Update Components (Remove Error Handling)

Before:
```typescript
loadBalance() {
  this.loading = true;
  this.error = null;

  this.creditService.getBalance().subscribe({
    next: (balance) => {
      this.loading = false;
      this.balance = balance;
    },
    error: (error) => {
      this.loading = false;
      this.error = 'Failed to load balance';
      console.error(error);
    }
  });
}
```

After:
```typescript
loadBalance() {
  this.creditService.getBalance().subscribe({
    next: (balance) => {
      this.balance = balance;
    }
  });
}
```

## Done! 🎉

Now all your HTTP calls automatically have:
- ✅ Error handling and display
- ✅ Success notifications
- ✅ Loading indicators
- ✅ Retry logic
- ✅ Auth error handling

**No manual error handling needed anywhere in your app!**
