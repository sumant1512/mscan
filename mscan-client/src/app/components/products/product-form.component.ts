import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductsService } from '../../services/products.service';
import { TemplateService } from '../../services/template.service';
import { AppContextService } from '../../services/app-context.service';
import { VerificationApp } from '../../store/verification-apps/verification-apps.models';
import {
  ProductTemplate,
  TemplateAttribute,
  AttributeDataType,
  ProductWithAttributes
} from '../../models/templates.model';
import { VariantListEditorComponent } from '../shared/variant-list-editor/variant-list-editor.component';
import { StructuredDescriptionEditorComponent } from '../shared/structured-description-editor/structured-description-editor.component';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    VariantListEditorComponent,
    StructuredDescriptionEditorComponent
  ],
  templateUrl: './product-form-enhanced.component.html',
  styleUrls: ['./product-form-enhanced.component.css']
})
export class ProductFormComponent implements OnInit {
  productForm: FormGroup;
  attributesForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  isEditMode = false;
  productId: number | null = null;
  availableApps: VerificationApp[] = [];
  selectedAppId: string | null = null;

  // Template-related properties
  templates: ProductTemplate[] = [];
  selectedTemplate: ProductTemplate | null = null;
  templateAttributes: TemplateAttribute[] = [];
  attributesByGroup: Map<string, TemplateAttribute[]> = new Map();

  constructor(
    private fb: FormBuilder,
    private productsService: ProductsService,
    private templateService: TemplateService,
    private appContextService: AppContextService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.productForm = this.fb.group({
      product_name: ['', [Validators.required, Validators.minLength(2)]],
      verification_app_id: [null, Validators.required],
      template_id: [''],
      price: ['', [Validators.min(0)]],
      currency: ['USD'],
      image_url: [''],
      is_active: [true]
    });

    this.attributesForm = this.fb.group({});
  }

  ngOnInit() {
    // Load available apps
    this.appContextService.appContext$.subscribe(context => {
      this.availableApps = context.availableApps;
      this.selectedAppId = context.selectedAppId;

      // Only auto-fill in create mode
      if (!this.isEditMode && this.availableApps.length > 0) {
        const appToSelect = this.selectedAppId || this.availableApps[0].verification_app_id;
        this.productForm.patchValue({ verification_app_id: appToSelect });

        // Auto-load template from selected app
        this.loadAppTemplate(appToSelect);
      }
    });

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.productId = +params['id'];
        this.loadProduct();
      }
    });
  }

  // Template list no longer needed - templates are auto-loaded from selected app
  // Keeping the templates property for backward compatibility but not loading them

  loadProduct() {
    if (!this.productId) return;

    this.loading = true;
    this.productsService.getProduct(this.productId).subscribe({
      next: (response) => {
        const product = response.product as ProductWithAttributes;
        this.productForm.patchValue(product);

        // If product has a template, load it and populate attributes
        if (product.template_id) {
          this.loadTemplateAttributes(product.template_id, product.attributes);
        }

        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to load product';
        this.loading = false;
      }
    });
  }

  onAppChange() {
    const selectedAppId = this.productForm.value.verification_app_id;
    if (selectedAppId) {
      // Auto-load template from selected app
      this.loadAppTemplate(selectedAppId);
    }
  }

  loadAppTemplate(appId: string) {
    // Find the selected app
    const selectedApp = this.availableApps.find(app => app.verification_app_id === appId);

    if (selectedApp && selectedApp.template_id) {
      // App has a template - use it
      this.productForm.patchValue({ template_id: selectedApp.template_id });
      this.loadTemplateAttributes(selectedApp.template_id);
    } else {
      // No template - clear attributes
      this.clearAttributeFields();
    }
  }

  // onTemplateChange removed - template is now auto-selected from app, not manually chosen

  loadTemplateAttributes(templateId: string, existingAttributes?: any) {
    this.templateService.getTemplate(templateId).subscribe({
      next: (response) => {
        this.selectedTemplate = response.data;
        this.templateAttributes = (response.data.custom_fields || response.data.attributes || []).sort((a: any, b: any) =>
          a.display_order - b.display_order
        );

        // Group attributes by field_group
        this.groupAttributes();

        // Build dynamic form controls
        this.buildAttributeFormControls(existingAttributes);
      },
      error: (err) => {
        console.error('Load template attributes error:', err);
        this.error = 'Failed to load template attributes';
      }
    });
  }

  groupAttributes() {
    this.attributesByGroup.clear();

    this.templateAttributes.forEach(attr => {
      const group = attr.field_group || 'General';
      if (!this.attributesByGroup.has(group)) {
        this.attributesByGroup.set(group, []);
      }
      this.attributesByGroup.get(group)!.push(attr);
    });
  }

  buildAttributeFormControls(existingAttributes?: any) {
    // Clear existing controls
    Object.keys(this.attributesForm.controls).forEach(key => {
      this.attributesForm.removeControl(key);
    });

    // Add controls for each attribute
    this.templateAttributes.forEach(attr => {
      const validators = [];

      if (attr.is_required) {
        validators.push(Validators.required);
      }

      // Add type-specific validators
      if (attr.data_type === AttributeDataType.EMAIL) {
        validators.push(Validators.email);
      }

      if (attr.data_type === AttributeDataType.NUMBER) {
        if (attr.validation_rules?.min_value !== undefined) {
          validators.push(Validators.min(attr.validation_rules.min_value));
        }
        if (attr.validation_rules?.max_value !== undefined) {
          validators.push(Validators.max(attr.validation_rules.max_value));
        }
      }

      if (attr.data_type === AttributeDataType.STRING) {
        if (attr.validation_rules?.min_length) {
          validators.push(Validators.minLength(attr.validation_rules.min_length));
        }
        if (attr.validation_rules?.max_length) {
          validators.push(Validators.maxLength(attr.validation_rules.max_length));
        }
      }

      // Get initial value
      let initialValue = existingAttributes?.[attr.attribute_key] || attr.default_value || '';

      // Parse JSON values for existing attributes
      if (existingAttributes?.[attr.attribute_key]) {
        try {
          const parsedValue = typeof existingAttributes[attr.attribute_key] === 'string'
            ? JSON.parse(existingAttributes[attr.attribute_key])
            : existingAttributes[attr.attribute_key];
          initialValue = parsedValue;
        } catch (e) {
          initialValue = existingAttributes[attr.attribute_key];
        }
      }

      // Special handling for boolean
      if (attr.data_type === AttributeDataType.BOOLEAN) {
        initialValue = initialValue === 'true' || initialValue === true;
      }

      this.attributesForm.addControl(
        attr.attribute_key,
        new FormControl(initialValue, validators)
      );
    });
  }

  clearAttributeFields() {
    this.selectedTemplate = null;
    this.templateAttributes = [];
    this.attributesByGroup.clear();
    Object.keys(this.attributesForm.controls).forEach(key => {
      this.attributesForm.removeControl(key);
    });
  }

  getAttributeControl(attributeKey: string): FormControl {
    return this.attributesForm.get(attributeKey) as FormControl;
  }

  isAttributeInvalid(attributeKey: string): boolean {
    const control = this.attributesForm.get(attributeKey);
    return !!(control && control.invalid && control.touched);
  }

  getAttributeError(attribute: TemplateAttribute): string {
    const control = this.attributesForm.get(attribute.attribute_key);
    if (!control?.errors) return '';

    if (control.errors['required']) return `${attribute.attribute_name} is required`;
    if (control.errors['email']) return 'Invalid email format';
    if (control.errors['min']) return `Minimum value is ${attribute.validation_rules?.min_value}`;
    if (control.errors['max']) return `Maximum value is ${attribute.validation_rules?.max_value}`;
    if (control.errors['minlength']) return `Minimum length is ${attribute.validation_rules?.min_length}`;
    if (control.errors['maxlength']) return `Maximum length is ${attribute.validation_rules?.max_length}`;

    return 'Invalid value';
  }

  onSubmit() {
    if (this.productForm.invalid) {
      Object.keys(this.productForm.controls).forEach(key => {
        this.productForm.controls[key].markAsTouched();
      });
      return;
    }

    if (this.attributesForm.invalid) {
      Object.keys(this.attributesForm.controls).forEach(key => {
        this.attributesForm.controls[key].markAsTouched();
      });
      this.error = 'Please fill in all required attributes';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const formData = {
      ...this.productForm.value,
      attributes: this.attributesForm.value
    };

    const request = this.isEditMode && this.productId
      ? this.productsService.updateProduct(this.productId, formData)
      : this.productsService.createProduct(formData);

    request.subscribe({
      next: (response) => {
        this.success = response.message;
        this.loading = false;
        setTimeout(() => {
          this.router.navigate(['/tenant/products']);
        }, 1500);
      },
      error: (err) => {
        this.error = err.error?.error || err.error?.message || 'Failed to save product';
        if (err.error?.validation_errors) {
          const validationErrors = err.error.validation_errors
            .map((e: any) => `${e.field}: ${e.message}`)
            .join(', ');
          this.error += ` (${validationErrors})`;
        }
        this.loading = false;
      }
    });
  }

  cancel() {
    this.router.navigate(['/tenant/products']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.productForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.productForm.get(fieldName);
    if (field?.errors?.['required']) return `${fieldName} is required`;
    if (field?.errors?.['minlength']) return `${fieldName} is too short`;
    if (field?.errors?.['min']) return `${fieldName} must be positive`;
    return '';
  }

  getAttributeGroups(): string[] {
    return Array.from(this.attributesByGroup.keys());
  }

  getAttributesInGroup(group: string): TemplateAttribute[] {
    return this.attributesByGroup.get(group) || [];
  }

  // Helper methods for template rendering
  isSelectType(dataType: AttributeDataType): boolean {
    return dataType === AttributeDataType.SELECT || dataType === AttributeDataType.MULTI_SELECT;
  }

  isBooleanType(dataType: AttributeDataType): boolean {
    return dataType === AttributeDataType.BOOLEAN;
  }

  isDateType(dataType: AttributeDataType): boolean {
    return dataType === AttributeDataType.DATE;
  }

  isNumberType(dataType: AttributeDataType): boolean {
    return dataType === AttributeDataType.NUMBER;
  }

  isTextType(dataType: AttributeDataType): boolean {
    return dataType === AttributeDataType.STRING ||
           dataType === AttributeDataType.URL ||
           dataType === AttributeDataType.EMAIL;
  }

  getInputType(dataType: AttributeDataType): string {
    switch (dataType) {
      case AttributeDataType.EMAIL: return 'email';
      case AttributeDataType.URL: return 'url';
      case AttributeDataType.NUMBER: return 'number';
      case AttributeDataType.DATE: return 'date';
      default: return 'text';
    }
  }

  getSelectOptions(attribute: TemplateAttribute): string[] {
    return attribute.validation_rules?.options || [];
  }

  isVariantListType(dataType: AttributeDataType): boolean {
    return dataType === AttributeDataType.VARIANT_LIST;
  }

  isStructuredListType(dataType: AttributeDataType): boolean {
    return dataType === AttributeDataType.STRUCTURED_LIST;
  }

  isComplexType(dataType: AttributeDataType): boolean {
    return this.isVariantListType(dataType) || this.isStructuredListType(dataType);
  }
}
