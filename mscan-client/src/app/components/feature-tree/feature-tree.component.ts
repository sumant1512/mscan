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
        <div class="feature-item" [style.margin-left.px]="level * 20">
          <div class="feature-info">
            <span class="feature-name">{{ feature.name }}</span>
            <span class="feature-code">{{ feature.code }}</span>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              [checked]="feature.enabled_for_tenant"
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
      .feature-tree-node {
        margin-left: 20px;
      }
      .feature-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        border: 1px solid #ddd;
        margin-bottom: 5px;
        background: #f9f9f9;
      }
      .feature-info {
        display: flex;
        flex-direction: column;
      }
      .feature-name {
        font-weight: bold;
      }
      .feature-code {
        font-size: 0.8em;
        color: #666;
      }
      .toggle {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 24px;
      }
      .toggle input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: 0.4s;
        border-radius: 24px;
      }
      .slider:before {
        position: absolute;
        content: '';
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.4s;
        border-radius: 50%;
      }
      input:checked + .slider {
        background-color: #2196f3;
      }
      input:checked + .slider:before {
        transform: translateX(26px);
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
