import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SubdomainService } from '../../services/subdomain.service';

interface ApiConfig {
  mobile_api_enabled: boolean;
  ecommerce_api_enabled: boolean;
  mobile_api_key?: string;
  ecommerce_api_key?: string;
  api_rate_limits: {
    mobile_rpm: number;
    ecommerce_rpm: number;
  };
  api_field_mappings: {
    mobile: string[];
    ecommerce: string[];
  };
}

interface ApiUsageStats {
  mobile: {
    total_requests: number;
    requests_today: number;
    avg_response_time: number;
    error_rate: number;
  };
  ecommerce: {
    total_requests: number;
    requests_today: number;
    avg_response_time: number;
    error_rate: number;
  };
}

@Component({
  selector: 'app-api-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './api-configuration.component.html',
  styleUrls: ['./api-configuration.component.css']
})
export class ApiConfigurationComponent implements OnInit {
  verificationAppId: string = '';
  appName: string = '';
  loading: boolean = false;
  saving: boolean = false;
  error: string = '';
  success: string = '';

  config: ApiConfig = {
    mobile_api_enabled: false,
    ecommerce_api_enabled: false,
    api_rate_limits: {
      mobile_rpm: 60,
      ecommerce_rpm: 120
    },
    api_field_mappings: {
      mobile: [],
      ecommerce: []
    }
  };

  usageStats: ApiUsageStats = {
    mobile: {
      total_requests: 0,
      requests_today: 0,
      avg_response_time: 0,
      error_rate: 0
    },
    ecommerce: {
      total_requests: 0,
      requests_today: 0,
      avg_response_time: 0,
      error_rate: 0
    }
  };

  newMobileKey: string = '';
  newEcommerceKey: string = '';
  showMobileKey: boolean = false;
  showEcommerceKey: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private subdomainService: SubdomainService
  ) {}

  ngOnInit(): void {
    this.verificationAppId = this.route.snapshot.paramMap.get('id') || '';
    if (this.verificationAppId) {
      this.loadApiConfiguration();
      this.loadUsageStats();
    }
  }

  private getApiUrl(): string {
    return `${this.subdomainService.getApiBaseUrl()}/verification-apps/${this.verificationAppId}`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
  }

  loadApiConfiguration(): void {
    this.loading = true;
    this.error = '';

    this.http.get<any>(`${this.getApiUrl()}/api-config`, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          this.config = response.config;
          this.appName = response.app_name || 'Verification App';
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to load API configuration';
          this.loading = false;
        }
      });
  }

  loadUsageStats(): void {
    this.http.get<any>(`${this.getApiUrl()}/api-usage`, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          this.usageStats = response.stats;
        },
        error: (err) => {
          console.error('Failed to load usage stats:', err);
        }
      });
  }

  saveConfiguration(): void {
    this.saving = true;
    this.error = '';
    this.success = '';

    const payload = {
      api_rate_limits: this.config.api_rate_limits,
      api_field_mappings: this.config.api_field_mappings
    };

    this.http.put<any>(`${this.getApiUrl()}/api-config`, payload, { headers: this.getHeaders() })
      .subscribe({
        next: () => {
          this.success = 'Configuration saved successfully';
          this.saving = false;
          setTimeout(() => this.success = '', 3000);
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to save configuration';
          this.saving = false;
        }
      });
  }

  enableMobileApi(): void {
    if (this.config.mobile_api_enabled) return;

    if (confirm('Enable Mobile API? This will generate a new API key.')) {
      this.saving = true;
      this.error = '';

      this.http.post<any>(`${this.getApiUrl()}/enable-mobile-api`, {}, { headers: this.getHeaders() })
        .subscribe({
          next: (response) => {
            this.config.mobile_api_enabled = true;
            this.newMobileKey = response.api_key;
            this.showMobileKey = true;
            this.success = 'Mobile API enabled successfully! Copy your API key now - it will only be shown once.';
            this.saving = false;
          },
          error: (err) => {
            this.error = err.error?.message || 'Failed to enable Mobile API';
            this.saving = false;
          }
        });
    }
  }

  enableEcommerceApi(): void {
    if (this.config.ecommerce_api_enabled) return;

    if (confirm('Enable E-commerce API? This will generate a new API key.')) {
      this.saving = true;
      this.error = '';

      this.http.post<any>(`${this.getApiUrl()}/enable-ecommerce-api`, {}, { headers: this.getHeaders() })
        .subscribe({
          next: (response) => {
            this.config.ecommerce_api_enabled = true;
            this.newEcommerceKey = response.api_key;
            this.showEcommerceKey = true;
            this.success = 'E-commerce API enabled successfully! Copy your API key now - it will only be shown once.';
            this.saving = false;
          },
          error: (err) => {
            this.error = err.error?.message || 'Failed to enable E-commerce API';
            this.saving = false;
          }
        });
    }
  }

  regenerateMobileKey(): void {
    if (confirm('Regenerate Mobile API key? The old key will stop working immediately.')) {
      this.saving = true;
      this.error = '';

      this.http.post<any>(`${this.getApiUrl()}/regenerate-mobile-key`, {}, { headers: this.getHeaders() })
        .subscribe({
          next: (response) => {
            this.newMobileKey = response.api_key;
            this.showMobileKey = true;
            this.success = 'Mobile API key regenerated! Copy your new key now.';
            this.saving = false;
          },
          error: (err) => {
            this.error = err.error?.message || 'Failed to regenerate Mobile API key';
            this.saving = false;
          }
        });
    }
  }

  regenerateEcommerceKey(): void {
    if (confirm('Regenerate E-commerce API key? The old key will stop working immediately.')) {
      this.saving = true;
      this.error = '';

      this.http.post<any>(`${this.getApiUrl()}/regenerate-ecommerce-key`, {}, { headers: this.getHeaders() })
        .subscribe({
          next: (response) => {
            this.newEcommerceKey = response.api_key;
            this.showEcommerceKey = true;
            this.success = 'E-commerce API key regenerated! Copy your new key now.';
            this.saving = false;
          },
          error: (err) => {
            this.error = err.error?.message || 'Failed to regenerate E-commerce API key';
            this.saving = false;
          }
        });
    }
  }

  copyToClipboard(text: string, type: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.success = `${type} API key copied to clipboard!`;
      setTimeout(() => this.success = '', 2000);
    }).catch(() => {
      this.error = 'Failed to copy to clipboard';
    });
  }

  goBack(): void {
    this.router.navigate(['/tenant/verification-apps']);
  }
}
