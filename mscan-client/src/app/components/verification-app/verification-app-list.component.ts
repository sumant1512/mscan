import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RewardsService } from '../../services/rewards.service';
import { VerificationApp } from '../../models/rewards.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-verification-app-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verification-app-list.component.html',
  styleUrls: ['./verification-app-list.component.css']
})
export class VerificationAppListComponent implements OnInit {
  loading = false;
  error = '';
  apps: VerificationApp[] = [];

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private rewardsService: RewardsService
  ) {}

  ngOnInit() {
    this.loadApps();
  }

  loadApps() {
    this.loading = true;
    this.error = '';
    
    this.rewardsService.getVerificationApps()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.apps = response.apps;
        },
        error: (err) => {
          console.error('Load verification apps error:', err);
          this.error = err.error?.error || err.message || 'Failed to load verification apps';
        }
      });
  }

  configureApp() {
    this.router.navigate(['/tenant/verification-app/configure']);
  }

  editApp(id: string) {
    this.router.navigate(['/tenant/verification-app/configure', id]);
  }
}
