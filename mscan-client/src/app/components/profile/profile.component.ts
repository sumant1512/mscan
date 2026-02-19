import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  profileForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  currentUser: any = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.profileForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^\+?[\d\s-()]+$/)]]
    });
  }

  ngOnInit() {
    this.loadUserProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserProfile() {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          if (user) {
            this.currentUser = user;
            this.profileForm.patchValue({
              full_name: user.full_name,
              email: user.email,
              phone: user.phone || ''
            });
            // Disable email field as it's usually not editable
            this.profileForm.get('email')?.disable();
          }
        }
      });
  }

  onSubmit() {
    if (this.profileForm.invalid) {
      this.error = 'Please fill all required fields correctly.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    // TODO: Implement API call to update profile
    setTimeout(() => {
      this.loading = false;
      this.success = 'Profile updated successfully!';
      setTimeout(() => this.success = '', 3000);
    }, 500);
  }
}
