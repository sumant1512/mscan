import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CreditService } from '../../services/credit.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-credit-request-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './credit-request-form.component.html',
  styleUrls: ['./credit-request-form.component.css']
})
export class CreditRequestFormComponent implements OnInit {
  requestForm: FormGroup;
  loading = false;
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

  loadBalance() {
    this.creditService.getBalance().subscribe({
      next: (balance) => {
        this.currentBalance = balance.balance;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load balance:', err);
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

    this.loading = true;
    this.error = '';
    this.success = '';

    const { amount, justification } = this.requestForm.value;

    this.creditService.requestCredits(amount, justification)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          this.success = `Credit request submitted successfully! Request ID: ${response.request.id}`;
          this.requestForm.reset();
          setTimeout(() => this.success = '', 5000);
        },
        error: (err) => {
          console.error('Request credits error:', err);
          this.error = err.error?.error || err.message || 'Failed to submit credit request';
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
