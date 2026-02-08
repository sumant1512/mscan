import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductsService } from '../../services/products.service';
import { TemplateService } from '../../services/template.service';
import { TagService } from '../../services/tag.service';
import { AppContextService } from '../../services/app-context.service';
import { VerificationApp } from '../../store/verification-apps/verification-apps.models';
import {
  ProductTemplate,
  Tag,
  CreateProductRequest,
  ProductVariant,
  DescriptionSection
} from '../../models/templates.model';

@Component({
  selector: 'app-template-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './template-product-form.component.html',
  styleUrls: ['./template-product-form.component.css']
})
export class TemplateProductFormComponent implements OnInit {
  loading = false;
  error: string | null = null;
  isEditMode = false;
  productId: number | null = null;

  // Verification Apps
  availableApps: VerificationApp[] = [];
  selectedAppId: string | null = null;
  private previousAppId: string | null = null; // Track previous app to detect changes

  // Template (auto-loaded from selected app)
  selectedTemplate: ProductTemplate | null = null;

  // Tags
  availableTags: Tag[] = [];
  selectedTagIds: string[] = [];

  // Product Form Model
  product = {
    product_name: '',
    verification_app_id: '',
    template_id: '',
    currency: 'INR',
    is_active: true
  };

  // Variants (dynamic based on template)
  variants: ProductVariant[] = [];

  // Custom Fields (dynamic based on template)
  customFields: { [key: string]: any } = {};

  // Description Sections
  descriptionSections: DescriptionSection[] = [];

  constructor(
    private productsService: ProductsService,
    private templateService: TemplateService,
    private tagService: TagService,
    private appContextService: AppContextService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Check if edit mode first
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.productId = +params['id'];
        this.loadProduct();
      }
    });

    // Load available apps and react to changes from header
    this.appContextService.appContext$.subscribe(context => {
      console.log('=== [TemplateProductForm] App context subscription fired ===');
      console.log('[TemplateProductForm] Context:', context);
      console.log('[TemplateProductForm] isEditMode:', this.isEditMode);

      this.availableApps = context.availableApps;
      const newSelectedAppId = context.selectedAppId;

      console.log('[TemplateProductForm] Available apps count:', this.availableApps.length);
      console.log('[TemplateProductForm] New selected app ID from context:', newSelectedAppId);

      // Only update if not in edit mode
      if (!this.isEditMode && this.availableApps.length > 0) {
        const appToSelect = newSelectedAppId || this.availableApps[0].verification_app_id;

        // Check if the app has actually changed
        const appChanged = this.previousAppId !== appToSelect;
        console.log('[TemplateProductForm] App changed?', appChanged);
        console.log('[TemplateProductForm] Previous app ID:', this.previousAppId);
        console.log('[TemplateProductForm] New app ID:', appToSelect);

        if (appChanged || !this.previousAppId) {
          console.log('[TemplateProductForm] Loading template for app:', appToSelect);

          // Update the selected app
          this.product.verification_app_id = appToSelect;
          this.previousAppId = appToSelect;

          // Load template and tags for the new app
          this.loadTemplateFromApp(appToSelect);
          this.loadTags(appToSelect);
        } else {
          console.log('[TemplateProductForm] App has not changed, skipping reload');
        }
      } else {
        console.log('[TemplateProductForm] Skipping - isEditMode:', this.isEditMode, 'apps length:', this.availableApps.length);
      }
    });
  }

  // Auto-load template from selected app's template_id
  loadTemplateFromApp(appId: string): void {
    console.log('[TemplateProductForm] loadTemplateFromApp called with appId:', appId);
    console.log('[TemplateProductForm] Available apps:', this.availableApps);

    const selectedApp = this.availableApps.find(app => app.verification_app_id === appId);
    console.log('[TemplateProductForm] Selected app:', selectedApp);

    if (selectedApp && selectedApp.template_id) {
      console.log('[TemplateProductForm] App has template_id:', selectedApp.template_id);
      // App has a template - auto-load it
      this.product.template_id = selectedApp.template_id;
      this.loadTemplateDetails(selectedApp.template_id);
    } else {
      console.log('[TemplateProductForm] No template assigned to app');
      // No template assigned to this app
      this.selectedTemplate = null;
      this.variants = [];
      this.customFields = {};
      this.descriptionSections = [];
    }
  }

  // Load template details and initialize form fields
  loadTemplateDetails(templateId: string): void {
    console.log('[TemplateProductForm] loadTemplateDetails called with templateId:', templateId);
    this.loading = true;
    this.templateService.getTemplateById(templateId).subscribe({
      next: (response) => {
        console.log('[TemplateProductForm] Template response:', response);
        this.selectedTemplate = response.data;
        console.log('[TemplateProductForm] Selected template set to:', this.selectedTemplate);
        console.log('[TemplateProductForm] Template has variant_config?', !!this.selectedTemplate?.variant_config);
        console.log('[TemplateProductForm] Template has custom_fields?', !!this.selectedTemplate?.custom_fields);

        if (this.selectedTemplate?.variant_config) {
          console.log('[TemplateProductForm] Variant config:', this.selectedTemplate.variant_config);
        }
        if (this.selectedTemplate?.custom_fields) {
          console.log('[TemplateProductForm] Custom fields:', this.selectedTemplate.custom_fields);
        }

        // Initialize with one empty variant
        this.variants = [];
        this.addVariant();

        // Initialize custom fields
        this.initializeCustomFields();

        // Initialize description sections
        this.descriptionSections = [{ heading: '', descriptions: [''] }];

        this.loading = false;
        console.log('[TemplateProductForm] Template loaded successfully');
        console.log('[TemplateProductForm] Variants:', this.variants);
        console.log('[TemplateProductForm] Custom fields:', this.customFields);

        // Force change detection
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading template:', error);
        this.error = 'Failed to load template';
        this.loading = false;
      }
    });
  }

  // Handle app change - auto-load template from new app
  onAppChange(): void {
    if (!this.product.verification_app_id) return;

    this.loadTemplateFromApp(this.product.verification_app_id);
    this.loadTags(this.product.verification_app_id);
  }

  loadTags(appId: string): void {
    this.tagService.getAllTags({ app_id: appId }).subscribe({
      next: (response) => {
        this.availableTags = response.data.filter(tag => tag.is_active);
      },
      error: (error) => {
        console.error('Error loading tags:', error);
      }
    });
  }

  loadProduct(): void {
    if (!this.productId) return;

    this.loading = true;
    this.productsService.getProduct(this.productId).subscribe({
      next: (response: any) => {
        const product = response.product || response;

        // Populate basic fields
        this.product = {
          product_name: product.product_name,
          verification_app_id: product.verification_app_id,
          template_id: product.template_id,
          currency: product.currency || 'INR',
          is_active: product.is_active !== false
        };

        // Load template and then populate dynamic fields
        this.templateService.getTemplateById(product.template_id).subscribe({
          next: (templateResponse) => {
            this.selectedTemplate = templateResponse.data;

            // Populate variants
            if (product.attributes?.variants) {
              this.variants = product.attributes.variants;
            } else {
              this.addVariant();
            }

            // Populate custom fields
            if (product.attributes?.custom_fields) {
              this.customFields = product.attributes.custom_fields;
            } else {
              this.initializeCustomFields();
            }

            // Populate description sections
            if (product.attributes?.description_sections) {
              this.descriptionSections = product.attributes.description_sections;
            }

            this.loading = false;
          },
          error: (error) => {
            console.error('Error loading template:', error);
            this.error = 'Failed to load product template';
            this.loading = false;
          }
        });

        // Load tags for this app
        this.loadTags(product.verification_app_id);

        // Set selected tags
        if (product.tags) {
          this.selectedTagIds = product.tags.map((tag: Tag) => tag.id);
        }
      },
      error: (error) => {
        console.error('Error loading product:', error);
        this.error = 'Failed to load product';
        this.loading = false;
      }
    });
  }

  // onTemplateChange removed - template is now auto-loaded from app
  // This method is no longer needed as templates are automatically selected based on the app

  initializeCustomFields(): void {
    if (!this.selectedTemplate || !this.selectedTemplate.custom_fields) return;

    this.customFields = {};
    this.selectedTemplate.custom_fields.forEach(field => {
      this.customFields[field.attribute_key] = field.data_type === 'number' ? 0 : '';
    });
  }

  addVariant(): void {
    if (!this.selectedTemplate || !this.selectedTemplate.variant_config) return;

    const newVariant: ProductVariant = {};

    // Add dimension fields
    if (this.selectedTemplate.variant_config.dimensions) {
      this.selectedTemplate.variant_config.dimensions.forEach(dim => {
        newVariant[dim.attribute_key] = '';
      });
    }

    // Add common fields
    if (this.selectedTemplate.variant_config.common_fields) {
      this.selectedTemplate.variant_config.common_fields.forEach(field => {
        if (field.type === 'number') {
          newVariant[field.attribute_key] = 0;
        } else {
          newVariant[field.attribute_key] = '';
        }
      });
    }

    this.variants.push(newVariant);
  }

  removeVariant(index: number): void {
    if (this.variants.length > 1) {
      this.variants.splice(index, 1);
    }
  }

  addDescriptionSection(): void {
    this.descriptionSections.push({
      heading: '',
      descriptions: ['']
    });
  }

  removeDescriptionSection(index: number): void {
    this.descriptionSections.splice(index, 1);
  }

  addDescription(sectionIndex: number): void {
    this.descriptionSections[sectionIndex].descriptions.push('');
  }

  removeDescription(sectionIndex: number, descIndex: number): void {
    if (this.descriptionSections[sectionIndex].descriptions.length > 1) {
      this.descriptionSections[sectionIndex].descriptions.splice(descIndex, 1);
    }
  }

  toggleTag(tagId: string): void {
    const index = this.selectedTagIds.indexOf(tagId);
    if (index > -1) {
      this.selectedTagIds.splice(index, 1);
    } else {
      this.selectedTagIds.push(tagId);
    }
  }

  isTagSelected(tagId: string): boolean {
    return this.selectedTagIds.includes(tagId);
  }

  validateForm(): string | null {
    if (!this.product.product_name.trim()) {
      return 'Product name is required';
    }

    if (!this.product.verification_app_id) {
      return 'Please select a verification app';
    }

    if (!this.product.template_id) {
      return 'Please select a product template';
    }

    if (this.variants.length === 0) {
      return 'At least one variant is required';
    }

    // Validate each variant
    for (let i = 0; i < this.variants.length; i++) {
      const variant = this.variants[i];

      // Check dimensions
      if (this.selectedTemplate && this.selectedTemplate.variant_config && this.selectedTemplate.variant_config.dimensions) {
        for (const dim of this.selectedTemplate.variant_config.dimensions) {
          if (dim.required && !variant[dim.attribute_key]) {
            return `Variant ${i + 1}: ${dim.attribute_name} is required`;
          }
        }

        // Check common fields
        if (this.selectedTemplate.variant_config.common_fields) {
          for (const field of this.selectedTemplate.variant_config.common_fields) {
            if (field.required && !variant[field.attribute_key]) {
              return `Variant ${i + 1}: ${field.attribute_name} is required`;
            }
          }
        }
      }
    }

    // Validate custom fields
    if (this.selectedTemplate && this.selectedTemplate.custom_fields) {
      for (const field of this.selectedTemplate.custom_fields) {
        if (field.is_required && !this.customFields[field.attribute_key]) {
          return `${field.attribute_name} is required`;
        }
      }
    }

    // Validate description sections
    for (let i = 0; i < this.descriptionSections.length; i++) {
      const section = this.descriptionSections[i];
      if (!section.heading.trim()) {
        return `Description section ${i + 1}: Heading is required`;
      }
      for (const desc of section.descriptions) {
        if (desc.length > 250) {
          return `Description section ${i + 1}: Each description must be 250 characters or less`;
        }
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

    const request: CreateProductRequest = {
      product_name: this.product.product_name,
      verification_app_id: this.product.verification_app_id,
      template_id: this.product.template_id,
      currency: this.product.currency,
      tag_ids: this.selectedTagIds.length > 0 ? this.selectedTagIds : undefined,
      is_active: this.product.is_active,
      attributes: {
        variants: this.variants,
        custom_fields: this.customFields,
        description_sections: this.descriptionSections
      }
    };

    if (this.isEditMode && this.productId) {
      // Update product
      this.productsService.updateProduct(this.productId, request as any).subscribe({
        next: () => {
          alert('Product updated successfully');
          this.router.navigate(['/tenant/products']);
        },
        error: (error) => {
          console.error('Error updating product:', error);
          this.error = error.error?.message || 'Failed to update product';
          this.loading = false;
        }
      });
    } else {
      // Create product
      this.productsService.createProduct(request).subscribe({
        next: () => {
          alert('Product created successfully');
          this.router.navigate(['/tenant/products']);
        },
        error: (error) => {
          console.error('Error creating product:', error);
          this.error = error.error?.message || 'Failed to create product';
          this.loading = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/tenant/products']);
  }

  getRemainingChars(text: string): number {
    return 250 - (text?.length || 0);
  }

  /**
   * Get dimension labels joined with 'and'
   */
  getDimensionLabels(): string {
    if (!this.selectedTemplate || !this.selectedTemplate.variant_config || !this.selectedTemplate.variant_config.dimensions) return '';
    return this.selectedTemplate.variant_config.dimensions
      .map(d => d.attribute_name)
      .join(' and ');
  }
}
