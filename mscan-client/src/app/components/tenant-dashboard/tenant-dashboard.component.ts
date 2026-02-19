/**
 * Tenant Dashboard Component
 */
import { ChangeDetectorRef, Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { TenantDashboard, User } from '../../models';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-tenant-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tenant-dashboard.component.html',
  styleUrls: ['./tenant-dashboard.component.css']
})
export class TenantDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  stats: TenantDashboard | null = null;
  currentUser: User | null = null;
  private loadingService = inject(LoadingService);

  loading$ = this.loadingService.loading$;
  error = '';

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadDashboardStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserInfo(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  loadDashboardStats(): void {
    this.error = '';

    this.dashboardService.getDashboardStats()
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response: any) => {
          if (response && response.status) {
            this.stats = response.data as TenantDashboard;
          } else {
            this.error = response?.message || 'Failed to load dashboard data';
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to load dashboard data');
          this.cdr.detectChanges();
        }
      });
  }

  logout(): void {
    this.authService.logout();
  }
}
