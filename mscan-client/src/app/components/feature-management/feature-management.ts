import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeaturesService, Feature, TenantFeature, CreateFeatureRequest } from '../../services/features.service';
import { TenantService } from '../../services/tenant.service';
import { ApiResponse, Tenant } from '../../models';

@Component({
  selector: 'app-feature-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    default_enabled: false
  };

  // Selected tenant for feature assignment
  selectedTenantId: string | null = null;

  constructor(
    private featuresService: FeaturesService,
    private tenantService: TenantService
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
      }
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
      }
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
      }
    });
  }

  toggleFeatureForTenant(tenantId: string, tenantFeature: TenantFeature) {
    if (tenantFeature.enabled_for_tenant) {
      this.disableFeatureForTenant(tenantId, tenantFeature.feature_id);
    } else {
      this.enableFeatureForTenant(tenantId, tenantFeature.feature_id);
    }
  }

  enableFeatureForTenant(tenantId: string, featureId: string) {
    this.featuresService.enableFeatureForTenant(tenantId, featureId).subscribe({
      next: () => {
        this.loadTenantFeatures(tenantId);
      },
      error: (error) => {
        this.error = 'Failed to enable feature';
        console.error('Error enabling feature:', error);
      }
    });
  }

  disableFeatureForTenant(tenantId: string, featureId: string) {
    this.featuresService.disableFeatureForTenant(tenantId, featureId).subscribe({
      next: () => {
        this.loadTenantFeatures(tenantId);
      },
      error: (error) => {
        this.error = 'Failed to disable feature';
        console.error('Error disabling feature:', error);
      }
    });
  }

  loadTenantFeatures(tenantId: string) {
    this.featuresService.getTenantFeatures(tenantId).subscribe({
      next: (response: ApiResponse<{ features: TenantFeature[] }>) => {
        if (response.status) {
          this.tenantFeatures[tenantId] = response?.data?.features || [];
        }
      },
      error: (error) => {
        console.error('Error loading tenant features:', error);
      }
    });
  }

  isFeatureEnabledForTenant(tenantId: string, featureId: string): boolean {
    const tenantFeature = this.tenantFeatures[tenantId]?.find(f => f.feature_id === featureId);
    return tenantFeature?.enabled_for_tenant || false;
  }

  getTenantName(tenantId: string): string {
    const tenant = this.tenants.find(t => t.id === tenantId);
    return tenant?.tenant_name || tenantId;
  }

  selectTenant(tenantId: string) {
    this.selectedTenantId = tenantId;
    if (!this.tenantFeatures[tenantId]) {
      this.loadTenantFeatures(tenantId);
    }
  }
}
