# NgRx Immutability Fix - "Object is not extensible" Error

## Problem

When editing a product, clicking "Add Variant" throws this error:
```
ERROR TypeError: Cannot add property 2, object is not extensible
    at Array.push (<anonymous>)
    at _TemplateProductFormComponent.addVariant
```

## Root Cause

**NgRx stores are immutable**. When you retrieve data from the store (like `product.attributes.variants`), the objects and arrays are **frozen** to prevent accidental mutations.

In Angular with NgRx:
- Store state uses **Immer** for immutability
- Retrieved objects/arrays are **sealed/frozen**
- You cannot directly modify them (push, pop, splice, etc.)

### What Was Happening (Bug)

```typescript
// ❌ WRONG - Direct assignment from store
populateFormWithProduct(product: any): void {
  // This gets a frozen array from NgRx store
  this.variants = product.attributes.variants;

  // Later, when user clicks "Add Variant"...
  addVariant(): void {
    this.variants.push(newVariant); // 💥 ERROR! Array is frozen
  }
}
```

## Solution

**Always create mutable copies** when working with NgRx store data in forms.

### Fixed Code

```typescript
// ✅ CORRECT - Create mutable copy
populateFormWithProduct(product: any): void {
  // Create mutable deep copy from immutable NgRx state
  if (product.attributes?.variants && product.attributes.variants.length > 0) {
    this.variants = product.attributes.variants.map((v: any) => ({ ...v }));
  } else {
    this.variants = [];
  }

  // Now we can safely modify
  addVariant(): void {
    this.variants.push(newVariant); // ✅ Works!
  }
}
```

## Why This Matters

### NgRx Philosophy
NgRx enforces **unidirectional data flow**:
```
Store (immutable) → Component (read-only)
     ↑                      ↓
   Action            User Interaction
     ↑                      ↓
  Reducer ← New State ← Component (dispatch)
```

- **Store data is read-only**: You can't modify it directly
- **Changes go through actions**: Must dispatch actions to modify store
- **Forms need mutable copies**: For local editing before dispatching

### The Pattern

```typescript
// 1. Read from store (immutable)
this.productsFacade.selectedProduct$.subscribe(product => {

  // 2. Create mutable copy for form
  this.formData = this.createMutableCopy(product);

  // 3. User edits form (mutates local copy)
  this.formData.variants.push(newVariant); // ✅ OK - local copy

  // 4. Submit: Dispatch action with new data
  this.productsFacade.updateProduct(id, this.formData);
});
```

## All Affected Fields

In `populateFormWithProduct`, we need mutable copies for:

### 1. **Product Images** (Array of Objects)
```typescript
// ❌ WRONG
this.productImages = product.product_images;

// ✅ CORRECT - Deep copy array of objects
this.productImages = [...product.product_images.map(img => ({ ...img }))];
```

### 2. **Variants** (Array of Objects)
```typescript
// ❌ WRONG
this.variants = product.attributes.variants;

// ✅ CORRECT - Deep copy array of objects
this.variants = product.attributes.variants.map(v => ({ ...v }));
```

### 3. **Custom Fields** (Object)
```typescript
// ❌ WRONG
this.customFields = product.attributes.custom_fields;

// ✅ CORRECT - Shallow copy object
this.customFields = { ...product.attributes.custom_fields };
```

### 4. **Description Sections** (Array of Objects with Nested Arrays)
```typescript
// ❌ WRONG
this.descriptionSections = product.attributes.description_sections;

// ✅ CORRECT - Deep copy with nested arrays
this.descriptionSections = product.attributes.description_sections.map(section => ({
  heading: section.heading,
  descriptions: [...section.descriptions]
}));
```

### 5. **Selected Tag IDs** (Array)
```typescript
// ❌ WRONG (though might work for primitives)
this.selectedTagIds = product.tags.map(tag => tag.id);

// ✅ BETTER - Explicit copy
this.selectedTagIds = [...product.tags.map(tag => tag.id)];
```

## Copy Techniques

### Shallow Copy (Primitives & 1 Level)
```typescript
// Object
const copy = { ...original };

// Array
const copy = [...original];
const copy = original.slice();
```

### Deep Copy (Nested Objects/Arrays)
```typescript
// Array of objects
const copy = original.map(item => ({ ...item }));

// Nested structures
const copy = JSON.parse(JSON.stringify(original)); // Simple but loses functions
```

### Angular-specific
```typescript
// Using lodash (if available)
import { cloneDeep } from 'lodash';
const copy = cloneDeep(original);

// Or create helper method
private deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
```

## When to Use Each

### Use Shallow Copy When:
- Object has only primitive values
- Array contains only primitives
- You won't modify nested objects

```typescript
// Primitives only
const user = { id: 1, name: 'John', age: 30 };
const copy = { ...user }; // ✅ Sufficient
```

### Use Deep Copy When:
- Object has nested objects/arrays
- Array contains objects
- You need to modify nested values

```typescript
// Nested structure
const variant = {
  size: '1L',
  price: 500,
  metadata: { sku: 'ABC', stock: 10 }
};
const copy = { ...variant }; // ❌ metadata still referenced
const deepCopy = {
  ...variant,
  metadata: { ...variant.metadata }
}; // ✅ Fully independent
```

## Testing for Immutability Issues

### How to Detect
Run this in browser console after loading edit form:
```javascript
// Get the component instance (in Angular DevTools)
// Check if variants is frozen
const variants = $0.variants; // $0 = selected element in DevTools
console.log(Object.isFrozen(variants)); // Should be false for forms
console.log(Object.isSealed(variants)); // Should be false for forms
```

### Expected Behavior
```javascript
// ❌ Store data (from NgRx)
Object.isFrozen(storeData.variants) // true - cannot modify
Object.isExtensible(storeData.variants) // false - cannot add properties

// ✅ Form data (mutable copy)
Object.isFrozen(this.variants) // false - can modify
Object.isExtensible(this.variants) // true - can add properties
```

## Best Practices

### 1. Always Create Copies in Edit Forms
```typescript
ngOnInit() {
  this.facade.selectedItem$.subscribe(item => {
    // ✅ Create mutable copy immediately
    this.formData = this.createMutableCopy(item);
  });
}

private createMutableCopy(item: any) {
  return {
    ...item,
    variants: item.variants?.map(v => ({ ...v })) ?? [],
    images: item.images?.map(img => ({ ...img })) ?? []
  };
}
```

### 2. Use Helper Methods
```typescript
// Reusable helper
private cloneArray<T>(arr: T[]): T[] {
  return arr.map(item =>
    typeof item === 'object' ? { ...item } : item
  );
}

private cloneObject<T>(obj: T): T {
  return { ...obj };
}
```

### 3. Document Why
```typescript
// ✅ Good - explains why
// Create mutable copy from immutable NgRx state
// NgRx freezes objects to prevent accidental mutations
this.variants = product.variants.map(v => ({ ...v }));
```

### 4. Validate in Tests
```typescript
it('should create mutable copy of variants', () => {
  const frozenVariants = Object.freeze([{ size: '1L' }]);
  const product = { attributes: { variants: frozenVariants } };

  component.populateFormWithProduct(product);

  // Should be able to modify
  expect(() => {
    component.variants.push({ size: '4L' });
  }).not.toThrow();

  // Should not affect original
  expect(frozenVariants.length).toBe(1);
  expect(component.variants.length).toBe(2);
});
```

## Related Errors

### Similar Immutability Errors

**"Cannot assign to read only property"**
```typescript
// ❌ Trying to modify frozen object
product.name = 'New Name'; // Error!

// ✅ Create copy first
const mutableProduct = { ...product };
mutableProduct.name = 'New Name'; // OK
```

**"Cannot delete property"**
```typescript
// ❌ Trying to delete from frozen object
delete product.oldField; // Error!

// ✅ Create copy without field
const { oldField, ...mutableProduct } = product; // OK
```

**"Cannot define property, object is not extensible"**
```typescript
// ❌ Trying to add property to frozen object
product.newField = 'value'; // Error!

// ✅ Create copy with new field
const mutableProduct = { ...product, newField: 'value' }; // OK
```

## Summary

### The Rule
**Never directly modify NgRx store data in forms**

### The Pattern
1. **Read**: Get immutable data from store
2. **Copy**: Create mutable copy for form
3. **Edit**: Modify the mutable copy
4. **Submit**: Dispatch action with modified data

### The Fix
```typescript
// ❌ BEFORE (Broken)
this.variants = product.attributes.variants;

// ✅ AFTER (Fixed)
this.variants = product.attributes.variants.map(v => ({ ...v }));
```

### Remember
- ✅ Store = Immutable (read-only)
- ✅ Form = Mutable (editable copy)
- ✅ Always copy before editing
- ✅ Use spread operator or map for copies
- ✅ Document why you're creating copies

This pattern applies to **all NgRx-powered forms** in the application!
