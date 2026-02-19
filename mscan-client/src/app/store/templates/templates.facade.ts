import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { ProductTemplate } from '../../models/templates.model';
import * as TemplatesActions from './templates.actions';
import * as TemplatesSelectors from './templates.selectors';

@Injectable({
  providedIn: 'root'
})
export class TemplatesFacade {
  private store = inject(Store);

  templates$ = this.store.select(TemplatesSelectors.selectAllTemplates);
  selectedTemplate$ = this.store.select(TemplatesSelectors.selectSelectedTemplate);
  loading$ = this.store.select(TemplatesSelectors.selectTemplatesLoading);
  error$ = this.store.select(TemplatesSelectors.selectTemplatesError);
  loaded$ = this.store.select(TemplatesSelectors.selectTemplatesLoaded);
  pagination$ = this.store.select(TemplatesSelectors.selectTemplatesPagination);
  activeTemplates$ = this.store.select(TemplatesSelectors.selectActiveTemplates);
  systemTemplates$ = this.store.select(TemplatesSelectors.selectSystemTemplates);
  customTemplates$ = this.store.select(TemplatesSelectors.selectCustomTemplates);
  successMessage$ = this.store.select(TemplatesSelectors.selectSuccessMessage);
  lastCreatedTemplateId$ = this.store.select(TemplatesSelectors.selectLastCreatedTemplateId);
  lastUpdatedTemplateId$ = this.store.select(TemplatesSelectors.selectLastUpdatedTemplateId);
  lastDeletedTemplateId$ = this.store.select(TemplatesSelectors.selectLastDeletedTemplateId);

  loadTemplates(filters?: {
    page?: number;
    limit?: number;
    is_active?: boolean;
    search?: string;
    include_system?: boolean;
  }): void {
    this.store.dispatch(TemplatesActions.loadTemplates({ filters }));
  }

  loadTemplate(id: string): void {
    this.store.dispatch(TemplatesActions.loadTemplate({ id }));
  }

  selectTemplate(template: ProductTemplate | null): void {
    this.store.dispatch(TemplatesActions.selectTemplate({ template }));
  }

  createTemplate(template: any): void {
    this.store.dispatch(TemplatesActions.createTemplate({ template }));
  }

  updateTemplate(id: string, changes: Partial<ProductTemplate>): void {
    this.store.dispatch(TemplatesActions.updateTemplate({ id, changes }));
  }

  deleteTemplate(id: string): void {
    this.store.dispatch(TemplatesActions.deleteTemplate({ id }));
  }

  toggleTemplateStatus(id: string): void {
    this.store.dispatch(TemplatesActions.toggleTemplateStatus({ id }));
  }

  clearError(): void {
    this.store.dispatch(TemplatesActions.clearError());
  }

  clearTemplates(): void {
    this.store.dispatch(TemplatesActions.clearTemplates());
  }

  getTemplateById(id: string): Observable<ProductTemplate | undefined> {
    return this.store.select(TemplatesSelectors.selectTemplateById(id));
  }
}
