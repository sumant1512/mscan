/**
 * Debug Component - Check Authentication Status
 *
 * Usage: Navigate to /debug-auth to check your login status
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-debug-auth',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 2rem; max-width: 800px; margin: 0 auto; font-family: monospace;">
      <h1>🔍 Authentication Debug Tool</h1>

      <div style="background: #f5f5f5; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
        <h3>Token Status</h3>
        <div>
          <strong>Access Token:</strong>
          <span [style.color]="hasAccessToken ? 'green' : 'red'">
            {{ hasAccessToken ? '✓ EXISTS' : '✗ MISSING' }}
          </span>
        </div>
        <div *ngIf="hasAccessToken" style="margin-top: 0.5rem; word-break: break-all; font-size: 0.8rem; color: #666;">
          {{ accessTokenPreview }}
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
        <h3>Refresh Token</h3>
        <div>
          <strong>Refresh Token:</strong>
          <span [style.color]="hasRefreshToken ? 'green' : 'red'">
            {{ hasRefreshToken ? '✓ EXISTS' : '✗ MISSING' }}
          </span>
        </div>
      </div>

      <div style="background: #f5f5f5; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
        <h3>User Info</h3>
        <div><strong>User Type:</strong> {{ userType || 'Not set' }}</div>
        <div><strong>Subdomain:</strong> {{ subdomain || 'Not set' }}</div>
        <div><strong>Current URL:</strong> {{ currentUrl }}</div>
      </div>

      <div *ngIf="tokenDecoded" style="background: #e8f5e9; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
        <h3>Token Details</h3>
        <div><strong>User ID:</strong> {{ tokenDecoded.userId }}</div>
        <div><strong>Email:</strong> {{ tokenDecoded.email }}</div>
        <div><strong>Role:</strong> {{ tokenDecoded.role }}</div>
        <div><strong>Issued:</strong> {{ tokenDecoded.iat | date:'medium' }}</div>
        <div><strong>Expires:</strong> {{ tokenDecoded.exp | date:'medium' }}</div>
        <div>
          <strong>Status:</strong>
          <span [style.color]="isTokenExpired ? 'red' : 'green'">
            {{ isTokenExpired ? '✗ EXPIRED' : '✓ VALID' }}
          </span>
        </div>
      </div>

      <div *ngIf="testResult" style="padding: 1rem; border-radius: 4px; margin: 1rem 0;"
           [style.background]="testResult.success ? '#e8f5e9' : '#ffebee'">
        <h3>API Test Result</h3>
        <div><strong>Status:</strong> {{ testResult.success ? '✓ SUCCESS' : '✗ FAILED' }}</div>
        <div *ngIf="testResult.message"><strong>Message:</strong> {{ testResult.message }}</div>
        <pre *ngIf="testResult.data" style="background: white; padding: 0.5rem; border-radius: 4px; overflow: auto;">{{ testResult.data | json }}</pre>
      </div>

      <div style="margin-top: 2rem;">
        <h3>Actions</h3>
        <button (click)="testAuth()"
                style="padding: 0.75rem 1.5rem; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 0.5rem;">
          Test Authentication
        </button>
        <button (click)="clearAndLogin()"
                style="padding: 0.75rem 1.5rem; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 0.5rem;">
          Clear & Go to Login
        </button>
        <button (click)="goBack()"
                style="padding: 0.75rem 1.5rem; background: #757575; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Go Back
        </button>
      </div>

      <div style="margin-top: 2rem; padding: 1rem; background: #fff3cd; border-radius: 4px;">
        <h3>💡 Quick Fix</h3>
        <p *ngIf="!hasAccessToken">
          <strong>You are not logged in!</strong><br>
          Click "Clear & Go to Login" button above to log in.
        </p>
        <p *ngIf="hasAccessToken && isTokenExpired">
          <strong>Your token has expired!</strong><br>
          Click "Clear & Go to Login" button above to log in again.
        </p>
        <p *ngIf="hasAccessToken && !isTokenExpired">
          <strong>Token looks good!</strong><br>
          If you're still getting errors, click "Test Authentication" to verify.
        </p>
      </div>
    </div>
  `
})
export class DebugAuthComponent implements OnInit {
  hasAccessToken = false;
  hasRefreshToken = false;
  accessTokenPreview = '';
  userType = '';
  subdomain = '';
  currentUrl = '';
  tokenDecoded: any = null;
  isTokenExpired = false;
  testResult: any = null;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.checkAuth();
  }

  checkAuth(): void {
    const accessToken = localStorage.getItem('tms_access_token');
    const refreshToken = localStorage.getItem('tms_refresh_token');

    this.hasAccessToken = !!accessToken;
    this.hasRefreshToken = !!refreshToken;
    this.userType = localStorage.getItem('tms_user_type') || '';
    this.subdomain = localStorage.getItem('tms_tenant_subdomain') || '';
    this.currentUrl = window.location.href;

    if (accessToken) {
      this.accessTokenPreview = accessToken.substring(0, 50) + '...';

      try {
        this.tokenDecoded = this.parseJwt(accessToken);
        this.tokenDecoded.iat = new Date(this.tokenDecoded.iat * 1000);
        this.tokenDecoded.exp = new Date(this.tokenDecoded.exp * 1000);
        this.isTokenExpired = Date.now() >= this.tokenDecoded.exp.getTime();
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }
  }

  parseJwt(token: string): any {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  }

  testAuth(): void {
    this.testResult = null;

    // Test the auth context endpoint
    this.http.get<any>('http://sumant.localhost:3000/api/auth/context')
      .subscribe({
        next: (response) => {
          this.testResult = {
            success: true,
            message: 'Authentication successful!',
            data: response
          };
        },
        error: (error) => {
          this.testResult = {
            success: false,
            message: error.error?.message || error.message || 'Authentication failed',
            data: error.error
          };
        }
      });
  }

  clearAndLogin(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  goBack(): void {
    window.history.back();
  }
}
