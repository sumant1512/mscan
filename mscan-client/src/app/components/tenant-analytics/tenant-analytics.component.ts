/**
 * Tenant Analytics Dashboard Component
 * Shows overview, scan trends, top cities, and batch performance
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

interface OverviewStats {
  total_scans: number;
  unique_users: number;
  repeat_users: number;
  total_coupons: number;
  active_coupons: number;
  redeemed_coupons: number;
  total_reward_value: number;
}

interface ScanTrend {
  date: string;
  count: number;
}

interface CityStats {
  city: string;
  scans: number;
  percentage: number;
}

interface BatchStats {
  batch_id: string;
  dealer_name: string;
  zone: string;
  total_coupons: number;
  scanned_coupons: number;
  redemption_rate: number;
}

@Component({
  selector: 'app-tenant-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenant-analytics.component.html',
  styleUrls: ['./tenant-analytics.component.css']
})
export class TenantAnalyticsComponent implements OnInit {
  // Overview stats
  overviewStats = signal<OverviewStats>({
    total_scans: 0,
    unique_users: 0,
    repeat_users: 0,
    total_coupons: 0,
    active_coupons: 0,
    redeemed_coupons: 0,
    total_reward_value: 0
  });

  // Scan trends (last 7 days)
  scanTrends = signal<ScanTrend[]>([]);

  // Top cities
  topCities = signal<CityStats[]>([]);

  // Batch performance
  batchStats = signal<BatchStats[]>([]);

  // Filters
  timeFilter = signal<string>('7d'); // 7d, 30d, 90d, all
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  /**
   * Load all analytics data
   */
  loadAnalytics(): void {
    this.loading.set(true);
    this.error.set(null);

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    // Load overview stats
    this.http.get<any>(`${this.apiUrl}/analytics/overview`, {
      headers,
      params: { time_filter: this.timeFilter() }
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.overviewStats.set(response.data);
        }
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load overview stats');
      }
    });

    // Load scan trends
    this.http.get<any>(`${this.apiUrl}/analytics/scan-trends`, {
      headers,
      params: { time_filter: this.timeFilter() }
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.scanTrends.set(response.data.trends || []);
        }
      },
      error: (err) => {
        console.error('Failed to load scan trends:', err);
      }
    });

    // Load top cities
    this.http.get<any>(`${this.apiUrl}/analytics/top-cities`, {
      headers,
      params: { time_filter: this.timeFilter(), limit: '10' }
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.topCities.set(response.data.cities || []);
        }
      },
      error: (err) => {
        console.error('Failed to load top cities:', err);
      }
    });

    // Load batch performance
    this.http.get<any>(`${this.apiUrl}/analytics/batch-performance`, {
      headers,
      params: { time_filter: this.timeFilter() }
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.batchStats.set(response.data.batches || []);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load batch performance:', err);
        this.loading.set(false);
      }
    });
  }

  /**
   * Change time filter
   */
  changeTimeFilter(filter: string): void {
    this.timeFilter.set(filter);
    this.loadAnalytics();
  }

  /**
   * Navigate to create batch
   */
  createBatch(): void {
    this.router.navigate(['/tenant/batches/create']);
  }

  /**
   * Navigate to scan history
   */
  viewScanHistory(): void {
    this.router.navigate(['/tenant/scans/history']);
  }

  /**
   * Get percentage of unique users
   */
  getUniqueUserPercentage(): number {
    const total = this.overviewStats().total_scans;
    const unique = this.overviewStats().unique_users;
    return total > 0 ? Math.round((unique / total) * 100) : 0;
  }

  /**
   * Get redemption rate
   */
  getRedemptionRate(): number {
    const total = this.overviewStats().total_coupons;
    const redeemed = this.overviewStats().redeemed_coupons;
    return total > 0 ? Math.round((redeemed / total) * 100) : 0;
  }
}
