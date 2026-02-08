import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TemplateService } from '../../services/template.service';
import {
  ProductTemplate,
  TemplateAttribute,
  AttributeDataType,
} from '../../models/templates.model';

@Component({
  selector: 'app-template-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './template-detail.component.html',
  styleUrls: ['./template-detail.component.css'],
})
export class TemplateDetailComponent implements OnInit {
  template: ProductTemplate | null = null;
  attributes: TemplateAttribute[] = [];
  loading: boolean = false;
  error: string = '';

  // Group attributes by field_group
  attributeGroups: Map<string, TemplateAttribute[]> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private templateService: TemplateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const templateId = this.route.snapshot.paramMap.get('id');
    if (templateId) {
      this.loadTemplateDetails(templateId);
    }
  }

  loadTemplateDetails(id: string): void {
    this.loading = true;
    this.error = '';

    this.templateService.getTemplate(id).subscribe({
      next: (response) => {
        console.log('Loaded template details:', response);
        this.template = response.data;
        this.attributes = response.data.custom_fields || [];
        this.groupAttributes();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load template details';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
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

  editTemplate(): void {
    if (this.template && !this.template.is_system_template) {
      this.router.navigate(['/tenant/templates', this.template.id, 'edit']);
    }
  }

  duplicateTemplate(): void {
    if (this.template) {
      const newName = prompt(`Enter name for duplicated template:`, `${this.template.name} (Copy)`);
      if (newName) {
        this.templateService.duplicateTemplate(this.template.id, newName).subscribe({
          next: (response) => {
            alert('Template duplicated successfully!');
            this.router.navigate(['/tenant/templates', response.template.id]);
          },
          error: (err) => {
            this.error = err.error?.message || 'Failed to duplicate template';
          },
        });
      }
    }
  }

  deleteTemplate(): void {
    if (this.template && !this.template.is_system_template) {
      if (
        confirm(
          `Are you sure you want to delete "${this.template.name}"? This action cannot be undone.`,
        )
      ) {
        this.templateService.deleteTemplate(this.template.id).subscribe({
          next: () => {
            alert('Template deleted successfully!');
            this.router.navigate(['/tenant/templates']);
          },
          error: (err) => {
            this.error =
              err.error?.message || 'Failed to delete template. It may be in use by products.';
          },
        });
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/tenant/templates']);
  }
}
