import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TenantFeature } from '../../services/features.service';

@Component({
  selector: 'app-feature-tree',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="feature-tree">
      <div class="feature-tree-node" *ngFor="let feature of features">
        <div class="feature-item" [style.padding-left.px]="level * 32 + 16" [class.has-children]="feature.children?.length > 0">
          <div class="feature-icon" [class.parent]="feature.children?.length > 0">
            {{ feature.children?.length > 0 ? '📁' : '🏷️' }}
          </div>
          <div class="feature-info">
            <div class="feature-header-inline">
              <span class="feature-name">{{ feature.name }}</span>
              <span class="feature-badge" *ngIf="feature.default_enabled">⭐ Default</span>
            </div>
            <span class="feature-code">
              <code>{{ feature.code }}</code>
            </span>
            <p class="feature-desc" *ngIf="feature.description">{{ feature.description }}</p>
          </div>
          <label class="toggle" [class.disabled]="!feature.is_active">
            <input
              type="checkbox"
              [checked]="feature.enabled_for_tenant"
              [disabled]="!feature.is_active"
              (change)="onToggle($event, feature)"
            />
            <span class="slider"></span>
          </label>
        </div>
        <div class="children" *ngIf="feature.children && feature.children.length > 0">
          <app-feature-tree
            [features]="feature.children"
            [tenantId]="tenantId"
            [level]="level + 1"
            (toggleFeature)="toggleFeature.emit($event)"
          >
          </app-feature-tree>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .feature-tree {
        width: 100%;
      }

      .feature-tree-node {
        margin-bottom: 8px;
      }

      .feature-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        border: 2px solid #e9ecef;
        border-radius: 12px;
        transition: all 0.3s ease;
        position: relative;
      }

      .feature-item:hover {
        border-color: #667eea;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        transform: translateX(4px);
      }

      .feature-item.has-children {
        background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%);
        border-color: #ffc107;
      }

      .feature-item.has-children:hover {
        border-color: #ffb300;
      }

      .feature-icon {
        font-size: 24px;
        flex-shrink: 0;
        filter: grayscale(0.3);
      }

      .feature-icon.parent {
        filter: none;
      }

      .feature-info {
        flex: 1;
        min-width: 0;
      }

      .feature-header-inline {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 6px;
      }

      .feature-name {
        font-weight: 600;
        font-size: 15px;
        color: #333;
      }

      .feature-badge {
        background: #fff3cd;
        color: #856404;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
      }

      .feature-code {
        display: inline-block;
        margin-bottom: 4px;
      }

      .feature-code code {
        background: #f1f3f5;
        color: #667eea;
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-family: 'Monaco', 'Courier New', monospace;
      }

      .feature-desc {
        font-size: 13px;
        color: #6c757d;
        margin: 6px 0 0 0;
        line-height: 1.4;
      }

      .toggle {
        position: relative;
        display: inline-block;
        width: 56px;
        height: 28px;
        flex-shrink: 0;
      }

      .toggle.disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .toggle input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .toggle input:disabled + .slider {
        cursor: not-allowed;
      }

      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #cbd5e0;
        transition: 0.3s;
        border-radius: 28px;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .slider:before {
        position: absolute;
        content: '';
        height: 22px;
        width: 22px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .slider:after {
        content: 'OFF';
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 9px;
        font-weight: 700;
        color: #fff;
        opacity: 0.8;
      }

      input:checked + .slider {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      input:checked + .slider:before {
        transform: translateX(28px);
      }

      input:checked + .slider:after {
        content: 'ON';
        left: 8px;
        right: auto;
      }

      input:focus + .slider {
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
      }

      .children {
        margin-top: 8px;
        position: relative;
      }

      .children:before {
        content: '';
        position: absolute;
        left: 20px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: linear-gradient(180deg, #e9ecef 0%, transparent 100%);
      }
    `,
  ],
})
export class FeatureTreeComponent {
  @Input() features: any[] = [];
  @Input() tenantId = '';
  @Input() level = 0;
  @Output() toggleFeature = new EventEmitter<{
    tenantId: string;
    featureId: string;
    enabled: boolean;
  }>();

  onToggle(event: any, feature: TenantFeature) {
    const enabled = event.target.checked;
    this.toggleFeature.emit({
      tenantId: this.tenantId,
      featureId: feature.feature_id,
      enabled,
    });
  }
}
