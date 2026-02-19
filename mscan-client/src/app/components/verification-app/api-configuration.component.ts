import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { SubdomainService } from '../../services/subdomain.service';
import { ConfirmationService } from '../../shared/services/confirmation.service';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

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
export class ApiConfigurationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  verificationAppId: string = '';
  appName: string = '';
  private loadingService = inject(LoadingService);

  loading$ = this.loadingService.loading$;
  saving = false;
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
    private subdomainService: SubdomainService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.verificationAppId = this.route.snapshot.paramMap.get('id') || '';
    if (this.verificationAppId) {
      this.loadApiConfiguration();
      this.loadUsageStats();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.error = '';

    this.http.get<any>(`${this.getApiUrl()}/api-config`, { headers: this.getHeaders() })
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.config = response.config;
          this.appName = response.app_name || 'Verification App';
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to load API configuration');
        }
      });
  }

  loadUsageStats(): void {
    this.http.get<any>(`${this.getApiUrl()}/api-usage`, { headers: this.getHeaders() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.usageStats = response.stats;
        },
        error: (err) => {
          // Silently fail - usage stats are not critical
        }
      });
  }

  saveConfiguration(): void {
    this.error = '';
    this.success = '';

    const payload = {
      api_rate_limits: this.config.api_rate_limits,
      api_field_mappings: this.config.api_field_mappings
    };

    this.http.put<any>(`${this.getApiUrl()}/api-config`, payload, { headers: this.getHeaders() })
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.success = 'Configuration saved successfully';
          setTimeout(() => this.success = '', 3000);
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to save configuration');
        }
      });
  }

  enableMobileApi(): void {
    if (this.config.mobile_api_enabled) return;

    this.confirmationService
      .confirm('Enable Mobile API? This will generate a new API key.', 'Enable Mobile API')
      .pipe(
        filter(confirmed => confirmed),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.error = '';

        this.http.post<any>(`${this.getApiUrl()}/enable-mobile-api`, {}, { headers: this.getHeaders() })
          .pipe(
            this.loadingService.wrapLoading(),
            takeUntil(this.destroy$)
          )
          .subscribe({
            next: (response) => {
              this.config.mobile_api_enabled = true;
              this.newMobileKey = response.api_key;
              this.showMobileKey = true;
              this.success = 'Mobile API enabled successfully! Copy your API key now - it will only be shown once.';
            },
            error: (err) => {
              this.error = HttpErrorHandler.getMessage(err, 'Failed to enable Mobile API');
            }
          });
      });
  }

  enableEcommerceApi(): void {
    if (this.config.ecommerce_api_enabled) return;

    this.confirmationService
      .confirm('Enable E-commerce API? This will generate a new API key.', 'Enable E-commerce API')
      .pipe(
        filter(confirmed => confirmed),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.error = '';

        this.http.post<any>(`${this.getApiUrl()}/enable-ecommerce-api`, {}, { headers: this.getHeaders() })
          .pipe(
            this.loadingService.wrapLoading(),
            takeUntil(this.destroy$)
          )
          .subscribe({
            next: (response) => {
              this.config.ecommerce_api_enabled = true;
              this.newEcommerceKey = response.api_key;
              this.showEcommerceKey = true;
              this.success = 'E-commerce API enabled successfully! Copy your API key now - it will only be shown once.';
            },
            error: (err) => {
              this.error = HttpErrorHandler.getMessage(err, 'Failed to enable E-commerce API');
            }
          });
      });
  }

  regenerateMobileKey(): void {
    this.confirmationService
      .confirm('Regenerate Mobile API key? The old key will stop working immediately.', 'Regenerate Mobile API Key')
      .pipe(
        filter(confirmed => confirmed),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.error = '';

        this.http.post<any>(`${this.getApiUrl()}/regenerate-mobile-key`, {}, { headers: this.getHeaders() })
          .pipe(
            this.loadingService.wrapLoading(),
            takeUntil(this.destroy$)
          )
          .subscribe({
            next: (response) => {
              this.newMobileKey = response.api_key;
              this.showMobileKey = true;
              this.success = 'Mobile API key regenerated! Copy your new key now.';
            },
            error: (err) => {
              this.error = HttpErrorHandler.getMessage(err, 'Failed to regenerate Mobile API key');
            }
          });
      });
  }

  regenerateEcommerceKey(): void {
    this.confirmationService
      .confirm('Regenerate E-commerce API key? The old key will stop working immediately.', 'Regenerate E-commerce API Key')
      .pipe(
        filter(confirmed => confirmed),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.error = '';

        this.http.post<any>(`${this.getApiUrl()}/regenerate-ecommerce-key`, {}, { headers: this.getHeaders() })
          .pipe(
            this.loadingService.wrapLoading(),
            takeUntil(this.destroy$)
          )
          .subscribe({
            next: (response) => {
              this.newEcommerceKey = response.api_key;
              this.showEcommerceKey = true;
              this.success = 'E-commerce API key regenerated! Copy your new key now.';
            },
            error: (err) => {
              this.error = HttpErrorHandler.getMessage(err, 'Failed to regenerate E-commerce API key');
            }
          });
      });
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
