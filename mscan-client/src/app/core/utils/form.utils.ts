/**
 * Form Utilities
 * Common form validation and handling utilities
 */

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Mark all form controls as touched to show validation errors
 */
export function markFormGroupTouched(formGroup: any): void {
  Object.keys(formGroup.controls).forEach(key => {
    const control = formGroup.get(key);
    control?.markAsTouched();

    if (control && typeof control === 'object' && 'controls' in control) {
      markFormGroupTouched(control);
    }
  });
}

/**
 * Get all validation errors from a form
 */
export function getFormValidationErrors(formGroup: any): { [key: string]: any } {
  const errors: { [key: string]: any } = {};

  Object.keys(formGroup.controls).forEach(key => {
    const control = formGroup.get(key);
    if (control && control.errors) {
      errors[key] = control.errors;
    }
  });

  return errors;
}

/**
 * Custom validator: Email format
 */
export function emailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(control.value) ? null : { invalidEmail: true };
  };
}

/**
 * Custom validator: Phone number
 */
export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(control.value) ? null : { invalidPhone: true };
  };
}

/**
 * Custom validator: Price (positive number with max 2 decimals)
 */
export function priceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const price = parseFloat(control.value);
    if (isNaN(price) || price < 0) {
      return { invalidPrice: true };
    }

    const decimalPlaces = (control.value.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      return { tooManyDecimals: true };
    }

    return null;
  };
}

/**
 * Custom validator: Password strength
 */
export function passwordStrengthValidator(minLength: number = 8): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const password = control.value;
    const errors: any = {};

    if (password.length < minLength) {
      errors.minLength = { requiredLength: minLength, actualLength: password.length };
    }

    if (!/[A-Z]/.test(password)) {
      errors.noUpperCase = true;
    }

    if (!/[a-z]/.test(password)) {
      errors.noLowerCase = true;
    }

    if (!/[0-9]/.test(password)) {
      errors.noNumber = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
  };
}

/**
 * Custom validator: Match another field
 */
export function matchFieldValidator(matchFieldName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.parent) {
      return null;
    }

    const matchField = control.parent.get(matchFieldName);
    if (!matchField) {
      return null;
    }

    return control.value === matchField.value ? null : { fieldMismatch: true };
  };
}
