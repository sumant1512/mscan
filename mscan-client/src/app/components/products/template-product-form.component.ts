import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter, combineLatestWith } from 'rxjs/operators';
import { ProductsFacade } from '../../store/products/products.facade';
import { TemplatesFacade } from '../../store/templates/templates.facade';
import { AppContextService } from '../../services/app-context.service';
import { VerificationApp } from '../../store/verification-apps/verification-apps.models';
import {
  ProductTemplate,
  Tag,
  ProductVariant,
  DescriptionSection,
  ProductImage,
} from '../../models/templates.model';
import { CreateProductRequest } from '../../store/products/products.models';
import { RemainingCharsPipe } from '../../pipes/remaining-chars.pipe';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';
import { TagsFacade } from '../../store/tags';
import { VerificationAppsFacade } from '../../store/verification-apps';

@Component({
  selector: 'app-template-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RemainingCharsPipe],
  templateUrl: './template-product-form.component.html',
  styleUrls: ['./template-product-form.component.css'],
})
export class TemplateProductFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private productsFacade = inject(ProductsFacade);
  private templatesFacade = inject(TemplatesFacade);

  loading$ = this.productsFacade.loading$;
  error: string | null = null;
  successMessage = '';
  isEditMode = false;
  productId: string | null = null;

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
    thumbnail_url: '',
    is_active: true,
  };

  // Variants (dynamic based on template)
  variants: ProductVariant[] = [];

  // Custom Fields (dynamic based on template)
  customFields: { [key: string]: any } = {};

  // Description Sections
  descriptionSections: DescriptionSection[] = [];

  // Product Images
  productImages: ProductImage[] = [];

  constructor(
    private tagsFacade: TagsFacade,
    private appContextService: AppContextService,
    private verificationAppsFacade: VerificationAppsFacade,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Check if edit mode first
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['id']) {
        this.isEditMode = true;
        this.productId = params['id'];
        // Load product via NgRx
        this.productsFacade.loadProduct(params['id']);
      }
    });

    // Subscribe to selected product and template together for edit mode
    if (this.isEditMode) {
      this.productsFacade.selectedProduct$
        .pipe(
          takeUntil(this.destroy$),
          filter((product) => product !== null),
          combineLatestWith(
            this.templatesFacade.selectedTemplate$,
            this.tagsFacade.tagsForSelectedApp$,
          ),
        )
        .subscribe(([product, template, tags]) => {
          this.availableTags = tags;
          console.log(this.availableTags);
          if (product && template) {
            this.populateFormWithProduct(product);
          } else if (product && !template && product.template_id) {
            // Template not loaded yet, load it
            this.templatesFacade.loadTemplate(product.template_id);
          }
        });
    }

    // Subscribe to selected template from store (for create mode and after template loads in edit mode)
    this.templatesFacade.selectedTemplate$
      .pipe(
        takeUntil(this.destroy$),
        filter((tmpl) => tmpl !== null),
      )
      .subscribe((tmpl) => {
        if (tmpl) {
          this.selectedTemplate = tmpl;

          // Only initialize empty form if NOT in edit mode
          if (!this.isEditMode) {
            // Initialize with one empty variant
            this.variants = [];
            this.addVariant();

            // Initialize custom fields
            this.initializeCustomFields();

            // Initialize description sections
            this.descriptionSections = [{ heading: '', descriptions: [''] }];
          }

          // Force change detection
          this.cdr.detectChanges();
        }
      });

    // Load available apps and auto-set selected app from header
    this.appContextService.appContext$.pipe(takeUntil(this.destroy$)).subscribe((context) => {
      this.availableApps = context.availableApps;
      const newSelectedAppId = context.selectedAppId;
      this.selectedAppId = newSelectedAppId;

      // Only update if not in edit mode
      if (!this.isEditMode && this.availableApps.length > 0) {
        const appToSelect = newSelectedAppId || this.availableApps[0].verification_app_id;

        // Check if the app has actually changed
        const appChanged = this.previousAppId !== appToSelect;

        if (appChanged || !this.previousAppId) {
          // Update the selected app (automatically from header)
          this.product.verification_app_id = appToSelect;
          this.previousAppId = appToSelect;

          // Load template and tags for the new app
          this.loadTemplateFromApp(appToSelect);
        }
      }
    });

    this.getSelectedApp();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.productsFacade.clearSelectedProduct();
    this.productsFacade.clearError();
  }

  private getSelectedApp(): void {
    this.verificationAppsFacade.selectedAppId$.pipe(takeUntil(this.destroy$)).subscribe((appId) => {
      if (appId) {
        this.loadTags(appId);
      }
    });
  }

  // Auto-load template from selected app's template_id
  loadTemplateFromApp(appId: string): void {
    const selectedApp = this.availableApps.find((app) => app.verification_app_id === appId);

    if (selectedApp && selectedApp.template_id) {
      // App has a template - auto-load it
      this.product.template_id = selectedApp.template_id;
      this.loadTemplateDetails(selectedApp.template_id);
    } else {
      // No template assigned to this app
      this.selectedTemplate = null;
      this.variants = [];
      this.customFields = {};
      this.descriptionSections = [];
    }
  }

  // Load template details and initialize form fields
  loadTemplateDetails(templateId: string): void {
    this.error = null;
    this.templatesFacade.loadTemplate(templateId);
  }

  loadTags(appId: string): void {
    this.tagsFacade.loadTags(appId);
  }

  populateFormWithProduct(product: any): void {
    // Populate basic fields
    this.product = {
      product_name: product.product_name,
      verification_app_id: product.verification_app_id,
      template_id: product.template_id,
      thumbnail_url: product.thumbnail_url || '',
      is_active: product.is_active !== false,
    };

    // Load product images - Create mutable copy from immutable NgRx state
    if (product.product_images && Array.isArray(product.product_images)) {
      this.productImages = [...product.product_images.map((img: ProductImage) => ({ ...img }))];
    } else {
      this.productImages = [];
    }

    // Set selected tags - Create new array
    if (product.tags) {
      this.selectedTagIds = [...product.tags.map((tag: Tag) => tag.id)];
    }

    // Populate variants - CRITICAL: Create mutable deep copy from immutable NgRx state
    // NgRx state is frozen/sealed, so we must clone to allow modifications
    if (product.attributes?.variants && product.attributes.variants.length > 0) {
      this.variants = product.attributes.variants.map((v: any) => ({ ...v }));
    } else if (this.selectedTemplate) {
      this.variants = [];
      this.addVariant();
    }

    // Populate custom fields - Create mutable copy
    if (product.attributes?.custom_fields) {
      this.customFields = { ...product.attributes.custom_fields };
    } else {
      this.initializeCustomFields();
    }

    // Populate description sections - Create mutable deep copy
    if (
      product.attributes?.description_sections &&
      product.attributes.description_sections.length > 0
    ) {
      this.descriptionSections = product.attributes.description_sections.map(
        (section: DescriptionSection) => ({
          heading: section.heading,
          descriptions: [...section.descriptions],
        }),
      );
    } else {
      this.descriptionSections = [{ heading: '', descriptions: [''] }];
    }

    // Force change detection
    this.cdr.detectChanges();
  }

  // onTemplateChange removed - template is now auto-loaded from app
  // This method is no longer needed as templates are automatically selected based on the app

  initializeCustomFields(): void {
    if (!this.selectedTemplate || !this.selectedTemplate.custom_fields) return;

    this.customFields = {};
    this.selectedTemplate.custom_fields.forEach((field) => {
      this.customFields[field.attribute_key] = field.data_type === 'number' ? 0 : '';
    });
  }

  addVariant(): void {
    if (!this.selectedTemplate || !this.selectedTemplate.variant_config) return;

    const newVariant: ProductVariant = {};

    // Add dimension fields
    if (this.selectedTemplate.variant_config.dimensions) {
      this.selectedTemplate.variant_config.dimensions.forEach((dim) => {
        newVariant[dim.attribute_key] = '';
      });
    }

    // Add common fields
    if (this.selectedTemplate.variant_config.common_fields) {
      this.selectedTemplate.variant_config.common_fields.forEach((field) => {
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
      descriptions: [''],
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
    console.log('Selected Tag IDs:', this.selectedTagIds);
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
      if (
        this.selectedTemplate &&
        this.selectedTemplate.variant_config &&
        this.selectedTemplate.variant_config.dimensions
      ) {
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

    this.error = null;
    this.successMessage = '';

    const request: CreateProductRequest = {
      product_name: this.product.product_name,
      verification_app_id: this.product.verification_app_id,
      template_id: this.product.template_id,
      thumbnail_url: this.product.thumbnail_url || '',
      product_images: this.productImages,
      tag_ids: this.selectedTagIds,
      is_active: this.product.is_active,
      attributes: {
        variants: this.variants,
        custom_fields: this.customFields,
        description_sections: this.descriptionSections,
      },
    };

    if (this.isEditMode && this.productId) {
      this.productsFacade.updateProduct(this.productId, { ...request, id: this.productId });
    } else {
      this.productsFacade.createProduct(request);
    }

    // Subscribe to success/error via the store
    this.productsFacade.error$.pipe(takeUntil(this.destroy$)).subscribe((error) => {
      if (error) {
        this.error = error;
      }
    });

    // Navigate on success (watch for loading to become false and no error)
    this.productsFacade.loading$
      .pipe(
        takeUntil(this.destroy$),
        filter((loading) => !loading),
      )
      .subscribe(() => {
        if (!this.error) {
          this.successMessage = this.isEditMode
            ? 'Product updated successfully'
            : 'Product created successfully';
          setTimeout(() => {
            this.router.navigate(['/tenant/products']);
          }, 1500);
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/tenant/products']);
  }

  /**
   * Get dimension labels joined with 'and'
   */
  getDimensionLabels(): string {
    if (
      !this.selectedTemplate ||
      !this.selectedTemplate.variant_config ||
      !this.selectedTemplate.variant_config.dimensions
    )
      return '';
    return this.selectedTemplate.variant_config.dimensions
      .map((d) => d.attribute_name)
      .join(' and ');
  }

  // Product Images Management
  addProductImage(): void {
    this.productImages.push({
      url: '',
      is_first: this.productImages.length === 0,
      order: this.productImages.length,
    });
  }

  removeProductImage(index: number): void {
    const wasFirst = this.productImages[index].is_first;
    this.productImages.splice(index, 1);

    // Reorder remaining images
    this.productImages.forEach((img, idx) => {
      img.order = idx;
    });

    // If removed image was first, mark next one as first
    if (wasFirst && this.productImages.length > 0) {
      this.productImages[0].is_first = true;
    }
  }

  setFirstImage(index: number): void {
    // Unmark all as first
    this.productImages.forEach((img) => (img.is_first = false));
    // Mark selected as first
    this.productImages[index].is_first = true;
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByAttributeKey(index: number, item: any): string {
    return item.attribute_key || index;
  }

  trackById(index: number, item: any): string {
    return item.id || index;
  }

  getSelectedAppName(): string {
    if (this.isEditMode) {
      // In edit mode, find the app by the product's verification_app_id
      const app = this.availableApps.find(
        (a) => a.verification_app_id === this.product.verification_app_id,
      );
      return app?.app_name || '';
    }
    // In create mode, use the selected app from header
    const app = this.availableApps.find((a) => a.verification_app_id === this.selectedAppId);
    return app?.app_name || '';
  }
}
