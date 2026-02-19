/**
 * Super Admin Dashboard Component
 */
import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core'
import { inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { SuperAdminDashboard } from '../../models';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls: ['./super-admin-dashboard.component.css']
})
export class SuperAdminDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  stats: SuperAdminDashboard | null = null;
  private loadingService = inject(LoadingService);

  loading$ = this.loadingService.loading$;
  error = '';
  userName = '';

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private router: Router,
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
        if (user) {
          this.userName = user.full_name;
        }
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
        next: (response) => {
          if (response && response.status) {
            this.stats = response.data as SuperAdminDashboard;
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

  navigateToCustomers(): void {
    this.router.navigate(['/super-admin/tenants/new']);
  }

  logout(): void {
    this.authService.logout();
  }
}
