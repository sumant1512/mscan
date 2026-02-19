import { createReducer, on } from '@ngrx/store';
import { initialTemplatesState } from './templates.state';
import * as TemplatesActions from './templates.actions';

export const templatesReducer = createReducer(
  initialTemplatesState,

  // Load templates
  on(TemplatesActions.loadTemplates, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TemplatesActions.loadTemplatesSuccess, (state, { templates, pagination }) => ({
    ...state,
    templates,
    pagination,
    loading: false,
    loaded: true,
    error: null
  })),

  on(TemplatesActions.loadTemplatesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load single template
  on(TemplatesActions.loadTemplate, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TemplatesActions.loadTemplateSuccess, (state, { template }) => ({
    ...state,
    selectedTemplate: template,
    loading: false,
    error: null
  })),

  on(TemplatesActions.loadTemplateFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Select template
  on(TemplatesActions.selectTemplate, (state, { template }) => ({
    ...state,
    selectedTemplate: template
  })),

  // Create template
  on(TemplatesActions.createTemplate, (state) => ({
    ...state,
    loading: true,
    error: null,
    successMessage: null,
    lastCreatedTemplateId: null
  })),

  on(TemplatesActions.createTemplateSuccess, (state, { template }) => ({
    ...state,
    templates: [...state.templates, template],
    loading: false,
    error: null,
    successMessage: 'Template created successfully',
    lastCreatedTemplateId: template.id
  })),

  on(TemplatesActions.createTemplateFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    successMessage: null,
    lastCreatedTemplateId: null
  })),

  // Update template
  on(TemplatesActions.updateTemplate, (state) => ({
    ...state,
    loading: true,
    error: null,
    successMessage: null,
    lastUpdatedTemplateId: null
  })),

  on(TemplatesActions.updateTemplateSuccess, (state, { template }) => ({
    ...state,
    templates: state.templates.map((t) => (t.id === template.id ? template : t)),
    selectedTemplate: state.selectedTemplate?.id === template.id ? template : state.selectedTemplate,
    loading: false,
    error: null,
    successMessage: 'Template updated successfully',
    lastUpdatedTemplateId: template.id
  })),

  on(TemplatesActions.updateTemplateFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    successMessage: null,
    lastUpdatedTemplateId: null
  })),

  // Delete template
  on(TemplatesActions.deleteTemplate, (state) => ({
    ...state,
    loading: true,
    error: null,
    successMessage: null,
    lastDeletedTemplateId: null
  })),

  on(TemplatesActions.deleteTemplateSuccess, (state, { id }) => ({
    ...state,
    templates: state.templates.filter((t) => t.id !== id),
    selectedTemplate: state.selectedTemplate?.id === id ? null : state.selectedTemplate,
    loading: false,
    error: null,
    successMessage: 'Template deleted successfully',
    lastDeletedTemplateId: id
  })),

  on(TemplatesActions.deleteTemplateFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    successMessage: null,
    lastDeletedTemplateId: null
  })),

  // Toggle template status
  on(TemplatesActions.toggleTemplateStatus, (state) => ({
    ...state,
    loading: true,
    error: null,
    successMessage: null
  })),

  on(TemplatesActions.toggleTemplateStatusSuccess, (state, { template }) => ({
    ...state,
    templates: state.templates.map((t) => (t.id === template.id ? template : t)),
    selectedTemplate: state.selectedTemplate?.id === template.id ? template : state.selectedTemplate,
    loading: false,
    error: null,
    successMessage: `Template ${template.is_active ? 'activated' : 'deactivated'} successfully`
  })),

  on(TemplatesActions.toggleTemplateStatusFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    successMessage: null
  })),

  // Clear error
  on(TemplatesActions.clearError, (state) => ({
    ...state,
    error: null,
    successMessage: null
  })),

  // Clear templates
  on(TemplatesActions.clearTemplates, () => initialTemplatesState)
);
