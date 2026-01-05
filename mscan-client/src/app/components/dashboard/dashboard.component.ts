/**
 * Dashboard Component
 * Routes to Super Admin or Tenant dashboard based on user role
 */
import { ChangeDetectionStrategy, Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SuperAdminDashboardComponent } from '../super-admin-dashboard/super-admin-dashboard.component';
import { TenantDashboardComponent } from '../tenant-dashboard/tenant-dashboard.component';
import { filter, take } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SuperAdminDashboardComponent, TenantDashboardComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class DashboardComponent implements OnInit {
  isSuperAdmin = false;
  loading = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.authService.currentUser$
      .pipe(
        filter(user => user !== null),
        take(1)
      )
      .subscribe(user => {
        this.isSuperAdmin = user.role === 'SUPER_ADMIN';
        this.loading = false;
        this.cdr.detectChanges();
        console.log('Dashboard initialized for', this.isSuperAdmin ? 'Super Admin' : 'Tenant', this.loading);
      });
  }

  logout(): void {
    this.authService.logout();
  }
}
