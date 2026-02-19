import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core'
import { inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { TemplateService } from '../../services/template.service';
import { TemplatesFacade } from '../../store/templates/templates.facade';
import {
  ProductTemplate,
  TemplateAttribute,
  AttributeDataType,
} from '../../models/templates.model';
import { LoadingService } from '../../shared/services/loading.service';
import { HttpErrorHandler } from '../../shared/utils/http-error.handler';
import { ConfirmationService } from '../../shared/services/confirmation.service';

@Component({
  selector: 'app-template-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './template-detail.component.html',
  styleUrls: ['./template-detail.component.css'],
})
export class TemplateDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private templatesFacade = inject(TemplatesFacade);
  private loadingService = inject(LoadingService);

  template: ProductTemplate | null = null;
  attributes: TemplateAttribute[] = [];

  loading$ = this.templatesFacade.loading$;
  error$ = this.templatesFacade.error$;
  error: string = '';
  successMessage = '';

  // Group attributes by field_group
  attributeGroups: Map<string, TemplateAttribute[]> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private templateService: TemplateService,
    private cdr: ChangeDetectorRef,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    const templateId = this.route.snapshot.paramMap.get('id');
    if (templateId) {
      this.loadTemplateDetails(templateId);
    }

    // Subscribe to selected template
    this.templatesFacade.selectedTemplate$
      .pipe(
        takeUntil(this.destroy$),
        filter(tmpl => tmpl !== null)
      )
      .subscribe((tmpl) => {
        if (tmpl) {
          this.template = tmpl;
          this.attributes = tmpl.custom_fields || [];
          this.groupAttributes();
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

    // Subscribe to deleted template ID for navigation after delete
    this.templatesFacade.lastDeletedTemplateId$
      .pipe(
        takeUntil(this.destroy$),
        filter(id => id !== null)
      )
      .subscribe(() => {
        this.successMessage = 'Template deleted successfully!';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.router.navigate(['/tenant/templates']);
        }, 1500);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTemplateDetails(id: string): void {
    this.error = '';
    this.successMessage = '';
    this.templatesFacade.loadTemplate(id);
  }

  groupAttributes(): void {
    this.attributeGroups.clear();

    this.attributes.forEach((attr) => {
      const group = attr.field_group || 'General';
      if (!this.attributeGroups.has(group)) {
        this.attributeGroups.set(group, []);
      }
      this.attributeGroups.get(group)!.push(attr);
    });

    // Sort attributes within each group by display_order
    this.attributeGroups.forEach((attrs) => {
      attrs.sort((a, b) => a.display_order - b.display_order);
    });
  }

  getAttributeGroups(): string[] {
    return Array.from(this.attributeGroups.keys());
  }

  getAttributesInGroup(group: string): TemplateAttribute[] {
    return this.attributeGroups.get(group) || [];
  }

  getDataTypeLabel(dataType: string): string {
    const labels: Record<string, string> = {
      string: 'Text',
      number: 'Number',
      boolean: 'Yes/No',
      date: 'Date',
      select: 'Dropdown',
      'multi-select': 'Multiple Choice',
      url: 'URL',
      email: 'Email',
    };
    return labels[dataType] || dataType;
  }

  getDataTypeIcon(dataType: string): string {
    const icons: Record<string, string> = {
      string: 'text_fields',
      number: 'numbers',
      boolean: 'toggle_on',
      date: 'calendar_today',
      select: 'arrow_drop_down_circle',
      'multi-select': 'checklist',
      url: 'link',
      email: 'email',
    };
    return icons[dataType] || 'help';
  }

  getValidationRulesText(attribute: TemplateAttribute): string[] {
    const rules: string[] = [];
    const validationRules = attribute.validation_rules;

    if (!validationRules) return rules;

    if (validationRules.min_length !== undefined) {
      rules.push(`Min length: ${validationRules.min_length}`);
    }
    if (validationRules.max_length !== undefined) {
      rules.push(`Max length: ${validationRules.max_length}`);
    }
    if (validationRules.min_value !== undefined) {
      rules.push(`Min value: ${validationRules.min_value}`);
    }
    if (validationRules.max_value !== undefined) {
      rules.push(`Max value: ${validationRules.max_value}`);
    }
    if (validationRules.allowed_values && validationRules.allowed_values.length > 0) {
      rules.push(`Options: ${validationRules.allowed_values.join(', ')}`);
    }
    if (validationRules.regex_pattern) {
      rules.push(`Pattern: ${validationRules.regex_pattern}`);
    }

    return rules;
  }

  canEditTemplate(): boolean {
    if (!this.template || this.template.is_system_template) {
      return false;
    }

    // Disable edit if template has products or is assigned to apps
    const productCount = this.template.product_count || 0;
    const appCount = this.template.app_count || 0;

    return productCount === 0 && appCount === 0;
  }

  getEditButtonTooltip(): string {
    if (!this.template) {
      return '';
    }

    if (this.template.is_system_template) {
      return 'System templates cannot be edited';
    }

    const productCount = this.template.product_count || 0;
    const appCount = this.template.app_count || 0;

    if (productCount > 0 && appCount > 0) {
      return 'Cannot edit template that has products and is assigned to apps';
    }

    if (productCount > 0) {
      return 'Cannot edit template that has products. Please delete all products first.';
    }

    if (appCount > 0) {
      return 'Cannot edit template that is assigned to verification apps. Please unassign from all apps first.';
    }

    return 'Edit this template';
  }

  editTemplate(): void {
    if (this.template && !this.template.is_system_template && this.canEditTemplate()) {
      this.router.navigate(['/tenant/templates', this.template.id, 'edit']);
    }
  }

  duplicateTemplate(): void {
    if (this.template) {
      const newName = prompt(`Enter name for duplicated template:`, `${this.template.name} (Copy)`);
      if (newName && newName.trim()) {
        this.templateService.duplicateTemplate(this.template.id, newName.trim())
          .pipe(
            this.loadingService.wrapLoading(),
            takeUntil(this.destroy$)
          )
          .subscribe({
            next: (response) => {
              this.successMessage = 'Template duplicated successfully!';
              setTimeout(() => {
                this.router.navigate(['/tenant/templates', response.template.id]);
              }, 1500);
            },
            error: (err) => {
              this.error = HttpErrorHandler.getMessage(err, 'Failed to duplicate template');
            },
          });
      }
    }
  }

  deleteTemplate(): void {
    if (this.template && !this.template.is_system_template) {
      this.confirmationService
        .confirm(
          `Are you sure you want to delete "${this.template.name}"? This action cannot be undone.`,
          'Delete Template'
        )
        .pipe(
          filter(confirmed => confirmed),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          if (!this.template) return;

          // Clear any previous messages
          this.error = '';
          this.successMessage = '';

          // Dispatch delete action - success/navigation handled by subscription
          this.templatesFacade.deleteTemplate(this.template.id);
        });
    }
  }

  goBack(): void {
    this.router.navigate(['/tenant/templates']);
  }
}
