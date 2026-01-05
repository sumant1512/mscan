/**
 * Super Admin Dashboard Component
 */
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SuperAdminDashboard } from '../../models';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls: ['./super-admin-dashboard.component.css']
})
export class SuperAdminDashboardComponent implements OnInit {
  stats: SuperAdminDashboard | null = null;
  loading = true;
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

  loadUserInfo(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.fullName;
      }
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
            this.stats = response.data as SuperAdminDashboard;
            console.log('Super Admin Dashboard stats loaded', this.stats);
          } else {
            this.error = response.message || 'Failed to load dashboard data';
          }
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
