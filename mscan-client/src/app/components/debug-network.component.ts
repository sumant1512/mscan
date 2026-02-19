import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-debug-network',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 2rem; font-family: monospace;">
      <h2>🔬 Network Debugging Tool</h2>

      <div style="margin: 1rem 0; display: flex; gap: 1rem; flex-wrap: wrap;">
        <button (click)="testWithHttpClient()"
                style="padding: 1rem 2rem; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
          1️⃣ Test with HttpClient (Angular)
        </button>

        <button (click)="testWithFetch()"
                style="padding: 1rem 2rem; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer;">
          2️⃣ Test with fetch() (Native)
        </button>

        <button (click)="testWithXHR()"
                style="padding: 1rem 2rem; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer;">
          3️⃣ Test with XMLHttpRequest (Native)
        </button>

        <button (click)="clearResults()"
                style="padding: 1rem 2rem; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">
          🗑️ Clear Results
        </button>
      </div>

      <div style="margin-top: 1rem; padding: 1rem; background: #fff3cd; border-radius: 4px;">
        <h4>📋 Instructions:</h4>
        <ol>
          <li><strong>Open Network Tab (F12 → Network)</strong></li>
          <li><strong>Click each test button in order</strong></li>
          <li><strong>For EACH request in Network tab:</strong>
            <ul>
              <li>Click on the /api/products request</li>
              <li>Go to "Headers" tab</li>
              <li>Scroll to "Request Headers"</li>
              <li>Look for: <code>Authorization: Bearer ...</code></li>
            </ul>
          </li>
          <li><strong>Compare results below</strong></li>
        </ol>
      </div>

      <div *ngFor="let result of results"
           [style.background]="result.success ? '#d4edda' : '#f8d7da'"
           style="margin-top: 1rem; padding: 1rem; border-radius: 4px; border: 2px solid;"
           [style.border-color]="result.success ? '#28a745' : '#dc3545'">
        <h3>{{ result.method }}</h3>
        <div><strong>Status:</strong> {{ result.success ? '✅ SUCCESS' : '❌ FAILED' }}</div>
        <div><strong>Response Status:</strong> {{ result.status }}</div>
        <div *ngIf="result.message"><strong>Message:</strong> {{ result.message }}</div>
        <details style="margin-top: 0.5rem;">
          <summary style="cursor: pointer;">📦 Full Response</summary>
          <pre style="margin-top: 0.5rem; padding: 0.5rem; background: #f5f5f5; overflow-x: auto;">{{ result.data | json }}</pre>
        </details>
      </div>

      <div *ngIf="results.length === 0" style="margin-top: 1rem; padding: 2rem; background: #e9ecef; border-radius: 4px; text-align: center;">
        <p>👆 Click the buttons above to test different HTTP methods</p>
      </div>
    </div>
  `
})
export class DebugNetworkComponent {
  results: any[] = [];

  private readonly TEST_URL = 'http://sumant.localhost:3000/api/products?search=&app_id=b3fe1206-da13-40b6-9259-8082ca15430f';

  constructor(private http: HttpClient) {}

  private getToken(): string | null {
    return localStorage.getItem('tms_access_token');
  }

  clearResults(): void {
    this.results = [];
    console.clear();
  }

  testWithHttpClient(): void {
    console.log('\n=== TEST 1: Angular HttpClient ===');
    const token = this.getToken();

    if (!token) {
      this.addResult('Angular HttpClient', false, 0, 'No token in localStorage', null);
      console.error('❌ No token found');
      return;
    }

    console.log('🔑 Token found:', token.substring(0, 20) + '...');
    console.log('🌐 Making request to:', this.TEST_URL);
    console.log('⏳ Watch for interceptor logs...');

    const startTime = Date.now();

    this.http.get(this.TEST_URL).subscribe({
      next: (response: any) => {
        const duration = Date.now() - startTime;
        console.log(`✅ HttpClient SUCCESS (${duration}ms)`, response);
        this.addResult('Angular HttpClient', true, 200, response.message, response);
      },
      error: (error) => {
        const duration = Date.now() - startTime;
        console.error(`❌ HttpClient FAILED (${duration}ms)`, error);
        this.addResult('Angular HttpClient', false, error.status, error.error?.message, error.error);
      }
    });
  }

  testWithFetch(): void {
    console.log('\n=== TEST 2: Native fetch() ===');
    const token = this.getToken();

    if (!token) {
      this.addResult('Native fetch()', false, 0, 'No token in localStorage', null);
      console.error('❌ No token found');
      return;
    }

    console.log('🔑 Token found:', token.substring(0, 20) + '...');
    console.log('🌐 Making request to:', this.TEST_URL);
    console.log('⚠️  This bypasses Angular interceptors');

    const startTime = Date.now();

    fetch(this.TEST_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(r => {
      const duration = Date.now() - startTime;
      console.log(`📥 fetch() response received (${duration}ms), Status: ${r.status}`);
      return r.json();
    })
    .then(data => {
      console.log('✅ fetch() SUCCESS', data);
      this.addResult('Native fetch()', data.status !== false, 200, data.message, data);
    })
    .catch(err => {
      const duration = Date.now() - startTime;
      console.error(`❌ fetch() FAILED (${duration}ms)`, err);
      this.addResult('Native fetch()', false, 0, err.message, null);
    });
  }

  testWithXHR(): void {
    console.log('\n=== TEST 3: XMLHttpRequest ===');
    const token = this.getToken();

    if (!token) {
      this.addResult('XMLHttpRequest', false, 0, 'No token in localStorage', null);
      console.error('❌ No token found');
      return;
    }

    console.log('🔑 Token found:', token.substring(0, 20) + '...');
    console.log('🌐 Making request to:', this.TEST_URL);
    console.log('⚠️  This bypasses Angular interceptors');

    const xhr = new XMLHttpRequest();
    const startTime = Date.now();

    xhr.open('GET', this.TEST_URL);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = () => {
      const duration = Date.now() - startTime;
      console.log(`📥 XHR response received (${duration}ms), Status: ${xhr.status}`);

      try {
        const data = JSON.parse(xhr.responseText);
        console.log('✅ XHR SUCCESS', data);
        this.addResult('XMLHttpRequest', data.status !== false, xhr.status, data.message, data);
      } catch (e) {
        console.error('❌ XHR parse error', e);
        this.addResult('XMLHttpRequest', false, xhr.status, 'Failed to parse response', xhr.responseText);
      }
    };

    xhr.onerror = () => {
      const duration = Date.now() - startTime;
      console.error(`❌ XHR FAILED (${duration}ms)`);
      this.addResult('XMLHttpRequest', false, 0, 'Network error', null);
    };

    xhr.send();
  }

  private addResult(method: string, success: boolean, status: number, message: string | undefined, data: any): void {
    this.results.unshift({
      method,
      success,
      status,
      message: message || (success ? 'Request successful' : 'Request failed'),
      data,
      timestamp: new Date().toISOString()
    });
  }
}
