# Template Attributes - Complete Usage Guide

## 📋 What Are Template Attributes?

Template attributes define the **custom fields** that every product using this template will have. Think of them as a **product information blueprint** that ensures consistency across all products of the same type.

---

## 🎯 Purpose & Benefits

### **Why Use Attributes?**

1. **Consistency** - All products in a category have the same fields
2. **Data Quality** - Validation rules ensure accurate data entry
3. **Better Search** - Structured data enables powerful filtering
4. **User Experience** - Dynamic forms based on product type
5. **Flexibility** - Different product types have different requirements

---

## 🏗️ Attributes vs Variants

### **Attributes (Custom Fields)**
- **What**: Properties that describe the product
- **When**: Information that doesn't create different SKUs
- **Examples**: Brand, Material, Warranty Period, Manufacturing Date

### **Variants (Dimensions)**
- **What**: Properties that create different versions of the same product
- **When**: Each combination creates a unique SKU with its own price/stock
- **Examples**: Size, Color, Pack Size

---

## 📊 Available Data Types

| Data Type | Use Case | Example |
|-----------|----------|---------|
| **String** | Text information | Brand name, Model number |
| **Number** | Numeric values | Weight, Dimension, Count |
| **Boolean** | Yes/No flags | Waterproof, Organic, Eco-friendly |
| **Date** | Dates | Manufacturing date, Expiry date |
| **Select** | Single choice from list | Country of origin, Grade |
| **Multi-Select** | Multiple choices | Features, Certifications |
| **URL** | Web links | Product manual URL, Video link |
| **Email** | Email addresses | Support email, Manufacturer email |

---

## 🎨 Real-World Use Cases

### **Use Case 1: Clothing Template**

```
Template Name: "Clothing Products"
Industry: Clothing

ATTRIBUTES:
┌─────────────────────────────────────────────────────────┐
│ 1. Brand Name                                           │
│    - Data Type: String                                  │
│    - Required: Yes                                      │
│    - Validation: Min 2 chars, Max 50 chars             │
│    - Example: "Nike", "Adidas", "Zara"                 │
├─────────────────────────────────────────────────────────┤
│ 2. Material                                             │
│    - Data Type: Select                                  │
│    - Required: Yes                                      │
│    - Options: ["Cotton", "Polyester", "Cotton Blend",   │
│                "Silk", "Wool", "Denim"]                 │
├─────────────────────────────────────────────────────────┤
│ 3. Care Instructions                                    │
│    - Data Type: Multi-Select                            │
│    - Required: No                                       │
│    - Options: ["Machine Wash", "Hand Wash",             │
│                "Dry Clean Only", "Tumble Dry",          │
│                "Iron Medium Heat"]                      │
├─────────────────────────────────────────────────────────┤
│ 4. GSM (Fabric Weight)                                  │
│    - Data Type: Number                                  │
│    - Required: No                                       │
│    - Validation: Min 80, Max 400                        │
│    - Help Text: "Grams per square meter"               │
├─────────────────────────────────────────────────────────┤
│ 5. Eco Friendly                                         │
│    - Data Type: Boolean                                 │
│    - Default: false                                     │
├─────────────────────────────────────────────────────────┤
│ 6. Country of Origin                                    │
│    - Data Type: Select                                  │
│    - Required: Yes                                      │
│    - Options: ["India", "China", "Bangladesh",          │
│                "Vietnam", "Turkey"]                     │
└─────────────────────────────────────────────────────────┘

VARIANTS (Dimensions):
- Size: ["XS", "S", "M", "L", "XL", "XXL"]
- Color: ["Black", "White", "Red", "Blue", "Green"]

RESULT: Each combination creates unique product variant
Example: "Black T-Shirt - Size M" has its own price & stock
```

---

### **Use Case 2: Electronics Template**

```
Template Name: "Electronics & Gadgets"
Industry: Electronics

ATTRIBUTES:
┌─────────────────────────────────────────────────────────┐
│ 1. Brand                                                │
│    - Data Type: String                                  │
│    - Required: Yes                                      │
├─────────────────────────────────────────────────────────┤
│ 2. Model Number                                         │
│    - Data Type: String                                  │
│    - Required: Yes                                      │
│    - Pattern: Alphanumeric                              │
│    - Example: "MX-2024-PRO"                             │
├─────────────────────────────────────────────────────────┤
│ 3. Warranty Period (Months)                             │
│    - Data Type: Number                                  │
│    - Required: Yes                                      │
│    - Validation: Min 0, Max 60                          │
│    - Default: 12                                        │
├─────────────────────────────────────────────────────────┤
│ 4. Power Consumption (Watts)                            │
│    - Data Type: Number                                  │
│    - Required: No                                       │
│    - Validation: Min 0, Max 5000                        │
├─────────────────────────────────────────────────────────┤
│ 5. Energy Rating                                        │
│    - Data Type: Select                                  │
│    - Options: ["1 Star", "2 Star", "3 Star",            │
│                "4 Star", "5 Star"]                      │
├─────────────────────────────────────────────────────────┤
│ 6. Key Features                                         │
│    - Data Type: Multi-Select                            │
│    - Options: ["WiFi", "Bluetooth", "USB-C",            │
│                "Fast Charging", "Water Resistant",      │
│                "Touch Screen"]                          │
├─────────────────────────────────────────────────────────┤
│ 7. User Manual URL                                      │
│    - Data Type: URL                                     │
│    - Required: No                                       │
│    - Placeholder: "https://example.com/manual.pdf"      │
├─────────────────────────────────────────────────────────┤
│ 8. Support Email                                        │
│    - Data Type: Email                                   │
│    - Required: No                                       │
│    - Example: "support@brand.com"                       │
└─────────────────────────────────────────────────────────┘

VARIANTS:
- Color: ["Black", "Silver", "White"]
- Storage: ["64GB", "128GB", "256GB", "512GB"]
```

---

### **Use Case 3: Food & Beverages Template**

```
Template Name: "Packaged Food Products"
Industry: Food

ATTRIBUTES:
┌─────────────────────────────────────────────────────────┐
│ 1. Brand Name                                           │
│    - Data Type: String                                  │
│    - Required: Yes                                      │
├─────────────────────────────────────────────────────────┤
│ 2. Ingredients                                          │
│    - Data Type: String                                  │
│    - Required: Yes                                      │
│    - Max Length: 500                                    │
│    - Placeholder: "Comma separated ingredients"         │
├─────────────────────────────────────────────────────────┤
│ 3. Manufacturing Date                                   │
│    - Data Type: Date                                    │
│    - Required: Yes                                      │
├─────────────────────────────────────────────────────────┤
│ 4. Best Before Date                                     │
│    - Data Type: Date                                    │
│    - Required: Yes                                      │
├─────────────────────────────────────────────────────────┤
│ 5. Shelf Life (Days)                                    │
│    - Data Type: Number                                  │
│    - Validation: Min 1, Max 3650                        │
│    - Example: 365                                       │
├─────────────────────────────────────────────────────────┤
│ 6. Nutritional Info URL                                 │
│    - Data Type: URL                                     │
│    - Required: No                                       │
├─────────────────────────────────────────────────────────┤
│ 7. Certifications                                       │
│    - Data Type: Multi-Select                            │
│    - Options: ["FSSAI", "ISO 22000", "Organic",         │
│                "Halal", "Kosher", "Vegan"]              │
├─────────────────────────────────────────────────────────┤
│ 8. Contains Allergens                                   │
│    - Data Type: Multi-Select                            │
│    - Options: ["Milk", "Eggs", "Peanuts", "Tree Nuts",  │
│                "Soy", "Wheat", "Fish", "Shellfish"]     │
├─────────────────────────────────────────────────────────┤
│ 9. Vegetarian                                           │
│    - Data Type: Boolean                                 │
│    - Default: false                                     │
├─────────────────────────────────────────────────────────┤
│ 10. Storage Instructions                                │
│     - Data Type: Select                                 │
│     - Options: ["Store in cool dry place",              │
│                 "Refrigerate after opening",            │
│                 "Keep frozen", "Room temperature"]      │
└─────────────────────────────────────────────────────────┘

VARIANTS:
- Pack Size: ["100g", "250g", "500g", "1kg"]
- Flavor: ["Original", "Spicy", "Sweet", "Tangy"]
```

---

### **Use Case 4: Paint Products Template**

```
Template Name: "Wall Paint"
Industry: Paint

ATTRIBUTES:
┌─────────────────────────────────────────────────────────┐
│ 1. Brand                                                │
│    - Data Type: String                                  │
│    - Required: Yes                                      │
├─────────────────────────────────────────────────────────┤
│ 2. Finish Type                                          │
│    - Data Type: Select                                  │
│    - Required: Yes                                      │
│    - Options: ["Matte", "Eggshell", "Satin",            │
│                "Semi-Gloss", "High-Gloss"]              │
├─────────────────────────────────────────────────────────┤
│ 3. Coverage (sq ft per liter)                           │
│    - Data Type: Number                                  │
│    - Required: Yes                                      │
│    - Validation: Min 50, Max 200                        │
│    - Default: 120                                       │
├─────────────────────────────────────────────────────────┤
│ 4. Drying Time (Hours)                                  │
│    - Data Type: Number                                  │
│    - Required: Yes                                      │
│    - Validation: Min 1, Max 48                          │
├─────────────────────────────────────────────────────────┤
│ 5. VOC Content                                          │
│    - Data Type: Select                                  │
│    - Options: ["Zero VOC", "Low VOC", "Medium VOC"]     │
├─────────────────────────────────────────────────────────┤
│ 6. Application Method                                   │
│    - Data Type: Multi-Select                            │
│    - Options: ["Brush", "Roller", "Spray Gun"]          │
├─────────────────────────────────────────────────────────┤
│ 7. Washable                                             │
│    - Data Type: Boolean                                 │
│    - Default: true                                      │
├─────────────────────────────────────────────────────────┤
│ 8. Suitable For                                         │
│    - Data Type: Multi-Select                            │
│    - Options: ["Interior Walls", "Exterior Walls",      │
│                "Wood", "Metal", "Concrete"]             │
├─────────────────────────────────────────────────────────┤
│ 9. Technical Datasheet URL                              │
│    - Data Type: URL                                     │
│    - Required: No                                       │
└─────────────────────────────────────────────────────────┘

VARIANTS:
- Color: ["White", "Beige", "Grey", "Blue", ...]
- Pack Size: ["1L", "4L", "10L", "20L"]
```

---

### **Use Case 5: Cosmetics Template**

```
Template Name: "Beauty & Cosmetics"
Industry: Cosmetics

ATTRIBUTES:
┌─────────────────────────────────────────────────────────┐
│ 1. Brand Name                                           │
│    - Data Type: String                                  │
│    - Required: Yes                                      │
├─────────────────────────────────────────────────────────┤
│ 2. Skin Type                                            │
│    - Data Type: Multi-Select                            │
│    - Options: ["Normal", "Dry", "Oily",                 │
│                "Combination", "Sensitive"]              │
├─────────────────────────────────────────────────────────┤
│ 3. Key Ingredients                                      │
│    - Data Type: String                                  │
│    - Required: Yes                                      │
│    - Max Length: 300                                    │
├─────────────────────────────────────────────────────────┤
│ 4. Manufacturing Date                                   │
│    - Data Type: Date                                    │
│    - Required: Yes                                      │
├─────────────────────────────────────────────────────────┤
│ 5. Expiry Date                                          │
│    - Data Type: Date                                    │
│    - Required: Yes                                      │
├─────────────────────────────────────────────────────────┤
│ 6. Dermatologically Tested                              │
│    - Data Type: Boolean                                 │
│    - Default: false                                     │
├─────────────────────────────────────────────────────────┤
│ 7. Paraben Free                                         │
│    - Data Type: Boolean                                 │
│    - Default: false                                     │
├─────────────────────────────────────────────────────────┤
│ 8. Cruelty Free                                         │
│    - Data Type: Boolean                                 │
│    - Default: false                                     │
├─────────────────────────────────────────────────────────┤
│ 9. SPF Value                                            │
│    - Data Type: Number                                  │
│    - Required: No                                       │
│    - Validation: Min 0, Max 100                         │
├─────────────────────────────────────────────────────────┤
│ 10. Usage Instructions                                  │
│     - Data Type: String                                 │
│     - Max Length: 500                                   │
└─────────────────────────────────────────────────────────┘

VARIANTS:
- Shade/Color: ["Fair", "Medium", "Tan", "Deep"]
- Volume: ["30ml", "50ml", "100ml"]
```

---

## 🔧 Field Configuration Options

### **1. Attribute Name**
- **What**: Display name shown to users
- **Example**: "Brand Name", "Material", "Warranty Period"
- **Tip**: Use clear, user-friendly names

### **2. Attribute Key**
- **What**: Database/API identifier (lowercase, no spaces)
- **Example**: `brand_name`, `material`, `warranty_period`
- **Rule**: Only lowercase letters, numbers, underscores
- **Tip**: Auto-generated from name, but can be customized

### **3. Data Type**
- **What**: Type of data this field accepts
- **Options**: See "Available Data Types" section above
- **Tip**: Choose the most specific type (e.g., Number for numeric values, not String)

### **4. Field Group** (Optional)
- **What**: Organize related fields together
- **Example**: "Basic Info", "Specifications", "Compliance"
- **Benefit**: Groups fields in the product form UI

### **5. Default Value** (Optional)
- **What**: Pre-filled value for new products
- **Example**: "12" for warranty period, "India" for country
- **Tip**: Use for commonly used values

### **6. Placeholder Text** (Optional)
- **What**: Hint text shown in empty input
- **Example**: "Enter brand name", "e.g., Cotton, Polyester"
- **Benefit**: Helps users understand expected format

### **7. Help Text** (Optional)
- **What**: Additional guidance below the field
- **Example**: "Grams per square meter", "Must be future date"
- **Benefit**: Clarifies field purpose or format

### **8. Required**
- **What**: Makes field mandatory
- **When**: Use for essential product information
- **Example**: Brand, Material, Price

### **9. Validation Rules**

**For String:**
- Min Length: Minimum characters required
- Max Length: Maximum characters allowed

**For Number:**
- Min Value: Minimum numeric value
- Max Value: Maximum numeric value

**For Select/Multi-Select:**
- Options: List of choices users can select from

---

## 💡 Best Practices

### ✅ **DO:**

1. **Use Descriptive Names**
   - ✅ "Country of Origin"
   - ❌ "Country", "Origin"

2. **Add Help Text for Complex Fields**
   ```
   Field: "GSM"
   Help Text: "Grams per square meter - indicates fabric weight"
   ```

3. **Set Realistic Validation**
   ```
   Warranty Period:
   - Min: 0 months (no warranty)
   - Max: 60 months (5 years is reasonable)
   ```

4. **Group Related Fields**
   ```
   Group: "Specifications"
   - Dimensions
   - Weight
   - Material

   Group: "Compliance"
   - Certifications
   - Safety Standards
   ```

5. **Use Multi-Select for Multiple Answers**
   ```
   Care Instructions:
   ✅ Multi-Select: ["Machine Wash", "Tumble Dry", "Iron Low"]
   ❌ Select: Only one option
   ```

### ❌ **DON'T:**

1. **Don't Use Attributes for Variants**
   - ❌ Attribute: "Size" (creates different SKUs → use Variant)
   - ✅ Attribute: "Material" (describes product → attribute)

2. **Don't Make Everything Required**
   - Makes data entry tedious
   - Some fields are optional by nature

3. **Don't Use Generic Names**
   - ❌ "Field1", "Spec1"
   - ✅ "Warranty Period", "Power Consumption"

4. **Don't Over-Validate**
   - ❌ Brand name max 10 chars (too restrictive)
   - ✅ Brand name max 100 chars (reasonable)

---

## 🎯 Decision Tree: Attribute or Variant?

```
Does this property create a DIFFERENT VERSION
of the product with its own price/stock?

YES → Use VARIANT
├─ Size (Small shirt costs different than Large)
├─ Color (Blue variant has different stock)
└─ Pack Size (1L vs 4L have different prices)

NO → Use ATTRIBUTE
├─ Brand (Same for all variants)
├─ Material (Describes the product)
├─ Warranty (Same across variants)
└─ Country of Origin (Product property)
```

---

## 📱 How Attributes Appear in Product Form

When creating a product with this template:

```
Template: "Clothing Products"
Attributes: Brand, Material, Care Instructions, GSM

PRODUCT FORM WILL SHOW:
┌──────────────────────────────────────┐
│ Product Name: [___________________]  │
│ Price: [______]  Currency: [INR ▼]  │
│                                      │
│ === BASIC INFO ===                   │
│ Brand Name*: [___________________]   │
│                                      │
│ Material*:                           │
│ [Select Material ▼]                  │
│                                      │
│ Care Instructions:                   │
│ ☐ Machine Wash                       │
│ ☐ Hand Wash                          │
│ ☐ Dry Clean Only                     │
│                                      │
│ GSM (Fabric Weight):                 │
│ [______] grams per square meter      │
│                                      │
│ === VARIANTS ===                     │
│ Size: S, M, L, XL                    │
│ Color: Black, White, Red             │
└──────────────────────────────────────┘
```

---

## 🎨 Example Templates by Industry

### Quick Reference:

| Industry | Key Attributes | Variants |
|----------|----------------|----------|
| **Clothing** | Brand, Material, Care Instructions, GSM | Size, Color |
| **Electronics** | Brand, Model, Warranty, Power, Features | Color, Storage |
| **Food** | Ingredients, Dates, Certifications, Allergens | Pack Size, Flavor |
| **Paint** | Finish, Coverage, Drying Time, VOC | Color, Pack Size |
| **Cosmetics** | Ingredients, Dates, Skin Type, Certifications | Shade, Volume |
| **Furniture** | Material, Dimensions, Assembly, Warranty | Color, Size |
| **Sports** | Brand, Material, Suitable For, Certifications | Size, Color |
| **Bags** | Material, Capacity, Water Resistant, Brand | Color, Size |

---

## 🚀 Getting Started

### Step-by-Step:

1. **Identify Product Type**
   - What industry? (Clothing, Electronics, etc.)
   - What information is essential?

2. **List All Properties**
   - Write down everything users need to know
   - Separate into attributes vs variants

3. **Choose Data Types**
   - Text → String
   - Numbers → Number
   - Choices → Select/Multi-Select
   - Yes/No → Boolean

4. **Add Validation**
   - Min/Max for numbers
   - Length limits for text
   - Options for dropdowns

5. **Group & Organize**
   - Use field groups for clarity
   - Order by importance

6. **Test with Sample Product**
   - Create a test product
   - Verify all fields appear correctly
   - Adjust as needed

---

## 📊 Summary

**Attributes are for:**
- Product information/specifications
- Properties shared across all variants
- Compliance/certification data
- Usage instructions
- Technical specifications

**Use attributes effectively by:**
- Choosing the right data type
- Adding helpful validation
- Using clear, descriptive names
- Organizing with field groups
- Setting appropriate defaults

**Result:**
- Consistent product data
- Better user experience
- Easier searching/filtering
- Professional product catalog

---

Need help designing a template for your specific use case? Share the product type and I'll help you design the perfect attribute structure! 🎯
