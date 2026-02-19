import { ChangeDetectorRef, Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CreditService } from '../../services/credit.service';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';

@Component({
  selector: 'app-credit-request-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './credit-request-form.component.html',
  styleUrls: ['./credit-request-form.component.css']
})
export class CreditRequestFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  requestForm: FormGroup;
  private loadingService = inject(LoadingService);

  loading$ = this.loadingService.loading$;
  error = '';
  success = '';
  currentBalance = 0;

  constructor(
    private fb: FormBuilder,
    private creditService: CreditService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.requestForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(100), Validators.max(100000)]],
      justification: ['', [Validators.required, Validators.minLength(20)]]
    });
  }

  ngOnInit() {
    this.loadBalance();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBalance() {
    this.creditService.getBalance()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (balance) => {
          this.currentBalance = balance.balance;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to load balance');
          this.cdr.detectChanges();
        }
      });
  }

  onSubmit() {
    if (this.requestForm.invalid) {
      Object.keys(this.requestForm.controls).forEach(key => {
        this.requestForm.controls[key].markAsTouched();
      });
      return;
    }

    this.error = '';
    this.success = '';

    const { amount, justification } = this.requestForm.value;

    this.creditService.requestCredits(amount, justification)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response: any) => {
          this.success = `Credit request submitted successfully! Request ID: ${response.request.id}`;
          this.requestForm.reset();
          setTimeout(() => this.success = '', 5000);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to submit credit request');
          this.cdr.detectChanges();
        }
      });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.requestForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  getFieldError(field: string): string {
    const control = this.requestForm.get(field);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('min')) {
      return `Minimum value is ${control.errors?.['min'].min}`;
    }
    if (control?.hasError('max')) {
      return `Maximum value is ${control.errors?.['max'].max}`;
    }
    if (control?.hasError('minlength')) {
      return `Minimum ${control.errors?.['minlength'].requiredLength} characters required`;
    }
    return '';
  }
}
