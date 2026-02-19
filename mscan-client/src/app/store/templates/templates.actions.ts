import { createAction, props } from '@ngrx/store';
import { ProductTemplate } from '../../models/templates.model';

// Load templates
export const loadTemplates = createAction(
  '[Templates] Load Templates',
  props<{
    filters?: {
      page?: number;
      limit?: number;
      is_active?: boolean;
      search?: string;
      include_system?: boolean;
    };
  }>()
);

export const loadTemplatesSuccess = createAction(
  '[Templates] Load Templates Success',
  props<{
    templates: ProductTemplate[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>()
);

export const loadTemplatesFailure = createAction(
  '[Templates] Load Templates Failure',
  props<{ error: string }>()
);

// Load single template
export const loadTemplate = createAction(
  '[Templates] Load Template',
  props<{ id: string }>()
);

export const loadTemplateSuccess = createAction(
  '[Templates] Load Template Success',
  props<{ template: ProductTemplate }>()
);

export const loadTemplateFailure = createAction(
  '[Templates] Load Template Failure',
  props<{ error: string }>()
);

// Select template
export const selectTemplate = createAction(
  '[Templates] Select Template',
  props<{ template: ProductTemplate | null }>()
);

// Create template
export const createTemplate = createAction(
  '[Templates] Create Template',
  props<{ template: any }>()
);

export const createTemplateSuccess = createAction(
  '[Templates] Create Template Success',
  props<{ template: ProductTemplate }>()
);

export const createTemplateFailure = createAction(
  '[Templates] Create Template Failure',
  props<{ error: string }>()
);

// Update template
export const updateTemplate = createAction(
  '[Templates] Update Template',
  props<{ id: string; changes: Partial<ProductTemplate> }>()
);

export const updateTemplateSuccess = createAction(
  '[Templates] Update Template Success',
  props<{ template: ProductTemplate }>()
);

export const updateTemplateFailure = createAction(
  '[Templates] Update Template Failure',
  props<{ error: string }>()
);

// Delete template
export const deleteTemplate = createAction(
  '[Templates] Delete Template',
  props<{ id: string }>()
);

export const deleteTemplateSuccess = createAction(
  '[Templates] Delete Template Success',
  props<{ id: string }>()
);

export const deleteTemplateFailure = createAction(
  '[Templates] Delete Template Failure',
  props<{ error: string }>()
);

// Toggle template status
export const toggleTemplateStatus = createAction(
  '[Templates] Toggle Template Status',
  props<{ id: string }>()
);

export const toggleTemplateStatusSuccess = createAction(
  '[Templates] Toggle Template Status Success',
  props<{ template: ProductTemplate }>()
);

export const toggleTemplateStatusFailure = createAction(
  '[Templates] Toggle Template Status Failure',
  props<{ error: string }>()
);

// Clear error
export const clearError = createAction('[Templates] Clear Error');

// Clear templates
export const clearTemplates = createAction('[Templates] Clear Templates');
