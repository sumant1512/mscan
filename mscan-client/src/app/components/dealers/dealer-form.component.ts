/**
 * Dealer Form Component
 * Create and edit dealers
 */
import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DealerService } from '../../services/dealer.service';
import { AuthService } from '../../services/auth.service';
import { CreateDealerRequest } from '../../models';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-dealer-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dealer-form.component.html',
  styleUrls: ['./dealer-form.component.css']
})
export class DealerFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private loadingService = inject(LoadingService);

  isEditMode = false;
  dealerId: string | null = null;
  loading$ = this.loadingService.loading$;
  saving = false;
  error = '';

  formData: CreateDealerRequest = {
    full_name: '',
    email: '',
    phone_e164: '',
    shop_name: '',
    address: '',
    pincode: '',
    city: '',
    state: ''
  };

  constructor(
    private dealerService: DealerService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['id']) {
          this.isEditMode = true;
          this.dealerId = params['id'];
          this.loadDealer();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDealer() {
    if (!this.dealerId) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.tenant?.id) {
      this.error = 'No tenant context available';
      return;
    }

    this.dealerService.getDealer(currentUser.tenant.id, this.dealerId)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          if (response.status && response.data) {
            const dealer = response.data;
            this.formData = {
              full_name: dealer.full_name || '',
              email: dealer.email || '',
              phone_e164: dealer.phone_e164 || '',
              shop_name: dealer.shop_name || '',
              address: dealer.address || '',
              pincode: dealer.pincode || '',
              city: dealer.city || '',
              state: dealer.state || ''
            };
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to load dealer');
          this.cdr.detectChanges();
        }
      });
  }

  onSubmit() {
    if (!this.validateForm()) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.tenant?.id) {
      this.error = 'No tenant context available';
      return;
    }

    this.error = '';
    this.saving = true;

    if (this.isEditMode && this.dealerId) {
      this.dealerService.updateDealer(currentUser.tenant.id, this.dealerId, this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.saving = false;
            if (response.status) {
              this.router.navigate(['/tenant/dealers']);
            }
          },
          error: (err) => {
            this.saving = false;
            this.error = HttpErrorHandler.getMessage(err, 'Failed to update dealer');
            this.cdr.detectChanges();
          }
        });
    } else {
      this.dealerService.createDealer(currentUser.tenant.id, this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.saving = false;
            if (response.status) {
              this.router.navigate(['/tenant/dealers']);
            }
          },
          error: (err) => {
            this.saving = false;
            this.error = HttpErrorHandler.getMessage(err, 'Failed to create dealer');
            this.cdr.detectChanges();
          }
        });
    }
  }

  validateForm(): boolean {
    if (!this.formData.full_name || !this.formData.phone_e164 || !this.formData.shop_name ||
        !this.formData.address || !this.formData.pincode || !this.formData.city || !this.formData.state) {
      this.error = 'Please fill in all required fields';
      return false;
    }

    // Phone validation (E.164 format)
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(this.formData.phone_e164)) {
      this.error = 'Please enter a valid phone number in E.164 format (e.g., +919876543210)';
      return false;
    }

    // Email validation (optional but must be valid if provided)
    if (this.formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.formData.email)) {
        this.error = 'Please enter a valid email address';
        return false;
      }
    }

    // Pincode validation
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(this.formData.pincode)) {
      this.error = 'Please enter a valid 6-digit pincode';
      return false;
    }

    return true;
  }

  cancel() {
    this.router.navigate(['/tenant/dealers']);
  }
}
