import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription, map } from 'rxjs';
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
  appContext$: Observable<AppContextState>;
  availableApps$: Observable<VerificationApp[]>;
  selectedAppId: string | null = null;
  private subscription?: Subscription;

  constructor(
    private appContextService: AppContextService,
    private verificationAppsFacade: VerificationAppsFacade,
  ) {
    this.appContext$ = this.appContextService.appContext$;
    this.availableApps$ = this.verificationAppsFacade.allApps$;
  }

  ngOnInit(): void {
    // Subscribe only to sync selectedAppId for the ngModel binding
    this.subscription = this.appContext$.subscribe((context) => {
      this.selectedAppId = context.selectedAppId;
    });

    this.appContextService.restoreSelection();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onAppChange(): void {
    this.appContextService.selectApp(this.selectedAppId);
  }
}
