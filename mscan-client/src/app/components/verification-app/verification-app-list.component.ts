import { Component, OnInit, ChangeDetectorRef, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { RewardsService } from '../../services/rewards.service';
import { VerificationApp } from '../../models/rewards.model';
import { VerificationAppsFacade } from '../../store/verification-apps';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verification-app-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verification-app-list.component.html',
  styleUrls: ['./verification-app-list.component.css']
})
export class VerificationAppListComponent implements OnInit, OnDestroy {
  subscription = new Subscription();
  verificationAppsFacade = inject(VerificationAppsFacade);
  apps: VerificationApp[] = [];

  // Permission flags
  canCreateApp = false;
  canEditApp = false;
  canDeleteApp = false;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private rewardsService: RewardsService,
    private authService: AuthService
  ) {
    // Initialize permission flags
    this.canCreateApp = this.authService.hasPermission('create_app');
    this.canEditApp = this.authService.hasPermission('edit_app');
    this.canDeleteApp = this.authService.hasPermission('delete_app');
  }

  ngOnInit() {
    this.loadApps();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  loadApps() {
    this.subscription.add(
      this.verificationAppsFacade.allApps$.subscribe(apps => {
        this.apps = apps;
        this.cdr.detectChanges();
        console.log('Loaded apps from facade:', apps);
      })
    )
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
