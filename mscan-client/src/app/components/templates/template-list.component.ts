import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core'
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { TemplateService } from '../../services/template.service';
import { TemplatesFacade } from '../../store/templates/templates.facade';
import { ProductTemplate } from '../../models/templates.model';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';
import { ConfirmationService } from '../../shared/services/confirmation.service';

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './template-list.component.html',
  styleUrls: ['./template-list.component.css']
})
export class TemplateListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private templatesFacade = inject(TemplatesFacade);
  private loadingService = inject(LoadingService);

  templates$ = this.templatesFacade.templates$;
  loading$ = this.templatesFacade.loading$;
  error$ = this.templatesFacade.error$;
  pagination$ = this.templatesFacade.pagination$;

  templates: ProductTemplate[] = [];
  successMessage = '';
  error = '';

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalPages = 0;
  totalTemplates = 0;

  // Filters
  searchTerm = '';
  includeSystem = true;

  constructor(
    private templateService: TemplateService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadTemplates();

    // Subscribe to templates from store
    this.templates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(templates => {
        this.templates = templates;
        this.cdr.detectChanges();
      });

    // Subscribe to pagination
    this.pagination$
      .pipe(takeUntil(this.destroy$))
      .subscribe(pagination => {
        if (pagination) {
          this.currentPage = pagination.page;
          this.totalPages = pagination.totalPages;
          this.totalTemplates = pagination.total;
          this.cdr.detectChanges();
        }
      });

    // Subscribe to error
    this.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        if (error) {
          this.error = error;
          this.cdr.detectChanges();
        }
      });

    // Subscribe to success message from store
    this.templatesFacade.successMessage$
      .pipe(
        takeUntil(this.destroy$),
        filter(msg => msg !== null)
      )
      .subscribe(message => {
        this.successMessage = message || '';
        this.cdr.detectChanges();
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
          this.templatesFacade.clearError();
          this.cdr.detectChanges();
        }, 3000);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTemplates(): void {
    this.error = '';
    this.successMessage = '';

    const filters = {
      page: this.currentPage,
      limit: this.pageSize,
      search: this.searchTerm || undefined,
      include_system: this.includeSystem
    };

    this.templatesFacade.loadTemplates(filters);
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadTemplates();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadTemplates();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadTemplates();
    }
  }

  viewTemplate(template: ProductTemplate): void {
    this.router.navigate(['/tenant/templates', template.id]);
  }

  editTemplate(template: ProductTemplate): void {
    this.router.navigate(['/tenant/templates', template.id, 'edit']);
  }

  duplicateTemplate(template: ProductTemplate): void {
    const newName = prompt(`Enter name for duplicated template:`, `${template.name} (Copy)`);
    if (!newName) return;

    this.templateService.duplicateTemplate(template.id, newName)
      .pipe(
        this.loadingService.wrapLoading(),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.successMessage = 'Template duplicated successfully';
          this.loadTemplates();
        },
        error: (err) => {
          this.error = HttpErrorHandler.getMessage(err, 'Failed to duplicate template');
          this.cdr.detectChanges();
        }
      });
  }

  deleteTemplate(template: ProductTemplate): void {
    if (template.is_system_template) {
      this.error = 'System templates cannot be deleted';
      this.cdr.detectChanges();
      return;
    }

    if (template.product_count && template.product_count > 0) {
      this.error = `Cannot delete template that has ${template.product_count} product(s). Please delete all products first.`;
      this.cdr.detectChanges();
      return;
    }

    if (template.app_count && template.app_count > 0) {
      this.error = `Cannot delete template that is assigned to ${template.app_count} verification app(s). Please unassign from all apps first.`;
      this.cdr.detectChanges();
      return;
    }

    this.confirmationService
      .confirm(`Are you sure you want to permanently delete template "${template.name}"? This action cannot be undone.`, 'Delete Template')
      .pipe(
        filter(confirmed => confirmed),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // Clear any previous messages
        this.error = '';
        this.successMessage = '';

        // Dispatch delete action - success message handled by subscription
        this.templatesFacade.deleteTemplate(template.id);
      });
  }

  toggleTemplateStatus(template: ProductTemplate): void {
    if (template.product_count && template.product_count > 0 && template.is_active) {
      this.error = `Cannot deactivate template that has ${template.product_count} product(s). Please delete all products first.`;
      this.cdr.detectChanges();
      return;
    }

    const action = template.is_active ? 'deactivate' : 'activate';

    this.confirmationService
      .confirmToggle(action, `template "${template.name}"`)
      .pipe(
        filter(confirmed => confirmed),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // Clear any previous messages
        this.error = '';
        this.successMessage = '';

        // Dispatch toggle action - success message handled by subscription
        this.templatesFacade.toggleTemplateStatus(template.id);
      });
  }

  canEditTemplate(template: ProductTemplate): boolean {
    return !template.product_count || template.product_count === 0;
  }

  canDeleteTemplate(template: ProductTemplate): boolean {
    return !template.is_system_template &&
           (!template.product_count || template.product_count === 0) &&
           (!template.app_count || template.app_count === 0);
  }

  canDeactivateTemplate(template: ProductTemplate): boolean {
    return !template.product_count || template.product_count === 0;
  }

  createTemplate(): void {
    this.router.navigate(['/tenant/templates/create']);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }
}
