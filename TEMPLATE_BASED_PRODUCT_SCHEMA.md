# Template-Based Dynamic Product Schema

## Overview
Products in this system have **dynamic schemas** based on their associated templates. Each template defines different fields, variants, and custom attributes, making each product type unique.

## Architecture Principles

### 1. **Template = Schema Definition**
Each Product Template defines:
- **Variant Dimensions**: e.g., Size, Color, Volume
- **Common Variant Fields**: e.g., Price, SKU, Stock
- **Custom Fields**: Template-specific attributes (Brand, Material, Warranty, etc.)
- **Description Sections**: Structured content sections

### 2. **Flexible Product Model**
The Product interface uses TypeScript's index signature to support dynamic schemas:

```typescript
export interface Product {
  // Core fields (always present)
  id: string;
  product_name: string;
  verification_app_id: string;
  template_id: string;
  thumbnail_url: string;
  is_active: boolean;

  // Flexible attributes based on template
  attributes?: ProductAttributes;

  // Allow any additional fields from templates
  [key: string]: any;
}

export interface ProductAttributes {
  variants?: ProductVariant[];
  custom_fields?: { [key: string]: any };
  description_sections?: DescriptionSection[];

  // Template-specific fields
  [key: string]: any;
}
```

## Example: Different Templates = Different Schemas

### Template 1: Paint Product
```json
{
  "template_id": "paint-template",
  "template_name": "Paint Template",
  "variant_config": {
    "dimensions": [
      { "attribute_key": "size", "attribute_name": "Size", "type": "select", "options": ["1L", "4L", "10L", "20L"] },
      { "attribute_key": "finish", "attribute_name": "Finish", "type": "select", "options": ["Matte", "Glossy", "Satin"] }
    ],
    "common_fields": [
      { "attribute_key": "price", "attribute_name": "Price", "type": "number" },
      { "attribute_key": "sku", "attribute_name": "SKU", "type": "text" }
    ]
  },
  "custom_fields": [
    { "attribute_key": "brand", "attribute_name": "Brand", "data_type": "string" },
    { "attribute_key": "coverage", "attribute_name": "Coverage", "data_type": "string" },
    { "attribute_key": "drying_time", "attribute_name": "Drying Time", "data_type": "string" }
  ]
}
```

**Resulting Product Schema:**
```typescript
{
  id: "prod-123",
  product_name: "Asian Paints Royale",
  template_id: "paint-template",
  attributes: {
    variants: [
      { size: "1L", finish: "Matte", price: 500, sku: "AP-1L-M" },
      { size: "4L", finish: "Glossy", price: 1800, sku: "AP-4L-G" }
    ],
    custom_fields: {
      brand: "Asian Paints",
      coverage: "120 sq ft per liter",
      drying_time: "2-4 hours"
    }
  }
}
```

### Template 2: Electronics Product
```json
{
  "template_id": "electronics-template",
  "template_name": "Electronics Template",
  "variant_config": {
    "dimensions": [
      { "attribute_key": "color", "attribute_name": "Color", "type": "select", "options": ["Black", "White", "Silver"] },
      { "attribute_key": "storage", "attribute_name": "Storage", "type": "select", "options": ["64GB", "128GB", "256GB"] }
    ],
    "common_fields": [
      { "attribute_key": "price", "attribute_name": "Price", "type": "number" },
      { "attribute_key": "sku", "attribute_name": "SKU", "type": "text" }
    ]
  },
  "custom_fields": [
    { "attribute_key": "manufacturer", "attribute_name": "Manufacturer", "data_type": "string" },
    { "attribute_key": "warranty", "attribute_name": "Warranty Period", "data_type": "string" },
    { "attribute_key": "model_number", "attribute_name": "Model Number", "data_type": "string" }
  ]
}
```

**Resulting Product Schema:**
```typescript
{
  id: "prod-456",
  product_name: "iPhone 15 Pro",
  template_id: "electronics-template",
  attributes: {
    variants: [
      { color: "Black", storage: "128GB", price: 999, sku: "IPH15-BLK-128" },
      { color: "Silver", storage: "256GB", price: 1199, sku: "IPH15-SLV-256" }
    ],
    custom_fields: {
      manufacturer: "Apple Inc.",
      warranty: "1 year",
      model_number: "A2848"
    }
  }
}
```

## How It Works

### 1. **Template Selection**
When creating/editing a product:
1. Select Verification App → Template is auto-loaded from app configuration
2. Template defines available fields
3. Form dynamically renders based on template schema

### 2. **Dynamic Form Generation**
```typescript
// In template-product-form.component.ts
this.templatesFacade.selectedTemplate$.subscribe(template => {
  // Template defines what fields are available
  this.initializeCustomFields();  // Creates fields based on template.custom_fields
  this.addVariant();              // Creates variant fields based on template.variant_config
});
```

### 3. **Flexible Storage**
Products store template-defined data in the `attributes` object:
```typescript
{
  attributes: {
    variants: [...],           // Template variant configuration
    custom_fields: {...},      // Template custom fields
    description_sections: [...] // Structured descriptions
  }
}
```

### 4. **Type-Safe Access with Flexibility**
```typescript
// Core fields are type-safe
product.product_name  // ✅ TypeScript knows this exists
product.template_id   // ✅ Type-safe

// Template-specific fields are flexible
product.attributes?.custom_fields?.brand  // ✅ Null-safe access
product.attributes?.variants?.[0]?.size   // ✅ Dynamic field access
product[dynamicKey]                       // ✅ Allows any field from template
```

## Benefits

### ✅ **Flexibility**
- Different product types can have completely different schemas
- No need to modify database schema for new product types
- Easy to add new templates without code changes

### ✅ **Type Safety Where It Matters**
- Core product fields are strongly typed
- Template-specific fields are flexible but validated

### ✅ **Scalability**
- Add new product categories by creating new templates
- No code deployment needed for new product types

### ✅ **Backward Compatibility**
- Legacy fields (image_url, product_sku, description) still supported
- Index signature `[key: string]: any` allows any additional fields

## Component Implementation

### Product List Component
```typescript
// Handles products from any template
getProductPriceDisplay(product: Product): string {
  const variants = product.attributes?.product_variants;
  if (variants && Array.isArray(variants) && variants.length > 0) {
    const prices = variants.map(v => parseFloat(v.price) || 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    return `${product.currency || 'USD'} ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}`;
  }
  return product.price ? `${product.currency || 'USD'} ${product.price}` : '';
}
```

### Product Detail Component
```typescript
// Generic display for any template's custom fields
<div *ngFor="let field of product.attributes?.custom_fields | keyvalue" class="spec-item">
  <label>{{ formatKey(field.key) }}</label>
  <p>{{ getCustomFieldValue(field.value) }}</p>
</div>

// formatKey: Converts "drying_time" → "Drying Time"
formatKey(key: string): string {
  return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
```

### Product Form Component
```typescript
// Dynamic field initialization based on template
initializeCustomFields(): void {
  if (!this.selectedTemplate?.custom_fields) return;

  this.customFields = {};
  this.selectedTemplate.custom_fields.forEach(field => {
    this.customFields[field.attribute_key] = field.data_type === 'number' ? 0 : '';
  });
}

// Dynamic variant creation
addVariant(): void {
  const newVariant: ProductVariant = {};

  // Add dimension fields from template
  this.selectedTemplate?.variant_config?.dimensions?.forEach(dim => {
    newVariant[dim.attribute_key] = '';
  });

  // Add common fields from template
  this.selectedTemplate?.variant_config?.common_fields?.forEach(field => {
    newVariant[field.attribute_key] = field.type === 'number' ? 0 : '';
  });

  this.variants.push(newVariant);
}
```

## Validation

### Template-Based Validation
```typescript
validateForm(): string | null {
  // Validate against template schema
  if (this.selectedTemplate?.custom_fields) {
    for (const field of this.selectedTemplate.custom_fields) {
      if (field.is_required && !this.customFields[field.attribute_key]) {
        return `${field.attribute_name} is required`;
      }
    }
  }

  // Validate variants against template config
  for (let i = 0; i < this.variants.length; i++) {
    const variant = this.variants[i];

    if (this.selectedTemplate?.variant_config?.dimensions) {
      for (const dim of this.selectedTemplate.variant_config.dimensions) {
        if (dim.required && !variant[dim.attribute_key]) {
          return `Variant ${i + 1}: ${dim.attribute_name} is required`;
        }
      }
    }
  }

  return null;
}
```

## API Contract

### Creating a Product
```typescript
POST /api/products
{
  "product_name": "Asian Paints Royale",
  "verification_app_id": "app-123",
  "template_id": "paint-template",
  "attributes": {
    "variants": [
      { "size": "1L", "finish": "Matte", "price": 500, "sku": "AP-1L-M" }
    ],
    "custom_fields": {
      "brand": "Asian Paints",
      "coverage": "120 sq ft per liter"
    },
    "description_sections": [
      {
        "heading": "Features",
        "descriptions": ["Long-lasting finish", "Easy to apply"]
      }
    ]
  }
}
```

### Retrieving a Product
```typescript
GET /api/products/prod-123
Response:
{
  "id": "prod-123",
  "product_name": "Asian Paints Royale",
  "template_id": "paint-template",
  "template_name": "Paint Template",
  "attributes": {
    "variants": [...],
    "custom_fields": {...},
    "description_sections": [...]
  }
}
```

## Migration Strategy

### For Existing Products
Legacy products without templates continue to work:
```typescript
{
  id: "legacy-prod",
  product_name: "Old Product",
  image_url: "url",      // Legacy field
  product_sku: "SKU123", // Legacy field
  description: "text",   // Legacy field
  price: 100,            // Legacy field
  // No template_id - this is a legacy product
}
```

### For New Template-Based Products
```typescript
{
  id: "new-prod",
  product_name: "New Product",
  template_id: "paint-template",  // Has template
  thumbnail_url: "url",            // New standard field
  attributes: {                    // Template-defined structure
    variants: [...],
    custom_fields: {...}
  }
}
```

## Best Practices

1. **Always Check Template Schema**: Before accessing template-specific fields, verify the template defines them
2. **Use Optional Chaining**: `product.attributes?.custom_fields?.brand`
3. **Provide Fallbacks**: Handle missing fields gracefully
4. **Validate Against Template**: Use template schema for validation
5. **Generic Display Logic**: Write code that works with any template structure

## Summary

This template-based architecture provides:
- ✅ **Maximum Flexibility**: Each product type can have unique fields
- ✅ **Type Safety**: Core fields remain strongly typed
- ✅ **Scalability**: Add new product types without code changes
- ✅ **Backward Compatibility**: Legacy products still work
- ✅ **Developer Experience**: Clear patterns for working with dynamic schemas
