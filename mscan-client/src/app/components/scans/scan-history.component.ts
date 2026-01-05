import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RewardsService } from '../../services/rewards.service';
import { Scan } from '../../models/rewards.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-scan-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scan-history.component.html',
  styleUrls: ['./scan-history.component.css']
})
export class ScanHistoryComponent implements OnInit {
  loading = false;
  error = '';
  scans: Scan[] = [];
  stats = {
    totalScans: 0,
    successfulScans: 0,
    failedScans: 0,
    successRate: 0
  };

  constructor(
    private router: Router,
    private rewardsService: RewardsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadScans();
  }

  loadScans() {
    this.loading = true;
    this.error = '';
    
    this.rewardsService.getScanHistory()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.scans = response.scans;
          this.calculateStats();
        },
        error: (err) => {
          console.error('Load scan history error:', err);
          this.error = err.error?.error || err.message || 'Failed to load scan history';
        }
      });
  }

  calculateStats() {
    this.stats.totalScans = this.scans.length;
    this.stats.successfulScans = this.scans.filter(s => s.scan_status === 'SUCCESS').length;
    this.stats.failedScans = this.stats.totalScans - this.stats.successfulScans;
    this.stats.successRate = this.stats.totalScans > 0 
      ? Math.round((this.stats.successfulScans / this.stats.totalScans) * 100) 
      : 0;
  }

  viewAnalytics() {
    this.router.navigate(['/tenant/scans/analytics']);
  }
}
