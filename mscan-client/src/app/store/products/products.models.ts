/**
 * Product State Interface
 */
export interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

/**
 * Product Interface with Template-Based Dynamic Schema
 *
 * IMPORTANT: Products have FLEXIBLE SCHEMAS based on their template.
 * Different templates define different fields, variants, and custom attributes.
 *
 * Examples:
 * - Paint Template: Size, Finish, Coverage, Drying Time
 * - Electronics Template: Color, Storage, Warranty, Model Number
 *
 * The index signature [key: string]: any allows template-specific fields.
 *
 * See: TEMPLATE_BASED_PRODUCT_SCHEMA.md for detailed architecture
 */
export interface Product {
  // Core fields (always present, strongly typed)
  id: string;
  product_name: string;
  verification_app_id: string;
  template_id: string;
  thumbnail_url: string;
  is_active: boolean;

  // Template-defined structure
  product_images?: ProductImage[];
  tags?: Tag[];
  attributes?: ProductAttributes; // Contains template-specific variants, custom_fields, etc.

  // Metadata
  created_at?: string;
  updated_at?: string;
  template_name?: string;
  app_name?: string;

  // Legacy/optional fields for backward compatibility
  image_url?: string;
  product_sku?: string;
  description?: string;
  price?: number;
  currency?: string;

  // Allow dynamic fields from different templates
  // This makes the interface flexible for template-based schemas
  [key: string]: any;
}

export interface ProductImage {
  url: string;
  is_first: boolean;
  order: number;
}

export interface Tag {
  id: string;
  name: string;
  icon?: string;
}

/**
 * Product Attributes - Template-Defined Fields
 *
 * The structure of this object is determined by the product's template.
 * Different templates will have different custom_fields, variant structures, etc.
 */
export interface ProductAttributes {
  // Common structures (may vary by template)
  variants?: ProductVariant[];
  custom_fields?: { [key: string]: any };
  description_sections?: DescriptionSection[];

  // Allow any additional fields based on template configuration
  // This makes the interface flexible for different template schemas
  [key: string]: any;
}

/**
 * Product Variant - Completely Dynamic
 *
 * Variant structure is entirely defined by the template's variant_config.
 * Examples:
 * - Paint: { size: "1L", finish: "Matte", price: 500, sku: "AP-1L-M" }
 * - Electronics: { color: "Black", storage: "128GB", price: 999, sku: "IPH15-BLK-128" }
 */
export interface ProductVariant {
  [key: string]: any;
}

export interface DescriptionSection {
  heading: string;
  descriptions: string[];
}

export interface CreateProductRequest {
  product_name: string;
  verification_app_id: string;
  template_id: string;
  thumbnail_url: string;
  product_images?: ProductImage[];
  tag_ids?: string[];
  is_active: boolean;
  attributes: ProductAttributes;
}

export interface UpdateProductRequest extends CreateProductRequest {
  id: string;
}

export interface ProductsFilter {
  page?: number;
  limit?: number;
  search?: string;
  app_id?: string;
}
