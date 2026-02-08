import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TemplateService } from '../../services/template.service';
import { ProductTemplate } from '../../models/templates.model';

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './template-list.component.html',
  styleUrls: ['./template-list.component.css']
})
export class TemplateListComponent implements OnInit {
  templates: ProductTemplate[] = [];
  loading = false;
  error: string | null = null;

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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.loading = true;
    this.error = null;

    const params = {
      page: this.currentPage,
      limit: this.pageSize,
      search: this.searchTerm || undefined,
      include_system: this.includeSystem
    };

    this.templateService.getTemplates(params).subscribe({
      next: (response) => {
        this.templates = response.templates;
        this.currentPage = response.pagination.page;
        this.totalPages = response.pagination.totalPages;
        this.totalTemplates = response.pagination.total;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading templates:', error);
        this.error = error.error?.message || 'Failed to load templates';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
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

    this.loading = true;
    this.templateService.duplicateTemplate(template.id, newName).subscribe({
      next: (response) => {
        this.loadTemplates();
        alert('Template duplicated successfully');
      },
      error: (error) => {
        console.error('Error duplicating template:', error);
        alert(error.error?.message || 'Failed to duplicate template');
        this.loading = false;
      }
    });
  }

  deleteTemplate(template: ProductTemplate): void {
    if (template.is_system_template) {
      alert('System templates cannot be deleted');
      return;
    }

    if (!confirm(`Are you sure you want to delete template "${template.name}"?`)) {
      return;
    }

    this.loading = true;
    this.templateService.deleteTemplate(template.id).subscribe({
      next: () => {
        this.loadTemplates();
        alert('Template deleted successfully');
      },
      error: (error) => {
        console.error('Error deleting template:', error);
        alert(error.error?.message || 'Failed to delete template');
        this.loading = false;
      }
    });
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
