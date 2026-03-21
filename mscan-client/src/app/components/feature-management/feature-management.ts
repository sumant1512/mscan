import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FeaturesService,
  Feature,
  TenantFeature,
  CreateFeatureRequest,
} from '../../services/features.service';
import { TenantService } from '../../services/tenant.service';
import { ApiResponse, Tenant } from '../../models';
import { FeatureTreeComponent } from '../feature-tree/feature-tree.component';

@Component({
  selector: 'app-feature-management',
  standalone: true,
  imports: [CommonModule, FormsModule, FeatureTreeComponent],
  templateUrl: './feature-management.html',
  styleUrl: './feature-management.css',
})
export class FeatureManagement implements OnInit {
  features: Feature[] = [];
  tenants: Tenant[] = [];
  tenantFeatures: { [tenantId: string]: TenantFeature[] } = {};
  loading = false;
  error: string | null = null;

  // New feature form
  showCreateForm = false;
  newFeature: CreateFeatureRequest = {
    code: '',
    name: '',
    description: '',
    default_enabled: false,
  };

  // Selected tenant for feature assignment
  selectedTenantId: string | null = null;

  constructor(
    private featuresService: FeaturesService,
    private tenantService: TenantService,
  ) {}

  ngOnInit() {
    this.loadFeatures();
    this.loadTenants();
  }

  loadFeatures() {
    this.loading = true;
    this.featuresService.listFeatures().subscribe({
      next: (response: ApiResponse<{ features: Feature[] }>) => {
        if (response.status) {
          this.features = response?.data?.features || [];
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load features';
        this.loading = false;
        console.error('Error loading features:', error);
      },
    });
  }

  loadTenants() {
    this.tenantService.getAllTenants().subscribe({
      next: (response: any) => {
        if (response.status) {
          this.tenants = response.data.tenants || [];
        }
      },
      error: (error) => {
        console.error('Error loading tenants:', error);
      },
    });
  }

  createFeature() {
    if (!this.newFeature.code || !this.newFeature.name) {
      this.error = 'Code and name are required';
      return;
    }

    this.featuresService.createFeature(this.newFeature).subscribe({
      next: (response: ApiResponse<{ feature: Feature }>) => {
        if (response.status) {
          this.features.unshift(response.data?.feature as Feature);
          this.showCreateForm = false;
          this.newFeature = { code: '', name: '', description: '', default_enabled: false };
          this.error = null;
        }
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to create feature';
        console.error('Error creating feature:', error);
      },
    });
  }

  toggleFeatureForTenant(tenantId: string, tenantFeature: TenantFeature) {
    const newEnabledState = !tenantFeature.enabled_for_tenant;
    this.featuresService
      .toggleFeatureForTenant(tenantId, tenantFeature.feature_id, newEnabledState)
      .subscribe({
        next: (response) => {
          if (response.status) {
            // Update the local state
            tenantFeature.enabled_for_tenant = newEnabledState;
            tenantFeature.enabled_at = response.data?.feature?.enabled_at;
            tenantFeature.enabled_by = response.data?.feature?.enabled_by;
          }
        },
        error: (error) => {
          this.error = `Failed to ${newEnabledState ? 'enable' : 'disable'} feature`;
          console.error('Error toggling feature:', error);
        },
      });
  }

  // Remove old enable/disable methods as they're replaced by toggle

  loadTenantFeatures(tenantId: string) {
    if (!tenantId) return;

    this.featuresService.getTenantFeatures(tenantId).subscribe({
      next: (response: ApiResponse<{ features: TenantFeature[] }>) => {
        if (response.status) {
          this.tenantFeatures[tenantId] = response?.data?.features || [];
        }
      },
      error: (error) => {
        console.error('Error loading tenant features:', error);
      },
    });
  }

  isFeatureEnabledForTenant(tenantId: string, featureId: string): boolean {
    const tenantFeature = this.tenantFeatures[tenantId]?.find((f) => f.feature_id === featureId);
    return tenantFeature?.enabled_for_tenant || false;
  }

  getTenantName(tenantId: string): string {
    const tenant = this.tenants.find((t) => t.id === tenantId);
    return tenant?.tenant_name || tenantId;
  }

  selectTenant(tenantId: string) {
    this.selectedTenantId = tenantId;
    if (tenantId && !this.tenantFeatures[tenantId]) {
      this.loadTenantFeatures(tenantId);
    }
  }

  buildFeatureTree(tenantFeatures: TenantFeature[]): any[] {
    // Build a tree structure from flat tenant features
    const featureMap = new Map<string, any>();
    const rootFeatures: any[] = [];

    // First pass: create all nodes
    tenantFeatures.forEach((tf) => {
      featureMap.set(tf.feature_id, {
        ...tf,
        children: [],
      });
    });

    // Second pass: build parent-child relationships
    tenantFeatures.forEach((tf) => {
      const node = featureMap.get(tf.feature_id);
      if (tf.parent_id && featureMap.has(tf.parent_id)) {
        const parent = featureMap.get(tf.parent_id);
        parent.children.push(node);
      } else {
        rootFeatures.push(node);
      }
    });

    return rootFeatures;
  }

  onToggleFeature(event: { tenantId: string; featureId: string; enabled: boolean }) {
    // Handle toggle from tree component
    this.featuresService
      .toggleFeatureForTenant(event.tenantId, event.featureId, event.enabled)
      .subscribe({
        next: (response) => {
          if (response.status) {
            // Update local state
            const tenantFeature = this.tenantFeatures[event.tenantId]?.find(
              (tf) => tf.feature_id === event.featureId,
            );
            if (tenantFeature) {
              tenantFeature.enabled_for_tenant = event.enabled;
              tenantFeature.enabled_at = response.data?.feature?.enabled_at;
              tenantFeature.enabled_by = response.data?.feature?.enabled_by;
            }
          }
        },
        error: (error) => {
          this.error = `Failed to ${event.enabled ? 'enable' : 'disable'} feature`;
          console.error('Error toggling feature:', error);
        },
      });
  }
}
