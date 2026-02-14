/**
 * Product Template Models (JSONB-based)
 */

/**
 * Data types for template attributes
 */
export enum AttributeDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  SELECT = 'select',
  MULTI_SELECT = 'multi-select',
  URL = 'url',
  EMAIL = 'email',
  VARIANT_LIST = 'variant-list',
  STRUCTURED_LIST = 'structured-list'
}

/**
 * Validation rules for template attributes
 */
export interface ValidationRules {
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  options?: string[];  // For select/multi-select
  allowed_values?: string[];
  regex_pattern?: string;

  // For structured lists
  min_sections?: number;
  max_sections?: number;
  min_points_per_section?: number;
  max_points_per_section?: number;

  // For variant lists
  fields?: VariantFieldDefinition[];
  min_variants?: number;
  max_variants?: number;
}

/**
 * Template attribute definition (stored in JSONB custom_fields)
 */
export interface TemplateAttribute {
  id?: string;
  attribute_name: string;
  attribute_key: string;
  data_type: AttributeDataType;
  is_required: boolean;
  required?: boolean;  // Alias for is_required
  type?: string;  // Alias for data_type (for legacy compatibility)
  options?: string[];  // Shortcut for validation_rules.options
  validation_rules?: ValidationRules;
  default_value?: string;
  display_order: number;
  field_group?: string;
  help_text?: string;
  placeholder?: string;
  min?: number;  // Shortcut for validation_rules.min_value
  max?: number;  // Shortcut for validation_rules.max_value
}

/**
 * Variant field definition
 */
export interface VariantFieldDefinition {
  field_name: string;
  field_type: string;
  options?: string[];
  attribute_key: string;
  attribute_name: string;
  type: string;
  required: boolean;
  placeholder?: string;
  help_text?: string;
  min?: number;
  max?: number;
}

/**
 * Variant dimension (for legacy variant config)
 */
export interface VariantDimension {
  attribute_key: string;
  attribute_name: string;
  type: 'text' | 'select' | 'number';
  required: boolean;
  options?: string[];
  placeholder?: string;
  help_text?: string;
  min?: number;
  max?: number;
}

/**
 * Variant common field (for legacy variant config)
 */
export interface VariantCommonField {
  attribute_key: string;
  attribute_name: string;
  type: 'text' | 'number';
  required: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
}

/**
 * Variant configuration (stored in JSONB variant_config)
 */
export interface VariantConfig {
  variant_label?: string;
  dimensions?: VariantDimension[];
  common_fields?: VariantCommonField[];
  fields?: VariantFieldDefinition[];
}

/**
 * Structured description section
 */
export interface StructuredDescriptionSection {
  heading: string;
  bullet_points: string[];
}

/**
 * Product variant (dynamic fields based on template)
 */
export interface ProductVariant {
  variant_id?: string;
  is_default?: boolean;
  [key: string]: any; // Dynamic fields based on template's variant field definitions
}

/**
 * Product template (main entity)
 */
export interface ProductTemplate {
  id: string;
  tenant_id: string;
  template_name: string;
  name?: string;  // Alias for template_name
  industry_type: string;
  description?: string;
  icon?: string;
  variant_config?: VariantConfig;
  custom_fields?: TemplateAttribute[];
  attributes?: TemplateAttribute[];  // Alias for custom_fields
  is_active: boolean;
  is_system_template: boolean;
  created_at: string;
  updated_at: string;

  // Computed/joined fields
  attribute_count?: number;
  product_count?: number;
  app_count?: number;
}

/**
 * Template creation request
 */
export interface CreateTemplateRequest {
  template_name: string;
  industry_type: string;
  description?: string;
  icon?: string;
  variant_config: VariantConfig;
  custom_fields: CreateTemplateAttributeRequest[];
}

/**
 * Template attribute creation request
 */
export interface CreateTemplateAttributeRequest {
  attribute_name: string;
  attribute_key: string;
  data_type: AttributeDataType;
  is_required: boolean;
  validation_rules?: ValidationRules;
  default_value?: string;
  display_order: number;
  field_group?: string;
  help_text?: string;
  placeholder?: string;
}

/**
 * Template update request
 */
export interface UpdateTemplateRequest {
  template_name?: string;
  industry_type?: string;
  description?: string;
  icon?: string;
  variant_config?: VariantConfig;
  custom_fields?: TemplateAttribute[];
}

/**
 * Template list response
 */
export interface TemplateListResponse {
  templates: ProductTemplate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Template response (single)
 */
export interface TemplateResponse {
  success: boolean;
  message?: string;
  data: ProductTemplate;
}

/**
 * Product image interface
 */
export interface ProductImage {
  url: string;
  is_first: boolean;
  order: number;
}

/**
 * Product with template attributes populated
 */
export interface ProductWithAttributes {
  id: number;
  tenant_id: string;
  product_name: string;
  product_sku?: string;
  description?: string;
  price?: number;
  currency?: string;
  image_url?: string;
  thumbnail_url: string;
  product_images?: ProductImage[];
  verification_app_id: string;
  template_id?: string;
  attributes?: { [key: string]: any };
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Joined fields
  app_name?: string;
  template_name?: string;
}

/**
 * Tag interface (for product categorization)
 */
export interface Tag {
  id: string;
  tenant_id: string;
  verification_app_id: string;
  name: string;
  description?: string;
  icon?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  verification_app_name?: string;
}

/**
 * Description section for legacy template-based products
 */
export interface DescriptionSection {
  heading: string;
  descriptions: string[];
}

/**
 * Product attributes (for legacy template-based products)
 */
export interface ProductAttributes {
  variants: ProductVariant[];
  custom_fields: { [key: string]: any };
  description_sections: DescriptionSection[];
}

/**
 * Create product request
 */
export interface CreateProductRequest {
  product_name: string;
  product_sku?: string;
  description?: string;
  price?: number;
  image_url?: string;
  thumbnail_url: string;
  product_images?: ProductImage[];
  verification_app_id: string;
  template_id: string;
  attributes: ProductAttributes | { [key: string]: any };
  tag_ids?: string[];
  is_active?: boolean;
}

/**
 * Create tag request
 */
export interface CreateTagRequest {
  verification_app_id: string;
  name: string;
  description?: string;
  icon?: string;
  is_active?: boolean;
}
