import { Component, Input, forwardRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, Validators, ReactiveFormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TemplateAttribute, ProductVariant, VariantFieldDefinition } from '../../../models/templates.model';

@Component({
  selector: 'app-variant-list-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './variant-list-editor.component.html',
  styleUrls: ['./variant-list-editor.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => VariantListEditorComponent),
      multi: true
    }
  ]
})
export class VariantListEditorComponent implements ControlValueAccessor, OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() attribute!: TemplateAttribute;

  variantsForm: FormArray;
  onChange: any = () => {};
  onTouched: any = () => {};
  disabled = false;

  constructor(private fb: FormBuilder) {
    this.variantsForm = this.fb.array([]);
  }

  ngOnInit() {
    // Subscribe to form changes to propagate values
    this.variantsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.onChange(value);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get variants(): FormArray {
    return this.variantsForm;
  }

  get variantFields(): VariantFieldDefinition[] {
    return this.attribute?.validation_rules?.fields || [];
  }

  get minVariants(): number {
    return this.attribute?.validation_rules?.min_variants || 1;
  }

  get maxVariants(): number {
    return this.attribute?.validation_rules?.max_variants || 20;
  }

  get canAddVariant(): boolean {
    return this.variants.length < this.maxVariants;
  }

  get canRemoveVariant(): boolean {
    return this.variants.length > this.minVariants;
  }

  addVariant(): void {
    const variantGroup = this.createVariantFormGroup();
    this.variants.push(variantGroup);
    this.onChange(this.variantsForm.value);
  }

  removeVariant(index: number): void {
    if (this.canRemoveVariant) {
      this.variants.removeAt(index);
      this.onChange(this.variantsForm.value);
    }
  }

  setDefaultVariant(index: number): void {
    // Unset all other defaults
    this.variants.controls.forEach((control, i) => {
      if (i === index) {
        control.get('is_default')?.setValue(true);
      } else {
        control.get('is_default')?.setValue(false);
      }
    });
    this.onChange(this.variantsForm.value);
  }

  private createVariantFormGroup(variantData?: ProductVariant): FormGroup {
    const group: any = {
      variant_id: [variantData?.variant_id || this.generateVariantId()],
      is_default: [variantData?.is_default || false]
    };

    // Add form controls for each field defined in the template
    this.variantFields.forEach(field => {
      const validators = field.required ? [Validators.required] : [];

      if (field.type === 'number') {
        validators.push(Validators.min(0));
      }

      group[field.attribute_key] = [
        variantData?.[field.attribute_key] || '',
        validators
      ];
    });

    return this.fb.group(group);
  }

  private generateVariantId(): string {
    return 'v-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  getFieldControl(variantIndex: number, fieldKey: string): any {
    return this.variants.at(variantIndex).get(fieldKey);
  }

  isFieldInvalid(variantIndex: number, fieldKey: string): boolean {
    const control = this.getFieldControl(variantIndex, fieldKey);
    return control && control.invalid && control.touched;
  }

  getFieldError(variantIndex: number, field: VariantFieldDefinition): string {
    const control = this.getFieldControl(variantIndex, field.attribute_key);
    if (!control?.errors) return '';

    if (control.errors['required']) return `${field.attribute_name} is required`;
    if (control.errors['min']) return `${field.attribute_name} must be positive`;

    return 'Invalid value';
  }

  // ControlValueAccessor implementation
  writeValue(value: ProductVariant[]): void {
    this.variants.clear();

    if (value && Array.isArray(value)) {
      value.forEach(variant => {
        this.variants.push(this.createVariantFormGroup(variant));
      });
    } else if (this.minVariants > 0) {
      // Add minimum required variants
      for (let i = 0; i < this.minVariants; i++) {
        this.addVariant();
      }
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.variants.disable();
    } else {
      this.variants.enable();
    }
  }
}
