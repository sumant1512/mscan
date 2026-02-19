import { Component, OnInit, ChangeDetectorRef, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { RewardsService } from '../../services/rewards.service';
import { VerificationApp } from '../../models/rewards.model';
import { VerificationAppsFacade } from '../../store/verification-apps';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verification-app-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verification-app-list.component.html',
  styleUrls: ['./verification-app-list.component.css'],
})
export class VerificationAppListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  verificationAppsFacade = inject(VerificationAppsFacade);
  apps: VerificationApp[] = [];
  loading$ = this.verificationAppsFacade.loading$;
  error$ = this.verificationAppsFacade.error$;
  successMessage = '';
  errorMessage = '';

  // Permission flags
  canCreateApp = false;
  canEditApp = false;
  canDeleteApp = false;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private rewardsService: RewardsService,
    private authService: AuthService,
  ) {
    // Initialize permission flags
    this.canCreateApp = this.authService.hasPermission('create_app');
    this.canEditApp = this.authService.hasPermission('edit_app');
    this.canDeleteApp = this.authService.hasPermission('delete_app');
  }

  ngOnInit() {
    // Load verification apps from store
    this.loadApps();
  }

  loadApps() {
    this.verificationAppsFacade.allApps$.pipe(takeUntil(this.destroy$)).subscribe((apps) => {
      this.apps = apps;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  configureApp() {
    this.router.navigate(['/tenant/verification-app/configure']);
  }

  editApp(id: string) {
    this.router.navigate(['/tenant/verification-app/configure', id]);
  }

  configureApi(id: string) {
    this.router.navigate(['/tenant/verification-app', id, 'api-config']);
  }
}
