import { ProductTemplate } from '../../models/templates.model';

export interface TemplatesState {
  templates: ProductTemplate[];
  selectedTemplate: ProductTemplate | null;
  loading: boolean;
  error: string | null;
  loaded: boolean;
  successMessage: string | null;
  lastCreatedTemplateId: string | null;
  lastUpdatedTemplateId: string | null;
  lastDeletedTemplateId: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
}

export const initialTemplatesState: TemplatesState = {
  templates: [],
  selectedTemplate: null,
  loading: false,
  error: null,
  loaded: false,
  successMessage: null,
  lastCreatedTemplateId: null,
  lastUpdatedTemplateId: null,
  lastDeletedTemplateId: null,
  pagination: null
};
