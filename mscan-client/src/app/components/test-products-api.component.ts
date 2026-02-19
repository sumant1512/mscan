import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-test-products-api',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 2rem; font-family: monospace;">
      <h2>🧪 Products API Test</h2>

      <div style="margin: 1rem 0;">
        <button (click)="testProductsAPI()"
                style="padding: 1rem 2rem; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Test Products API
        </button>
      </div>

      <div *ngIf="result" style="margin-top: 1rem; padding: 1rem; background: #f5f5f5; border-radius: 4px;">
        <h3>Result:</h3>
        <pre>{{ result | json }}</pre>
      </div>

      <div style="margin-top: 1rem; padding: 1rem; background: #fff3cd; border-radius: 4px;">
        <h4>Instructions:</h4>
        <ol>
          <li>Open browser console (F12)</li>
          <li>Click "Test Products API" button</li>
          <li>Check console for interceptor logs (🔒 Auth Interceptor)</li>
          <li>Check Network tab for Authorization header</li>
        </ol>
      </div>
    </div>
  `
})
export class TestProductsApiComponent {
  result: any = null;

  constructor(private http: HttpClient) {}

  testProductsAPI(): void {
    console.log('=== TESTING PRODUCTS API ===');
    console.log('Token in localStorage:', localStorage.getItem('tms_access_token') ? 'EXISTS' : 'MISSING');

    const url = 'http://sumant.localhost:3000/api/products?search=&app_id=b3fe1206-da13-40b6-9259-8082ca15430f';

    console.log('Making request to:', url);
    console.log('Watch for "🔒 Auth Interceptor" logs...');

    this.http.get(url).subscribe({
      next: (response) => {
        console.log('✅ Success:', response);
        this.result = response;
      },
      error: (error) => {
        console.error('❌ Error:', error);
        this.result = error.error || error;
      }
    });
  }
}
