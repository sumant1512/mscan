import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { User, UserRole } from '../../models';
import { AppSelectorComponent } from '../app-selector/app-selector.component';
import { Observable, map, Subscription } from 'rxjs';
import { VerificationAppsFacade } from '../../store/verification-apps';
import { TenantsFacade } from '../../store/tenants';

@Component({
  selector: 'app-shared-header',
  standalone: true,
  imports: [CommonModule, AppSelectorComponent],
  templateUrl: './shared-header.component.html',
  styleUrls: ['./shared-header.component.css'],
})
export class SharedHeaderComponent implements OnInit, OnDestroy {
  currentUser$: Observable<User | null>;
  currentTenantName$: Observable<string>;
  isSuperAdmin$: Observable<boolean>;
  isTenantRole$: Observable<boolean>;
  readonly UserRole = UserRole;
  private subscription?: Subscription;

  constructor(
    private authService: AuthService,
    private verificationAppsFacade: VerificationAppsFacade,
    private tenantsFacade: TenantsFacade,
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.currentTenantName$ = this.authService.currentUser$.pipe(
      map((user) => user?.tenant?.tenant_name || 'Dashboard'),
    );
    this.isSuperAdmin$ = this.authService.currentUser$.pipe(
      map((user) => user?.role === UserRole.SUPER_ADMIN),
    );
    this.isTenantRole$ = this.authService.currentUser$.pipe(
      map((user) => user?.role === UserRole.TENANT_ADMIN || user?.role === UserRole.TENANT_USER),
    );
  }

  ngOnInit(): void {
    // Only load verification apps for tenant roles, not for Super Admin
    this.subscription = this.currentUser$.subscribe((user) => {
      if (user?.role === UserRole.TENANT_ADMIN || user?.role === UserRole.TENANT_USER) {
        this.verificationAppsFacade.loadApps();
      }
      if (user?.role === UserRole.SUPER_ADMIN) {
        this.tenantsFacade.loadTenants();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
