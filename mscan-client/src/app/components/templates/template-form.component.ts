import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TemplateService } from '../../services/template.service';
import {
  ProductTemplate,
  TemplateAttribute,
  AttributeDataType,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CreateTemplateAttributeRequest,
  VariantDimension,
  VariantCommonField
} from '../../models/templates.model';

@Component({
  selector: 'app-template-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './template-form.component.html',
  styleUrls: ['./template-form.component.css']
})
export class TemplateFormComponent implements OnInit {
  isEditMode = false;
  templateId: string | null = null;
  loading = false;
  error: string | null = null;

  // Form model
  template = {
    name: '',
    industry_type: '',
    description: '',
    icon: ''
  };

  // Industry type options
  industryTypes = [
    { value: 'basic', label: 'Basic Product' },
    { value: 'clothing', label: 'Clothing & Apparel' },
    { value: 'footwear', label: 'Footwear' },
    { value: 'jewelry', label: 'Jewelry' },
    { value: 'paint', label: 'Paint & Coatings' },
    { value: 'bags', label: 'Bags & Accessories' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'cosmetics', label: 'Cosmetics & Beauty' },
    { value: 'food', label: 'Food & Beverage' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'sports', label: 'Sports & Fitness' },
    { value: 'custom', label: 'Custom' }
  ];

  attributes: AttributeFormModel[] = [];

  // Variant Configuration
  variantConfig = {
    variant_label: 'Variants',
    dimensions: [] as VariantDimension[],
    common_fields: [] as VariantCommonField[]
  };

  // Available options
  dataTypes = Object.values(AttributeDataType);
  variantFieldTypes = ['text', 'number', 'select'];

  constructor(
    private templateService: TemplateService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.templateId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.templateId;

    if (this.isEditMode && this.templateId) {
      this.loadTemplate(this.templateId);
    }
  }

  loadTemplate(id: string): void {
    this.loading = true;
    this.templateService.getTemplate(id).subscribe({
      next: (response) => {
        const tmpl = response.data;
        this.template = {
          name: tmpl.template_name || tmpl.name || '',
          industry_type: tmpl.industry_type || '',
          description: tmpl.description || '',
          icon: tmpl.icon || ''
        };

        this.attributes = (tmpl.custom_fields || tmpl.attributes || []).map((attr: any) => ({
          id: attr.id,
          attribute_name: attr.attribute_name,
          attribute_key: attr.attribute_key,
          data_type: attr.data_type,
          is_required: attr.is_required,
          validation_rules: attr.validation_rules || {},
          default_value: attr.default_value || '',
          display_order: attr.display_order,
          field_group: attr.field_group || '',
          help_text: attr.help_text || '',
          placeholder: attr.placeholder || ''
        }));

        // Load variant configuration
        if (tmpl.variant_config) {
          this.variantConfig = {
            variant_label: tmpl.variant_config.variant_label || 'Variants',
            dimensions: (tmpl.variant_config.dimensions || []).map((dim: any) => ({
              attribute_key: dim.attribute_key,
              attribute_name: dim.attribute_name,
              type: dim.type,
              required: dim.required || false,
              options: dim.options || []
            })),
            common_fields: (tmpl.variant_config.common_fields || []).map((field: any) => ({
              attribute_key: field.attribute_key,
              attribute_name: field.attribute_name,
              type: field.type,
              required: field.required || false,
              placeholder: field.placeholder || '',
              min: field.min,
              max: field.max
            }))
          };
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading template:', error);
        this.error = error.error?.message || 'Failed to load template';
        this.loading = false;
      }
    });
  }

  addAttribute(): void {
    const newAttribute: AttributeFormModel = {
      attribute_name: '',
      attribute_key: '',
      data_type: AttributeDataType.STRING,
      is_required: false,
      validation_rules: {},
      default_value: '',
      display_order: this.attributes.length,
      field_group: '',
      help_text: '',
      placeholder: ''
    };
    this.attributes.push(newAttribute);
  }

  removeAttribute(index: number): void {
    this.attributes.splice(index, 1);
    this.reorderAttributes();
  }

  moveAttributeUp(index: number): void {
    if (index > 0) {
      [this.attributes[index], this.attributes[index - 1]] =
        [this.attributes[index - 1], this.attributes[index]];
      this.reorderAttributes();
    }
  }

  moveAttributeDown(index: number): void {
    if (index < this.attributes.length - 1) {
      [this.attributes[index], this.attributes[index + 1]] =
        [this.attributes[index + 1], this.attributes[index]];
      this.reorderAttributes();
    }
  }

  reorderAttributes(): void {
    this.attributes.forEach((attr, index) => {
      attr.display_order = index;
    });
  }

  onAttributeNameChange(attribute: AttributeFormModel): void {
    // Auto-generate attribute key from name
    if (!attribute.attribute_key || attribute.attribute_key === '') {
      attribute.attribute_key = attribute.attribute_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }
  }

  onDataTypeChange(attribute: AttributeFormModel): void {
    // Reset validation rules when data type changes
    attribute.validation_rules = {};

    // Set default validation rules based on type
    if (attribute.data_type === AttributeDataType.SELECT ||
        attribute.data_type === AttributeDataType.MULTI_SELECT) {
      attribute.validation_rules.options = [];
    }
  }

  addSelectOption(attribute: AttributeFormModel): void {
    if (!attribute.validation_rules.options) {
      attribute.validation_rules.options = [];
    }
    const option = prompt('Enter option value:');
    if (option) {
      attribute.validation_rules.options.push(option);
    }
  }

  removeSelectOption(attribute: AttributeFormModel, index: number): void {
    if (attribute.validation_rules.options) {
      attribute.validation_rules.options.splice(index, 1);
    }
  }

  validateForm(): string | null {
    if (!this.template.name.trim()) {
      return 'Template name is required';
    }

    if (!this.template.industry_type) {
      return 'Industry type is required';
    }

    // Either attributes OR variant config required (or both)
    if (this.attributes.length === 0 && this.variantConfig.dimensions.length === 0) {
      return 'Template must have either custom fields or variant dimensions (or both)';
    }

    // Validate attributes
    for (let i = 0; i < this.attributes.length; i++) {
      const attr = this.attributes[i];
      if (!attr.attribute_name.trim()) {
        return `Attribute #${i + 1}: Name is required`;
      }
      if (!attr.attribute_key.trim()) {
        return `Attribute #${i + 1}: Key is required`;
      }
      if ((attr.data_type === AttributeDataType.SELECT ||
           attr.data_type === AttributeDataType.MULTI_SELECT) &&
          (!attr.validation_rules.options || attr.validation_rules.options.length === 0)) {
        return `Attribute #${i + 1}: Select options are required`;
      }
    }

    // Validate variant dimensions
    for (let i = 0; i < this.variantConfig.dimensions.length; i++) {
      const dim = this.variantConfig.dimensions[i];
      if (!dim.attribute_name.trim()) {
        return `Variant Dimension #${i + 1}: Name is required`;
      }
      if (!dim.attribute_key.trim()) {
        return `Variant Dimension #${i + 1}: Key is required`;
      }
      if (dim.type === 'select' && (!dim.options || dim.options.length === 0)) {
        return `Variant Dimension #${i + 1}: Options are required for select type`;
      }
    }

    // Validate common fields
    for (let i = 0; i < this.variantConfig.common_fields.length; i++) {
      const field = this.variantConfig.common_fields[i];
      if (!field.attribute_name.trim()) {
        return `Common Field #${i + 1}: Name is required`;
      }
      if (!field.attribute_key.trim()) {
        return `Common Field #${i + 1}: Key is required`;
      }
    }

    return null;
  }

  onSubmit(): void {
    const validationError = this.validateForm();
    if (validationError) {
      this.error = validationError;
      return;
    }

    this.loading = true;
    this.error = null;

    if (this.isEditMode && this.templateId) {
      this.updateTemplate();
    } else {
      this.createTemplate();
    }
  }

  createTemplate(): void {
    const request: CreateTemplateRequest = {
      template_name: this.template.name,
      industry_type: this.template.industry_type,
      description: this.template.description || undefined,
      icon: this.template.icon || undefined,
      variant_config: {
        variant_label: this.variantConfig.variant_label,
        dimensions: this.variantConfig.dimensions,
        common_fields: this.variantConfig.common_fields
      },
      custom_fields: this.attributes.map(attr => ({
        attribute_name: attr.attribute_name,
        attribute_key: attr.attribute_key,
        data_type: attr.data_type,
        is_required: attr.is_required,
        validation_rules: Object.keys(attr.validation_rules).length > 0 ? attr.validation_rules : undefined,
        default_value: attr.default_value || undefined,
        display_order: attr.display_order,
        field_group: attr.field_group || undefined,
        help_text: attr.help_text || undefined,
        placeholder: attr.placeholder || undefined
      }))
    };

    this.templateService.createTemplate(request).subscribe({
      next: (response) => {
        alert('Template created successfully');
        this.router.navigate(['/templates']);
      },
      error: (error) => {
        console.error('Error creating template:', error);
        this.error = error.error?.message || 'Failed to create template';
        this.loading = false;
      }
    });
  }

  updateTemplate(): void {
    if (!this.templateId) return;

    const request: UpdateTemplateRequest = {
      template_name: this.template.name,
      industry_type: this.template.industry_type,
      description: this.template.description || undefined,
      icon: this.template.icon || undefined,
      variant_config: {
        dimensions: this.variantConfig.dimensions,
        common_fields: this.variantConfig.common_fields,
        variant_label: this.variantConfig.variant_label
      },
      custom_fields: this.attributes.map(attr => ({
        attribute_key: attr.attribute_key,
        attribute_name: attr.attribute_name,
        data_type: attr.data_type,
        is_required: attr.is_required,
        validation_rules: attr.validation_rules,
        default_value: attr.default_value || undefined,
        display_order: attr.display_order,
        field_group: attr.field_group || undefined,
        help_text: attr.help_text || undefined,
        placeholder: attr.placeholder || undefined
      }))
    };

    this.templateService.updateTemplate(this.templateId, request).subscribe({
      next: (response) => {
        alert('Template updated successfully');
        this.router.navigate(['/templates', this.templateId]);
      },
      error: (error) => {
        console.error('Error updating template:', error);
        this.error = error.error?.message || 'Failed to update template';
        this.loading = false;
      }
    });
  }

  cancel(): void {
    if (this.isEditMode && this.templateId) {
      this.router.navigate(['/templates', this.templateId]);
    } else {
      this.router.navigate(['/templates']);
    }
  }

  // ========== Variant Dimension Methods ==========

  addDimension(): void {
    const newDimension: VariantDimension = {
      attribute_key: '',
      attribute_name: '',
      type: 'select',
      required: true,
      options: []
    };
    this.variantConfig.dimensions.push(newDimension);
  }

  removeDimension(index: number): void {
    this.variantConfig.dimensions.splice(index, 1);
  }

  onDimensionNameChange(dimension: VariantDimension): void {
    // Auto-generate attribute key from name
    if (!dimension.attribute_key || dimension.attribute_key === '') {
      dimension.attribute_key = dimension.attribute_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }
  }

  addDimensionOption(dimension: VariantDimension): void {
    const option = prompt('Enter option value (e.g., "1L", "Red", "M"):');
    if (option && option.trim()) {
      if (!dimension.options) {
        dimension.options = [];
      }
      dimension.options.push(option.trim());
    }
  }

  removeDimensionOption(dimension: VariantDimension, index: number): void {
    if (dimension.options) {
      dimension.options.splice(index, 1);
    }
  }

  // ========== Common Field Methods ==========

  addCommonField(): void {
    const newField: VariantCommonField = {
      attribute_key: '',
      attribute_name: '',
      type: 'text',
      required: false,
      placeholder: ''
    };
    this.variantConfig.common_fields.push(newField);
  }

  removeCommonField(index: number): void {
    this.variantConfig.common_fields.splice(index, 1);
  }

  onCommonFieldNameChange(field: VariantCommonField): void {
    // Auto-generate attribute key from name
    if (!field.attribute_key || field.attribute_key === '') {
      field.attribute_key = field.attribute_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }
  }

  getDataTypeLabel(type: AttributeDataType): string {
    const labels: { [key: string]: string } = {
      [AttributeDataType.STRING]: 'Text',
      [AttributeDataType.NUMBER]: 'Number',
      [AttributeDataType.BOOLEAN]: 'Yes/No',
      [AttributeDataType.DATE]: 'Date',
      [AttributeDataType.SELECT]: 'Dropdown',
      [AttributeDataType.MULTI_SELECT]: 'Multi-Select',
      [AttributeDataType.URL]: 'URL',
      [AttributeDataType.EMAIL]: 'Email'
    };
    return labels[type] || type;
  }

  needsOptions(dataType: AttributeDataType): boolean {
    return dataType === AttributeDataType.SELECT || dataType === AttributeDataType.MULTI_SELECT;
  }

  needsStringValidation(dataType: AttributeDataType): boolean {
    return dataType === AttributeDataType.STRING ||
           dataType === AttributeDataType.URL ||
           dataType === AttributeDataType.EMAIL;
  }

  needsNumberValidation(dataType: AttributeDataType): boolean {
    return dataType === AttributeDataType.NUMBER;
  }
}

interface AttributeFormModel {
  id?: string;
  attribute_name: string;
  attribute_key: string;
  data_type: AttributeDataType;
  is_required: boolean;
  validation_rules: any;
  default_value: string;
  display_order: number;
  field_group: string;
  help_text: string;
  placeholder: string;
}
