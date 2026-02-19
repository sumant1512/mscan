/**
 * Batch Creation Wizard Component
 * Multi-step wizard for complete coupon batch workflow:
 * 1. Create batch (dealer, zone, quantity)
 * 2. Assign serial codes
 * 3. Activate batch
 * 4. Create reward campaign (common or custom)
 */

import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ConfirmationService } from '../../shared/services/confirmation.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

interface Batch {
  id: string;
  dealer_name: string;
  zone: string;
  quantity: number;
  status: 'draft' | 'code_assigned' | 'activated';
  serial_range?: { start: number; end: number };
  created_at: string;
}

interface RewardVariation {
  amount: number;
  quantity: number;
}

interface ApiResponse {
  status: boolean;
  message?: string;
  data?: any;
}

@Component({
  selector: 'app-batch-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './batch-wizard.component.html',
  styleUrls: ['./batch-wizard.component.css']
})
export class BatchWizardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Wizard state
  currentStep = signal<number>(1);
  batch = signal<Batch | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  // Step 1: Create Batch
  dealerName = signal<string>('');
  zone = signal<string>('');
  quantity = signal<number>(1000);
  verificationAppId = signal<string>('');

  // Step 2: Assign Codes (automatic)
  serialRange = signal<{ start: number; end: number } | null>(null);

  // Step 3: Activate Batch (confirmation)

  // Step 4: Reward Campaign
  campaignType = signal<'common' | 'custom'>('common');
  commonReward = signal<number>(10);
  
  // Custom rewards (default: 70% get ₹5, 15% get ₹10, 15% get ₹50)
  customRewards = signal<RewardVariation[]>([
    { amount: 5, quantity: 0 },
    { amount: 10, quantity: 0 },
    { amount: 50, quantity: 0 }
  ]);

  private apiUrl = environment.apiUrl;

  // Computed values
  totalCustomQuantity = computed(() => {
    return this.customRewards().reduce((sum, r) => sum + r.quantity, 0);
  });

  isCustomRewardsValid = computed(() => {
    return this.totalCustomQuantity() === (this.batch()?.quantity || 0);
  });

  constructor(
    private http: HttpClient,
    private router: Router,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    // Load verification apps if needed
    this.loadVerificationApps();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadVerificationApps(): void {
    // TODO: Load verification apps from API
    // For now, using hardcoded value
  }

  /**
   * Step 1: Create Batch
   */
  async createBatch(): Promise<void> {
    if (!this.dealerName() || !this.zone() || !this.quantity()) {
      this.error.set('Please fill all required fields');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const body = {
      dealer_name: this.dealerName(),
      zone: this.zone(),
      quantity: this.quantity()
    };

    this.http.post<ApiResponse>(`${this.apiUrl}/batches`, body, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status && response.data) {
            this.batch.set(response.data.batch);
            this.success.set('Batch created successfully');

            // Initialize custom rewards percentages
            const qty = this.quantity();
            this.customRewards.set([
              { amount: 5, quantity: Math.floor(qty * 0.7) },
              { amount: 10, quantity: Math.floor(qty * 0.15) },
              { amount: 50, quantity: Math.floor(qty * 0.15) }
            ]);

            // Move to next step
            setTimeout(() => this.nextStep(), 1000);
          }
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(HttpErrorHandler.getMessage(err, 'Failed to create batch'));
          this.loading.set(false);
        }
      });
  }

  /**
   * Step 2: Assign Serial Codes
   */
  async assignCodes(): Promise<void> {
    const batchId = this.batch()?.id;
    if (!batchId) return;

    this.loading.set(true);
    this.error.set(null);

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const body = {
      quantity: this.batch()?.quantity
    };

    this.http.post<ApiResponse>(
      `${this.apiUrl}/batches/${batchId}/assign-codes`,
      body,
      { headers }
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status && response.data) {
            this.serialRange.set(response.data.serial_range);
            this.success.set(
              `Assigned ${response.data.codes_assigned} serial codes`
            );

            // Update batch status
            const currentBatch = this.batch();
            if (currentBatch) {
              this.batch.set({
                ...currentBatch,
                status: 'code_assigned',
                serial_range: response.data.serial_range
              });
            }

            // Move to next step
            setTimeout(() => this.nextStep(), 1500);
          }
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(HttpErrorHandler.getMessage(err, 'Failed to assign codes'));
          this.loading.set(false);
        }
      });
  }

  /**
   * Step 3: Activate Batch
   */
  async activateBatch(): Promise<void> {
    const batchId = this.batch()?.id;
    if (!batchId) return;

    this.loading.set(true);
    this.error.set(null);

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.post<ApiResponse>(
      `${this.apiUrl}/batches/${batchId}/activate`,
      {},
      { headers }
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status) {
            this.success.set('Batch activated successfully');

            // Update batch status
            const currentBatch = this.batch();
            if (currentBatch) {
              this.batch.set({
                ...currentBatch,
                status: 'activated'
              });
            }

            // Move to next step
            setTimeout(() => this.nextStep(), 1000);
          }
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(HttpErrorHandler.getMessage(err, 'Failed to activate batch'));
          this.loading.set(false);
        }
      });
  }

  /**
   * Step 4: Create Reward Campaign
   */
  async createCampaign(): Promise<void> {
    const batchId = this.batch()?.id;
    if (!batchId) return;

    // Validate custom rewards
    if (this.campaignType() === 'custom' && !this.isCustomRewardsValid()) {
      this.error.set(
        `Total quantity must equal batch quantity (${this.batch()?.quantity})`
      );
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const isCommon = this.campaignType() === 'common';
    const endpoint = `${this.apiUrl}/campaigns${isCommon ? '/common' : '/custom'}`;
    
    const body = isCommon
      ? {
          batch_id: batchId,
          reward_amount: this.commonReward()
        }
      : {
          batch_id: batchId,
          variations: this.customRewards()
        };

    this.http.post<ApiResponse>(endpoint, body, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.status) {
            this.success.set('Reward campaign created successfully! Coupons are now live.');
            this.loading.set(false);

            // Navigate to batch list after 2 seconds
            setTimeout(() => {
              this.router.navigate(['/tenant-admin/batches']);
            }, 2000);
          }
        },
        error: (err) => {
          this.error.set(HttpErrorHandler.getMessage(err, 'Failed to create campaign'));
          this.loading.set(false);
        }
      });
  }

  /**
   * Navigate to next step
   */
  nextStep(): void {
    if (this.currentStep() < 4) {
      this.currentStep.set(this.currentStep() + 1);
      this.error.set(null);
      this.success.set(null);

      // Auto-execute step 2 (assign codes)
      if (this.currentStep() === 2) {
        setTimeout(() => this.assignCodes(), 500);
      }
    }
  }

  /**
   * Navigate to previous step
   */
  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
      this.error.set(null);
      this.success.set(null);
    }
  }

  /**
   * Add custom reward variation
   */
  addRewardVariation(): void {
    this.customRewards.set([
      ...this.customRewards(),
      { amount: 0, quantity: 0 }
    ]);
  }

  /**
   * Remove custom reward variation
   */
  removeRewardVariation(index: number): void {
    const rewards = this.customRewards();
    rewards.splice(index, 1);
    this.customRewards.set([...rewards]);
  }

  /**
   * Update reward variation
   */
  updateRewardVariation(index: number, field: 'amount' | 'quantity', value: number): void {
    const rewards = [...this.customRewards()];
    rewards[index][field] = value;
    this.customRewards.set(rewards);
  }

  /**
   * Cancel and go back to batch list
   */
  cancel(): void {
    this.confirmationService
      .confirm(
        'Are you sure you want to cancel? All progress will be lost.',
        'Cancel Batch Creation'
      )
      .pipe(
        filter(confirmed => confirmed),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.router.navigate(['/tenant-admin/batches']);
      });
  }
}
