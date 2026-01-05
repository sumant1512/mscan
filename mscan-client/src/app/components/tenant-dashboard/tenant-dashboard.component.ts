/**
 * Tenant Dashboard Component
 */
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { TenantDashboard, User } from '../../models';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-tenant-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tenant-dashboard.component.html',
  styleUrls: ['./tenant-dashboard.component.css']
})
export class TenantDashboardComponent implements OnInit {
  stats: TenantDashboard | null = null;
  currentUser: User | null = null;
  loading = true;
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

  loadUserInfo(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  loadDashboardStats(): void {
    this.loading = true;
    this.error = '';

    this.dashboardService.getDashboardStats()
      .pipe(
        catchError(error => {
          this.loading = false;
          this.error = error.error?.message || 'Failed to load dashboard data';
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.loading = false;
          if (response.success) {
            this.stats = response.data as TenantDashboard;
          } else {
            this.error = response.message || 'Failed to load dashboard data';
          }
          this.cdr.detectChanges();
        }
      });
  }

  logout(): void {
    this.authService.logout();
  }
}
