# Design Decisions for Tenant Feature Flags

## Database Design

### Features Table

```sql
CREATE TABLE features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    default_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Tenant Features Table

```sql
CREATE TABLE tenant_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    enabled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    enabled_by UUID REFERENCES users(id),
    UNIQUE(tenant_id, feature_id)
);
```

## Service Layer Design

### Feature Service

- `createFeature(data)` — Create new feature definition
- `getFeatures()` — List all features
- `updateFeature(id, data)` — Update feature
- `deleteFeature(id)` — Delete feature
- `enableFeatureForTenant(featureId, tenantId, userId)` — Enable feature
- `disableFeatureForTenant(featureId, tenantId)` — Disable feature
- `isFeatureEnabledForTenant(featureCode, tenantId)` — Check if enabled
- `getTenantFeatures(tenantId)` — List enabled features for tenant

## API Design

### Endpoints

- `POST /api/features` — Create feature (SUPER_ADMIN only)
- `GET /api/features` — List features
- `PUT /api/features/:id` — Update feature
- `DELETE /api/features/:id` — Delete feature
- `POST /api/tenants/:tenantId/features/:featureId` — Enable feature
- `DELETE /api/tenants/:tenantId/features/:featureId` — Disable feature
- `GET /api/tenants/:tenantId/features` — Get tenant features

## Usage Pattern

### In Code

```javascript
const featureService = require("./feature.service");

// Check if feature is enabled
if (
  await featureService.isFeatureEnabledForTenant("advanced-reporting", tenantId)
) {
  // Show advanced features
}
```

### Middleware

```javascript
const featureMiddleware = require("./feature.middleware");

router.get(
  "/advanced-endpoint",
  featureMiddleware.requireFeature("advanced-reporting"),
  handler,
);
```

## Security Considerations

- Only SUPER_ADMIN can manage features
- Feature checks are tenant-scoped
- Audit logging for feature enable/disable actions

## Performance Considerations

- Cache feature checks with short TTL
- Index on tenant_id, feature_id
- Avoid N+1 queries in feature checks</content>
  <parameter name="filePath">/Users/bhaskar/Product/mscan/openspec/changes/add-tenant-feature-flags/design.md
