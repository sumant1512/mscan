import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TemplatesState } from './templates.state';

export const selectTemplatesState = createFeatureSelector<TemplatesState>('templates');

export const selectAllTemplates = createSelector(
  selectTemplatesState,
  (state: TemplatesState) => state.templates
);

export const selectSelectedTemplate = createSelector(
  selectTemplatesState,
  (state: TemplatesState) => state.selectedTemplate
);

export const selectTemplatesLoading = createSelector(
  selectTemplatesState,
  (state: TemplatesState) => state.loading
);

export const selectTemplatesError = createSelector(
  selectTemplatesState,
  (state: TemplatesState) => state.error
);

export const selectTemplatesLoaded = createSelector(
  selectTemplatesState,
  (state: TemplatesState) => state.loaded
);

export const selectTemplatesPagination = createSelector(
  selectTemplatesState,
  (state: TemplatesState) => state.pagination
);

export const selectTemplateById = (id: string) =>
  createSelector(
    selectAllTemplates,
    (templates) => templates.find((template) => template.id === id)
  );

export const selectActiveTemplates = createSelector(
  selectAllTemplates,
  (templates) => templates.filter((template) => template.is_active)
);

export const selectSystemTemplates = createSelector(
  selectAllTemplates,
  (templates) => templates.filter((template) => template.is_system_template)
);

export const selectCustomTemplates = createSelector(
  selectAllTemplates,
  (templates) => templates.filter((template) => !template.is_system_template)
);

export const selectSuccessMessage = createSelector(
  selectTemplatesState,
  (state: TemplatesState) => state.successMessage
);

export const selectLastCreatedTemplateId = createSelector(
  selectTemplatesState,
  (state: TemplatesState) => state.lastCreatedTemplateId
);

export const selectLastUpdatedTemplateId = createSelector(
  selectTemplatesState,
  (state: TemplatesState) => state.lastUpdatedTemplateId
);

export const selectLastDeletedTemplateId = createSelector(
  selectTemplatesState,
  (state: TemplatesState) => state.lastDeletedTemplateId
);
