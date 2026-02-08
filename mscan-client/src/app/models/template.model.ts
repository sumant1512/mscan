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

export interface VariantCommonField {
  attribute_key: string;
  attribute_name: string;
  type: 'text' | 'number';
  required: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
}

export interface VariantConfig {
  variant_label: string;
  dimensions: VariantDimension[];
  common_fields: VariantCommonField[];
}

export interface CustomField {
  attribute_key: string;
  attribute_name: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  required: boolean;
  options?: string[];
  placeholder?: string;
  help_text?: string;
  min?: number;
  max?: number;
}

export interface ProductTemplate {
  id: string;
  tenant_id: string;
  template_name: string;
  description?: string;
  variant_config: VariantConfig;
  custom_fields: CustomField[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

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

export interface ProductVariant {
  [key: string]: any; // Dynamic fields based on template dimensions + common fields
}

export interface DescriptionSection {
  heading: string;
  descriptions: string[];
}

export interface ProductAttributes {
  variants: ProductVariant[];
  custom_fields: { [key: string]: any };
  description_sections: DescriptionSection[];
}

export interface Product {
  id: number;
  tenant_id: string;
  product_name: string;
  product_sku?: string;
  description?: string;
  price?: number;
  currency?: string;
  image_url?: string;
  verification_app_id: string;
  template_id: string;
  attributes: ProductAttributes;
  tags?: Tag[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;

  // Joined fields from database
  app_name?: string;
  template_name?: string;
  variant_config?: VariantConfig;
  custom_fields?: CustomField[];
}

// Request/Response interfaces
export interface CreateProductRequest {
  product_name: string;
  product_sku?: string;
  description?: string;
  price?: number;
  currency?: string;
  image_url?: string;
  verification_app_id: string;
  template_id: string;
  attributes: ProductAttributes;
  tag_ids?: string[];
  is_active?: boolean;
}

export interface CreateTemplateRequest {
  template_name: string;
  description?: string;
  variant_config: VariantConfig;
  custom_fields: CustomField[];
  is_active?: boolean;
}

export interface CreateTagRequest {
  verification_app_id: string;
  name: string;
  description?: string;
  icon?: string;
  is_active?: boolean;
}
