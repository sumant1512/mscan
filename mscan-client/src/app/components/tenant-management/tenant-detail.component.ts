import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { TenantService } from '../../services/tenant.service';
import { Tenant } from '../../models/tenant-admin.model';
import { ConfirmationService } from '../../shared/services/confirmation.service';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-tenant-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tenant-detail.component.html',
  styleUrls: ['./tenant-detail.component.css']
})
export class TenantDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  tenant?: Tenant;
  private loadingService = inject(LoadingService);

  loading$ = this.loadingService.loading$;
  error = '';
  tenantId!: string;

  constructor(
    private tenantService: TenantService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.tenantId = id;
      this.loadTenant();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTenant() {
    if (!this.tenantId) {
      this.error = 'Invalid tenant ID';
      this.router.navigate(['/super-admin/tenants']);
      return;
    }

    this.error = '';

    this.tenantService.getTenantById(this.tenantId)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.tenant = response?.data?.tenant;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to load tenant details');
          this.cdr.detectChanges();
        }
      });
  }

  editTenant() {
    this.router.navigate(['/super-admin/tenants', this.tenantId, 'edit']);
  }

  goBack() {
    this.router.navigate(['/super-admin/tenants']);
  }

  toggleStatus() {
    if (!this.tenant) return;

    const action = this.tenant.status === 'active' ? 'deactivate' : 'activate';
    this.confirmationService
      .confirm(
        `Are you sure you want to ${action} ${this.tenant.tenant_name}?`,
        `${action.charAt(0).toUpperCase() + action.slice(1)} Tenant`
      )
      .pipe(
        filter(confirmed => confirmed),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.error = '';
        this.tenantService.toggleTenantStatus(this.tenant!.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.loadTenant();
            },
            error: (err) => {
              this.error = HttpErrorHandler.getMessage(err, 'Failed to update tenant status');
              this.cdr.detectChanges();
            }
          });
      });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'suspended':
        return 'status-suspended';
      default:
        return '';
    }
  }

}
