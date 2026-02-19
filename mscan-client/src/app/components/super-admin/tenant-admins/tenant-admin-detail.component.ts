import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { TenantsFacade } from '../../../store/tenants';
import { TenantAdmin } from '../../../models/tenant-admin.model';

@Component({
  selector: 'app-tenant-admin-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tenant-admin-detail.component.html',
  styleUrl: './tenant-admin-detail.component.css'
})
export class TenantAdminDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tenantsFacade = inject(TenantsFacade);
  private destroy$ = new Subject<void>();

  tenantId: string | null = null;
  tenantName$: Observable<string> = of('');
  tenantDomain$: Observable<string> = of('');
  admins$: Observable<TenantAdmin[]> = of([]);
  loading$: Observable<boolean> = this.tenantsFacade.loading$;
  error$: Observable<string | null> = this.tenantsFacade.error$;

  activeAdminsCount$: Observable<number> = of(0);
  inactiveAdminsCount$: Observable<number> = of(0);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('tenantId');
    if (id) {
      this.tenantId = id;
      this.loadTenantAdmins();
    } else {
      this.error$ = of('Invalid tenant ID');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTenantAdmins(): void {
    if (!this.tenantId) return;

    // Load tenants if not already loaded
    this.tenantsFacade.loaded$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loaded => {
        if (!loaded) {
          this.tenantsFacade.loadTenants();
        }
      });

    const tenantId = this.tenantId;

    // Get tenant details
    const tenant$ = this.tenantsFacade.getTenantById(tenantId);
    
    this.tenantName$ = tenant$.pipe(
      map(tenant => tenant?.tenant_name || 'Unknown Tenant')
    );

    this.tenantDomain$ = tenant$.pipe(
      map(tenant => tenant?.subdomain_slug 
        ? `${tenant.subdomain_slug}.mscan.com`
        : 'mscan.com'
      )
    );

    // Get admins for this tenant
    this.admins$ = this.tenantsFacade.getTenantAdminsById(tenantId);

    // Calculate active/inactive counts
    this.activeAdminsCount$ = this.admins$.pipe(
      map(admins => admins.filter(a => a.is_active).length)
    );

    this.inactiveAdminsCount$ = this.admins$.pipe(
      map(admins => admins.filter(a => !a.is_active).length)
    );
  }

  navigateBack(): void {
    this.router.navigate(['/super-admin/tenant-admins']);
  }

  addAnotherAdmin(): void {
    this.router.navigate(['/super-admin/tenant-admins/add'], {
      queryParams: { tenantId: this.tenantId }
    });
  }

  viewTenantDashboard(): void {
    if (this.tenantId) {
      this.router.navigate(['/super-admin/tenants', this.tenantId]);
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getInitials(fullName: string): string {
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }

  getStatusColor(isActive: boolean): string {
    return isActive ? '#28a745' : '#6c757d';
  }

  copyEmail(email: string): void {
    navigator.clipboard.writeText(email).then(() => {
      // Could show a toast notification here
    }).catch(err => {
      // Error copying email
    });
  }
}
