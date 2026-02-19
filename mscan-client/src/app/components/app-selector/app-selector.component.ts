import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppContextService, AppContextState } from '../../services/app-context.service';
import { VerificationApp } from '../../store/verification-apps/verification-apps.models';
import { VerificationAppsFacade } from '../../store/verification-apps';

@Component({
  selector: 'app-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app-selector.component.html',
  styleUrls: ['./app-selector.component.css'],
})
export class AppSelectorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  appContext$: Observable<AppContextState>;
  availableApps$: Observable<VerificationApp[]>;
  selectedAppId: VerificationApp | null = null;

  constructor(
    private appContextService: AppContextService,
    private verificationAppsFacade: VerificationAppsFacade,
  ) {
    this.appContext$ = this.appContextService.appContext$;
    this.availableApps$ = this.verificationAppsFacade.allApps$;
  }

  ngOnInit(): void {
    this.verificationAppsFacade.selectedApp$.pipe(takeUntil(this.destroy$)).subscribe((app) => {
      this.selectedAppId = app ? app : null;
    });

    this.appContextService.restoreSelection();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onAppChange(): void {
    this.verificationAppsFacade.selectApp(this.selectedAppId);
    this.appContextService.selectApp(this.selectedAppId?.verification_app_id);
  }
}
