import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RewardsService } from '../../services/rewards.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-scan-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scan-analytics.component.html',
  styleUrls: ['./scan-analytics.component.css']
})
export class ScanAnalyticsComponent implements OnInit {
  loading = false;
  error: string | null = null;
  analytics = {
    total_scans: 0,
    successful_scans: 0,
    expired_scans: 0,
    exhausted_scans: 0,
    invalid_scans: 0,
    success_rate: 0
  };

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private rewardsService: RewardsService
  ) {}

  ngOnInit() {
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.loading = true;
    this.error = null;
    
    this.rewardsService.getScanAnalytics()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.analytics = {
            ...response.analytics,
            success_rate: response.analytics.total_scans > 0 
              ? (response.analytics.successful_scans / response.analytics.total_scans) * 100 
              : 0
          };
        },
        error: (error) => {
          console.error('Load analytics error:', error);
          this.error = error.error?.error || error.message || 'Failed to load scan analytics';
        }
      });
  }

  viewHistory() {
    this.router.navigate(['/tenant/scans/history']);
  }
}
