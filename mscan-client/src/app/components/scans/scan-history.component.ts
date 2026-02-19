import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RewardsService } from '../../services/rewards.service';
import { Scan } from '../../models/rewards.model';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-scan-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scan-history.component.html',
  styleUrls: ['./scan-history.component.css']
})
export class ScanHistoryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  private loadingService = inject(LoadingService);


  loading$ = this.loadingService.loading$;
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadScans() {
    this.error = '';

    this.rewardsService.getScanHistory()
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.scans = response.scans;
          this.calculateStats();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to load scan history');
          this.cdr.detectChanges();
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
}
