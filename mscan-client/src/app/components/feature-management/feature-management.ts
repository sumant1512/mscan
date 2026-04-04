import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import {
  FeaturesService,
  Feature,
  TenantFeature,
  TenantFeatureTree,
  CreateFeatureRequest,
} from '../../services/features.service';
import { TenantService } from '../../services/tenant.service';
import { AuthService } from '../../services/auth.service';
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
  filteredFeatures: Feature[] = [];
  flattenedTreeFeatures: any[] = [];
  expandedNodes: Set<string> = new Set();
  tenants: Tenant[] = [];
  tenantFeatures: { [tenantId: string]: TenantFeature[] } = {};
  loading = false;
  loadingTenantFeatures = false;
  creatingFeature = false;
  error: string | null = null;
  successMessage: string | null = null;
  searchQuery: string = '';
  
  // User role and tenant info
  isSuperAdmin = false;
  isTenantAdmin = false;
  currentTenantId: string | null = null;
  currentTenantName: string = '';
  myTenantFeaturesFlat: TenantFeature[] = []; // Flat list from API
  myTenantFeatures: TenantFeatureTree[] = []; // Tree structure for display

  // New feature form
  showCreateForm = false;
  newFeature: CreateFeatureRequest = {
    code: '',
    name: '',
    description: '',
    is_active: true,
    default_enabled: false,
  };

  // Edit feature form
  showEditForm = false;
  editingFeature = false;
  selectedFeature: Feature | null = null;
  editFeature: CreateFeatureRequest = {
    code: '',
    name: '',
    description: '',
    is_active: true,
    default_enabled: false,
  };

  // Selected tenant for feature assignment
  selectedTenantId: string | null = null;
  selectedFeatureToAssign: Feature | null = null;
  assigningFeature = false;

  constructor(
    private featuresService: FeaturesService,
    private tenantService: TenantService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser) {
      this.isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
      this.isTenantAdmin = currentUser.role === 'TENANT_ADMIN';
      this.currentTenantId = currentUser.tenant?.id || null;
      this.currentTenantName = currentUser.tenant?.tenant_name || '';
    }

    if (this.isSuperAdmin) {
      // Super admin: load all features and tenants
      this.loadFeatures();
      this.loadTenants();
    } else if (this.isTenantAdmin && this.currentTenantId) {
      // Tenant admin: load only their tenant's features
      this.loadMyTenantFeatures();
    }
  }

  loadMyTenantFeatures() {
    if (!this.currentTenantId) return;

    this.loading = true;
    this.featuresService.getTenantFeatures(this.currentTenantId)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response: ApiResponse<{ features: TenantFeature[] }>) => {
          if (response.status) {
            this.myTenantFeaturesFlat = response?.data?.features || [];
            this.buildMyFeatureTree();
          } else {
            this.error = 'Failed to load features';
          }
        },
        error: (error) => {
          this.error = 'Failed to load features';
          console.error('Error loading tenant features:', error);
        },
      });
  }

  buildMyFeatureTree() {
    const featureMap = new Map<string, TenantFeatureTree>();
    const rootFeatures: TenantFeatureTree[] = [];

    // First pass: create all nodes
    this.myTenantFeaturesFlat.forEach((tf) => {
      featureMap.set(tf.feature_id, {
        ...tf,
        children: [],
        isExpanded: true,
      });
    });

    // Second pass: build parent-child relationships  
    this.myTenantFeaturesFlat.forEach((tf) => {
      const node = featureMap.get(tf.feature_id);
      if (node) {
        if (tf.parent_id && featureMap.has(tf.parent_id)) {
          const parent = featureMap.get(tf.parent_id);
          if (parent && parent.children) {
            parent.children.push(node);
          }
        } else {
          rootFeatures.push(node);
        }
      }
    });

    this.myTenantFeatures = rootFeatures;
    this.cdr.markForCheck();
  }

  toggleMyFeature(feature: TenantFeatureTree, event: any) {
    if (!this.currentTenantId) return;

    const enabled = event.target.checked;
    
    this.featuresService
      .toggleFeatureForTenant(this.currentTenantId, feature.feature_id, enabled)
      .subscribe({
        next: (response) => {
          if (response.status) {
            feature.enabled_for_tenant = enabled;
            this.successMessage = `Feature "${feature.name}" ${enabled ? 'enabled' : 'disabled'} successfully`;
            this.cdr.markForCheck();
            
            setTimeout(() => {
              this.successMessage = null;
              this.cdr.markForCheck();
            }, 3000);
          }
        },
        error: (error) => {
          event.target.checked = !enabled; // Revert toggle
          this.error = `Failed to ${enabled ? 'enable' : 'disable'} feature`;
          console.error('Error toggling feature:', error);
          this.cdr.markForCheck();
          
          setTimeout(() => {
            this.error = null;
            this.cdr.markForCheck();
          }, 5000);
        },
      });
  }

  loadFeatures() {
    this.loading = true;
    this.featuresService.listFeatures()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response: ApiResponse<{ features: Feature[] }>) => {
          if (response.status) {
            this.features = response?.data?.features || [];
            this.filteredFeatures = [...this.features];
            this.buildFlattenedTree();
          } else {
            this.error = 'Failed to load features';
          }
        },
        error: (error) => {
          this.error = 'Failed to load features';
          console.error('Error loading features:', error);
        },
      });
  }

  loadTenants() {
    this.tenantService.getAllTenants().subscribe({
      next: (response: any) => {
        if (response.status) {
          this.tenants = response.data.tenants || [];
          this.cdr.markForCheck();
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
      this.cdr.detectChanges();
      return;
    }

    // Clear any previous errors
    this.error = null;
    this.creatingFeature = true;
    console.log('Creating feature...', this.newFeature);

    // Clean up parent_id - convert undefined to null for backend
    const featureData: any = {
      code: this.newFeature.code!,
      name: this.newFeature.name!,
      description: this.newFeature.description,
      is_active: this.newFeature.is_active,
      default_enabled: this.newFeature.default_enabled,
      parent_id: this.newFeature.parent_id === undefined ? null : this.newFeature.parent_id
    };
    
    console.log('Sending feature data:', featureData);

    this.featuresService.createFeature(featureData)
      .pipe(
        finalize(() => {
          console.log('Create feature finalize - resetting creatingFeature flag');
          this.creatingFeature = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response: ApiResponse<{ feature: Feature }>) => {
          console.log('Create feature response:', response);
          
          if (response.status && response.data?.feature) {
            const newFeature = response.data.feature;
            
            // Add to features list
            this.features.unshift(newFeature);
            this.filteredFeatures = [...this.features];
            this.buildFlattenedTree();
            
            // Close modal and reset form
            this.showCreateForm = false;
            this.newFeature = { 
              code: '', 
              name: '', 
              description: '',
              is_active: true,
              default_enabled: false 
            };
            
            // Show success message
            this.successMessage = `✓ Feature "${newFeature.name}" created successfully!`;
            
            setTimeout(() => {
              this.successMessage = null;
              this.cdr.markForCheck();
            }, 5000);
          } else {
            console.error('Create feature failed:', response);
            this.error = response.message || 'Failed to create feature';
          }
        },
        error: (error) => {
          console.error('Error creating feature:', error);
          this.error = error.error?.message || error.message || 'Failed to create feature';
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
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          this.error = `Failed to ${newEnabledState ? 'enable' : 'disable'} feature`;
          console.error('Error toggling feature:', error);
          this.cdr.markForCheck();
        },
      });
  }

  // Remove old enable/disable methods as they're replaced by toggle

  loadTenantFeatures(tenantId: string) {
    if (!tenantId) return;

    this.loadingTenantFeatures = true;
    this.featuresService.getTenantFeatures(tenantId)
      .pipe(
        finalize(() => {
          this.loadingTenantFeatures = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response: ApiResponse<{ features: TenantFeature[] }>) => {
          console.log('Raw API response for tenant features:', response);
          if (response.status) {
            this.tenantFeatures[tenantId] = response?.data?.features || [];
            console.log('Tenant features stored:', this.tenantFeatures[tenantId]);
          } else {
            this.error = 'Failed to load tenant features';
          }
        },
        error: (error) => {
          this.error = 'Failed to load tenant features';
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

    console.log('Building feature tree for tenant features:', tenantFeatures);

    // First pass: create all nodes
    tenantFeatures.forEach((tf) => {
      featureMap.set(tf.feature_id, {
        ...tf,
        children: [],
      });
    });

    console.log('Feature map after first pass:', featureMap);

    // Second pass: build parent-child relationships
    tenantFeatures.forEach((tf) => {
      const node = featureMap.get(tf.feature_id);
      if (tf.parent_id && featureMap.has(tf.parent_id)) {
        const parent = featureMap.get(tf.parent_id);
        parent.children.push(node);
        console.log(`Added ${tf.name} as child of parent with ID ${tf.parent_id}`);
      } else {
        rootFeatures.push(node);
        console.log(`Added ${tf.name} as root feature (parent_id: ${tf.parent_id})`);
      }
    });

    console.log('Root features:', rootFeatures);

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
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          this.error = `Failed to ${event.enabled ? 'enable' : 'disable'} feature`;
          console.error('Error toggling feature:', error);
          this.cdr.markForCheck();
        },
      });
  }

  filterFeatures() {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredFeatures = [...this.features];
    } else {
      this.filteredFeatures = this.features.filter(feature =>
        feature.name.toLowerCase().includes(query) ||
        feature.code.toLowerCase().includes(query) ||
        (feature.description && feature.description.toLowerCase().includes(query))
      );
    }
    this.buildFlattenedTree();
    this.cdr.markForCheck();
  }

  hasChildren(featureId: string): boolean {
    return this.features.some(f => f.parent_id === featureId);
  }

  getChildrenCount(featureId: string): number {
    return this.features.filter(f => f.parent_id === featureId).length;
  }

  closeCreateForm() {
    if (this.creatingFeature) {
      return; // Prevent closing while creating
    }
    this.showCreateForm = false;
    this.error = null;
    this.newFeature = { 
      code: '', 
      name: '', 
      description: '',
      is_active: true,
      default_enabled: false 
    };
  }

  openEditForm(feature: Feature) {
    console.log('Opening edit form for feature:', feature);
    this.selectedFeature = feature;
    // Normalize null to undefined for select dropdown binding
    this.editFeature = {
      code: feature.code,
      name: feature.name,
      description: feature.description || '',
      is_active: feature.is_active,
      default_enabled: feature.default_enabled,
      parent_id: feature.parent_id || undefined
    };
    this.showEditForm = true;
    this.error = null;
    this.cdr.markForCheck();
    console.log('Edit form opened with editFeature:', this.editFeature);
  }

  closeEditForm() {
    if (this.editingFeature) {
      return; // Prevent closing while updating
    }
    this.showEditForm = false;
    this.selectedFeature = null;
    this.error = null;
    this.editFeature = { 
      code: '', 
      name: '', 
      description: '',
      is_active: true,
      default_enabled: false 
    };
  }

  updateFeature() {
    if (!this.selectedFeature || !this.editFeature.code || !this.editFeature.name) {
      this.error = 'Code and name are required';
      return;
    }

    this.error = null;
    this.editingFeature = true;

    console.log('editFeature before update:', this.editFeature);
    
    const updateData: any = {
      name: this.editFeature.name,
      description: this.editFeature.description,
      is_active: this.editFeature.is_active,
      default_enabled: this.editFeature.default_enabled
    };
    
    // Always include parent_id to support both setting and clearing parent
    // undefined (no parent) → null in request, string → parent UUID
    updateData.parent_id = this.editFeature.parent_id === undefined ? null : this.editFeature.parent_id;
    
    console.log('Update payload being sent:', JSON.stringify(updateData, null, 2));

    this.featuresService.updateFeature(this.selectedFeature.id, updateData)
      .pipe(
        finalize(() => {
          this.editingFeature = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response: ApiResponse<{ feature: Feature }>) => {
          if (response.status && response.data?.feature) {
            // Update the feature in the list
            const index = this.features.findIndex(f => f.id === this.selectedFeature!.id);
            if (index !== -1) {
              this.features[index] = response.data.feature;
              this.filteredFeatures = [...this.features];
              this.buildFlattenedTree();
            }

            this.showEditForm = false;
            this.selectedFeature = null;
            this.successMessage = `✓ Feature "${response.data.feature.name}" updated successfully!`;
            
            setTimeout(() => {
              this.successMessage = null;
              this.cdr.markForCheck();
            }, 3000);
          } else {
            this.error = response.message || 'Failed to update feature';
          }
        },
        error: (error) => {
          this.error = error.error?.message || 'Failed to update feature';
          console.error('Error updating feature:', error);
        },
      });
  }

  deleteFeature(feature: Feature) {
    if (!confirm(`Are you sure you want to delete the feature "${feature.name}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    this.loading = true;
    this.featuresService.deleteFeature(feature.id)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response: ApiResponse<null>) => {
          if (response.status) {
            // Remove from features list
            this.features = this.features.filter(f => f.id !== feature.id);
            this.filteredFeatures = [...this.features];
            this.buildFlattenedTree();

            this.successMessage = `✓ Feature "${feature.name}" deleted successfully!`;
            
            setTimeout(() => {
              this.successMessage = null;
              this.cdr.markForCheck();
            }, 3000);
          } else {
            this.error = response.message || 'Failed to delete feature';
          }
        },
        error: (error) => {
          this.error = error.error?.message || 'Failed to delete feature';
          console.error('Error deleting feature:', error);
        },
      });
  }

  toggleFeatureActive(feature: Feature) {
    // Placeholder for future implementation
    // This would call an API to activate/deactivate the feature
    console.log('Toggle feature active state:', feature);
    // For now, the toggle is disabled in the UI
  }

  // Tree View Methods
  buildFlattenedTree() {
    const tree = this.buildFeatureTreeStructure(this.filteredFeatures);
    this.flattenedTreeFeatures = this.flattenTree(tree, 0);
    this.cdr.markForCheck();
  }

  buildFeatureTreeStructure(features: Feature[]): any[] {
    const featureMap = new Map<string, any>();
    const rootFeatures: any[] = [];

    // First pass: create all nodes
    features.forEach((feature) => {
      featureMap.set(feature.id, {
        ...feature,
        children: [],
      });
    });

    // Second pass: build parent-child relationships
    features.forEach((feature) => {
      const node = featureMap.get(feature.id);
      if (feature.parent_id && featureMap.has(feature.parent_id)) {
        const parent = featureMap.get(feature.parent_id);
        parent.children.push(node);
      } else {
        rootFeatures.push(node);
      }
    });

    return rootFeatures;
  }

  flattenTree(tree: any[], level: number): any[] {
    const result: any[] = [];

    tree.forEach((node) => {
      result.push({
        ...node,
        level: level,
        hasChildren: node.children && node.children.length > 0,
        isExpanded: this.expandedNodes.has(node.id),
      });

      // Only include children if the node is expanded
      if (node.children && node.children.length > 0 && this.expandedNodes.has(node.id)) {
        const childrenFlattened = this.flattenTree(node.children, level + 1);
        result.push(...childrenFlattened);
      }
    });

    return result;
  }

  toggleNode(featureId: string) {
    if (this.expandedNodes.has(featureId)) {
      this.expandedNodes.delete(featureId);
    } else {
      this.expandedNodes.add(featureId);
    }
    this.buildFlattenedTree();
  }

  expandAll() {
    this.features.forEach((feature) => {
      if (this.hasChildren(feature.id)) {
        this.expandedNodes.add(feature.id);
      }
    });
    this.buildFlattenedTree();
  }

  collapseAll() {
    this.expandedNodes.clear();
    this.buildFlattenedTree();
  }

  getIndentClass(level: number): string {
    return `indent-${level}`;
  }

  getTreeLineArray(count: number): number[] {
    return Array(count).fill(0).map((_, i) => i);
  }

  getUnassignedFeatures(tenantId: string): Feature[] {
    if (!tenantId || !this.tenantFeatures[tenantId]) {
      return this.features;
    }
    
    const assignedFeatureIds = new Set(
      this.tenantFeatures[tenantId]
        .filter(tf => tf.id) // Only features with tenant_features.id (actually assigned)
        .map(tf => tf.feature_id)
    );
    
    return this.features.filter(f => !assignedFeatureIds.has(f.id));
  }

  getAssignedFeatures(tenantId: string): TenantFeature[] {
    if (!tenantId || !this.tenantFeatures[tenantId]) {
      return [];
    }
    
    // Only return features that have an id (meaning they exist in tenant_features table)
    return this.tenantFeatures[tenantId].filter(tf => tf.id);
  }

  getFeatureChildren(featureId: string): Feature[] {
    return this.features.filter(f => f.parent_id === featureId);
  }

  getAllDescendants(featureId: string): Feature[] {
    const children = this.getFeatureChildren(featureId);
    const descendants: Feature[] = [...children];
    
    children.forEach(child => {
      const grandchildren = this.getAllDescendants(child.id);
      descendants.push(...grandchildren);
    });
    
    return descendants;
  }

  assignFeatureToTenant() {
    if (!this.selectedTenantId || !this.selectedFeatureToAssign) {
      return;
    }

    this.assigningFeature = true;
    this.error = null;

    const featureToAssign = this.selectedFeatureToAssign;
    const tenantId = this.selectedTenantId;
    
    // Get all children features
    const children = this.getAllDescendants(featureToAssign.id);
    const totalFeatures = 1 + children.length;
    
    // Create array of assignment observables (parent + all children)
    const assignments = [
      this.featuresService.enableFeatureForTenant(tenantId, featureToAssign.id),
      ...children.map(child => 
        this.featuresService.enableFeatureForTenant(tenantId, child.id)
      )
    ];

    // Execute all assignments in parallel
    forkJoin(assignments)
      .pipe(
        finalize(() => {
          this.assigningFeature = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (responses) => {
          const successCount = responses.filter(r => r.status).length;
          
          if (successCount === totalFeatures) {
            const childrenMsg = children.length > 0 
              ? ` and ${children.length} child feature(s)` 
              : '';
            this.successMessage = `✓ Feature "${featureToAssign.name}"${childrenMsg} assigned to ${this.getTenantName(tenantId)} successfully!`;
          } else {
            this.successMessage = `⚠️ Partially assigned: ${successCount}/${totalFeatures} features assigned successfully`;
          }
          
          // Reload tenant features to show the newly assigned features
          this.loadTenantFeatures(tenantId);
          
          // Reset selection
          this.selectedFeatureToAssign = null;
          
          setTimeout(() => {
            this.successMessage = null;
            this.cdr.markForCheck();
          }, 5000);
        },
        error: (error) => {
          this.error = error.error?.message || 'Failed to assign feature to tenant';
          console.error('Error assigning features:', error);
          
          setTimeout(() => {
            this.error = null;
            this.cdr.markForCheck();
          }, 5000);
        },
      });
  }}