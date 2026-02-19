# Developer Guide: Working with Template-Based Products

## Quick Start

### Understanding the Architecture
Products in this system have **dynamic schemas** based on their templates:
- **Template = Schema Definition** - Each template defines what fields a product has
- **Different Templates = Different Fields** - Paint products ≠ Electronics products
- **Flexible Interface** - Product model adapts to any template structure

## Common Patterns

### 1. Accessing Core Fields (Always Safe)
```typescript
// These fields always exist and are strongly typed
product.id                    // ✅ Always present
product.product_name          // ✅ Always present
product.template_id           // ✅ Always present
product.verification_app_id   // ✅ Always present
product.is_active            // ✅ Always present
```

### 2. Accessing Template-Specific Fields (Use Optional Chaining)
```typescript
// Custom fields vary by template
product.attributes?.custom_fields?.brand           // ✅ May or may not exist
product.attributes?.custom_fields?.warranty        // ✅ Different templates
product.attributes?.custom_fields?.drying_time     // ✅ Template-specific

// Always check if the field exists
const brand = product.attributes?.custom_fields?.brand ?? 'Unknown Brand';
```

### 3. Working with Variants
```typescript
// Variants structure varies by template
const variants = product.attributes?.variants;

if (variants && variants.length > 0) {
  variants.forEach((variant, index) => {
    // Paint template: variant has { size, finish, price, sku }
    // Electronics template: variant has { color, storage, price, sku }

    // Access dynamic fields safely
    const price = variant.price ?? 0;
    const sku = variant.sku ?? '';

    // Template-specific dimension fields
    const size = variant.size;        // Only in Paint template
    const color = variant.color;      // Only in Electronics template
  });
}
```

### 4. Displaying Dynamic Fields
```typescript
// Generic display for any template's custom fields
displayCustomFields(product: Product): void {
  const customFields = product.attributes?.custom_fields;

  if (customFields) {
    Object.entries(customFields).forEach(([key, value]) => {
      const label = this.formatKey(key);  // "drying_time" → "Drying Time"
      const displayValue = this.formatValue(value);
      console.log(`${label}: ${displayValue}`);
    });
  }
}

formatKey(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

formatValue(value: any): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return value?.toString() ?? '';
}
```

### 5. Template-Aware Form Initialization
```typescript
ngOnInit(): void {
  // Subscribe to template
  this.templatesFacade.selectedTemplate$.subscribe(template => {
    if (template) {
      this.initializeFormFromTemplate(template);
    }
  });
}

initializeFormFromTemplate(template: ProductTemplate): void {
  // Initialize custom fields based on template
  this.customFields = {};
  template.custom_fields?.forEach(field => {
    this.customFields[field.attribute_key] =
      field.data_type === 'number' ? 0 : '';
  });

  // Initialize variants based on template
  this.variants = [];
  this.addVariant(); // Creates variant with template-defined fields
}

addVariant(): void {
  const variant: any = {};

  // Add dimension fields from template
  this.selectedTemplate?.variant_config?.dimensions?.forEach(dim => {
    variant[dim.attribute_key] = '';
  });

  // Add common fields from template
  this.selectedTemplate?.variant_config?.common_fields?.forEach(field => {
    variant[field.attribute_key] = field.type === 'number' ? 0 : '';
  });

  this.variants.push(variant);
}
```

### 6. Validation Against Template Schema
```typescript
validateProduct(product: any, template: ProductTemplate): string | null {
  // Validate custom fields
  if (template.custom_fields) {
    for (const field of template.custom_fields) {
      if (field.is_required && !product.attributes?.custom_fields?.[field.attribute_key]) {
        return `${field.attribute_name} is required`;
      }
    }
  }

  // Validate variants
  const variants = product.attributes?.variants ?? [];
  if (variants.length === 0) {
    return 'At least one variant is required';
  }

  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];

    // Check required dimensions
    if (template.variant_config?.dimensions) {
      for (const dim of template.variant_config.dimensions) {
        if (dim.required && !variant[dim.attribute_key]) {
          return `Variant ${i + 1}: ${dim.attribute_name} is required`;
        }
      }
    }
  }

  return null; // Valid
}
```

## NgRx Integration

### Using ProductsFacade
```typescript
import { ProductsFacade } from '@app/store/products/products.facade';

export class MyComponent {
  private productsFacade = inject(ProductsFacade);

  // Observables
  products$ = this.productsFacade.products$;
  selectedProduct$ = this.productsFacade.selectedProduct$;
  loading$ = this.productsFacade.loading$;
  error$ = this.productsFacade.error$;

  loadProducts(): void {
    // Load all products for an app
    this.productsFacade.loadProducts({
      app_id: 'app-123',
      search: 'paint'
    });
  }

  loadProduct(id: string): void {
    // Load single product
    this.productsFacade.loadProduct(id);
  }

  createProduct(request: CreateProductRequest): void {
    this.productsFacade.createProduct(request);
  }

  updateProduct(id: string, request: UpdateProductRequest): void {
    this.productsFacade.updateProduct(id, request);
  }

  deleteProduct(id: string): void {
    this.productsFacade.deleteProduct(id);
  }
}
```

### Subscribing to Product Changes
```typescript
ngOnInit(): void {
  // Load product in edit mode
  this.route.params.subscribe(params => {
    if (params['id']) {
      this.productsFacade.loadProduct(params['id']);
    }
  });

  // Wait for both product AND template
  this.productsFacade.selectedProduct$
    .pipe(
      combineLatestWith(this.templatesFacade.selectedTemplate$),
      filter(([product, template]) => product !== null && template !== null)
    )
    .subscribe(([product, template]) => {
      this.populateForm(product, template);
    });
}
```

## Template Examples

### Paint Template Structure
```typescript
{
  template_id: "paint-template",
  template_name: "Paint Template",
  variant_config: {
    dimensions: [
      { attribute_key: "size", attribute_name: "Size", type: "select", options: ["1L", "4L", "10L"] },
      { attribute_key: "finish", attribute_name: "Finish", type: "select", options: ["Matte", "Glossy"] }
    ],
    common_fields: [
      { attribute_key: "price", attribute_name: "Price", type: "number" },
      { attribute_key: "sku", attribute_name: "SKU", type: "text" }
    ]
  },
  custom_fields: [
    { attribute_key: "brand", attribute_name: "Brand", data_type: "string" },
    { attribute_key: "coverage", attribute_name: "Coverage", data_type: "string" },
    { attribute_key: "drying_time", attribute_name: "Drying Time", data_type: "string" }
  ]
}
```

### Product Created from Paint Template
```typescript
{
  id: "prod-123",
  product_name: "Asian Paints Royale Premium Emulsion",
  template_id: "paint-template",
  template_name: "Paint Template",
  verification_app_id: "app-123",
  is_active: true,
  thumbnail_url: "https://...",
  attributes: {
    variants: [
      { size: "1L", finish: "Matte", price: 500, sku: "AP-1L-M" },
      { size: "4L", finish: "Glossy", price: 1800, sku: "AP-4L-G" }
    ],
    custom_fields: {
      brand: "Asian Paints",
      coverage: "120 sq ft per liter",
      drying_time: "2-4 hours"
    },
    description_sections: [
      {
        heading: "Key Features",
        descriptions: [
          "Long-lasting finish",
          "Easy to apply",
          "Low odor"
        ]
      }
    ]
  }
}
```

## HTML Template Patterns

### List View
```html
<div *ngFor="let product of products$ | async" class="product-card">
  <!-- Core fields - always safe -->
  <h3>{{ product.product_name }}</h3>

  <!-- Template-specific fields - use safe navigation -->
  <p *ngIf="product.attributes?.custom_fields?.brand">
    Brand: {{ product.attributes.custom_fields.brand }}
  </p>

  <!-- Display variant count -->
  <span *ngIf="(product.attributes?.variants?.length ?? 0) > 0">
    {{ product.attributes.variants.length }} variants
  </span>

  <!-- Legacy field fallback -->
  <img [src]="product.thumbnail_url || product.image_url" />
</div>
```

### Detail View (Generic for Any Template)
```html
<!-- Custom Fields - Works for any template -->
<div class="custom-fields" *ngIf="product.attributes?.custom_fields">
  <div *ngFor="let field of product.attributes.custom_fields | keyvalue" class="field">
    <label>{{ formatKey(field.key) }}:</label>
    <span>{{ formatValue(field.value) }}</span>
  </div>
</div>

<!-- Variants - Generic display -->
<div class="variants" *ngIf="(product.attributes?.variants?.length ?? 0) > 0">
  <h3>Variants</h3>
  <div *ngFor="let variant of product.attributes.variants; let i = index" class="variant">
    <h4>Variant {{ i + 1 }}</h4>
    <div *ngFor="let prop of variant | keyvalue" class="prop">
      <span class="label">{{ formatKey(prop.key) }}:</span>
      <span class="value">{{ prop.value }}</span>
    </div>
  </div>
</div>
```

### Form (Template-Driven)
```html
<!-- Custom Fields - Dynamic based on template -->
<div *ngFor="let field of selectedTemplate?.custom_fields" class="form-group">
  <label [class.required]="field.is_required">
    {{ field.attribute_name }}
  </label>

  <!-- String field -->
  <input
    *ngIf="field.data_type === 'string'"
    type="text"
    [(ngModel)]="customFields[field.attribute_key]"
    [name]="field.attribute_key"
    [required]="field.is_required"
  />

  <!-- Number field -->
  <input
    *ngIf="field.data_type === 'number'"
    type="number"
    [(ngModel)]="customFields[field.attribute_key]"
    [name]="field.attribute_key"
    [required]="field.is_required"
  />

  <!-- Select field -->
  <select
    *ngIf="field.data_type === 'select'"
    [(ngModel)]="customFields[field.attribute_key]"
    [name]="field.attribute_key"
    [required]="field.is_required"
  >
    <option value="">Select {{ field.attribute_name }}</option>
    <option *ngFor="let option of field.options" [value]="option">
      {{ option }}
    </option>
  </select>
</div>
```

## Common Mistakes to Avoid

### ❌ DON'T: Assume field existence
```typescript
// This will crash if custom_fields or brand doesn't exist
const brand = product.attributes.custom_fields.brand;
```

### ✅ DO: Use optional chaining
```typescript
const brand = product.attributes?.custom_fields?.brand ?? 'Unknown';
```

### ❌ DON'T: Hard-code template field names
```typescript
// This only works for Paint template
if (product.attributes.custom_fields.drying_time) { ... }
```

### ✅ DO: Write generic code
```typescript
// Works for any template
Object.entries(product.attributes?.custom_fields ?? {}).forEach(([key, value]) => {
  console.log(`${key}: ${value}`);
});
```

### ❌ DON'T: Check length without null safety
```html
<div *ngIf="product.attributes.variants.length > 0">
```

### ✅ DO: Use safe navigation and nullish coalescing
```html
<div *ngIf="(product.attributes?.variants?.length ?? 0) > 0">
```

## Testing Different Templates

```typescript
describe('ProductComponent', () => {
  it('should display Paint template fields', () => {
    const paintProduct = {
      id: '1',
      product_name: 'Paint',
      template_id: 'paint-template',
      attributes: {
        custom_fields: {
          brand: 'Asian Paints',
          coverage: '120 sq ft',
          drying_time: '2-4 hours'
        }
      }
    };

    component.product = paintProduct;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Asian Paints');
    expect(fixture.nativeElement.textContent).toContain('120 sq ft');
  });

  it('should display Electronics template fields', () => {
    const electronicsProduct = {
      id: '2',
      product_name: 'iPhone',
      template_id: 'electronics-template',
      attributes: {
        custom_fields: {
          manufacturer: 'Apple',
          warranty: '1 year',
          model_number: 'A2848'
        }
      }
    };

    component.product = electronicsProduct;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Apple');
    expect(fixture.nativeElement.textContent).toContain('1 year');
  });
});
```

## Summary

### Key Principles
1. **Always use optional chaining** for template-specific fields
2. **Write generic code** that works with any template
3. **Validate against template schema** before saving
4. **Use NgRx ProductsFacade** for state management
5. **Handle legacy products** gracefully

### Quick Reference
```typescript
// Safe access patterns
product.product_name                                    // ✅ Always safe
product.attributes?.custom_fields?.brand               // ✅ Template field
product.attributes?.variants?.[0]?.price               // ✅ Nested access
(product.attributes?.variants?.length ?? 0) > 0        // ✅ Length check
product.thumbnail_url || product.image_url             // ✅ Fallback

// NgRx patterns
this.productsFacade.loadProducts({ app_id: 'app-123' })  // ✅ Load
this.productsFacade.products$.subscribe(...)              // ✅ Subscribe
this.productsFacade.createProduct(request)                // ✅ Create
this.productsFacade.updateProduct(id, request)            // ✅ Update
```
