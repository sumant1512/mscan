# Design: Tenant Analytics Dashboard

## 1. Overview Dashboard

### Metrics Displayed
```typescript
interface OverviewMetrics {
  total_scans: number;
  unique_users: number;
  repeat_users: number;
  product_scans: number;
  timeframe: 'past_7_days' | 'past_30_days' | 'custom' | 'all_time';
  custom_start_date?: string;
  custom_end_date?: string;
}
```

### API Endpoint
```
GET /api/tenant/analytics/overview?timeframe=past_30_days&start_date=2025-01-01&end_date=2025-12-31
```

### UI Components
- Metric cards with trend indicators
- Time range selector dropdown
- Custom date range picker

## 2. Scan Trends

### Daily Scan Trend
```typescript
interface ScanTrendData {
  date: string;
  scan_count: number;
  unique_users: number;
}
```

### Top Cities
```typescript
interface TopCity {
  city: string;
  state: string;
  scan_count: number;
  percentage: number;
}
```

### API Endpoints
```
GET /api/tenant/analytics/scan-trends?timeframe=past_30_days
GET /api/tenant/analytics/top-cities?limit=10&timeframe=past_30_days
```

### UI Components
- Line chart for daily trends
- Bar chart or table for top 10 cities
- Exportable data

## 3. Scan History (Enhanced)

### Scan History Record
```typescript
interface ScanHistoryRecord {
  id: string;
  coupon_code: string;
  coupon_reference: string;
  product_name: string;
  category_name: string;
  customer_mobile: string;
  customer_name: string;
  customer_city: string;
  customer_state: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  scanned_at: string;
  reward_amount?: number;
  batch_id?: string;
  dealer_name?: string;
  zone?: string;
}
```

### API Endpoint
```
GET /api/tenant/analytics/scan-history?
  page=1&
  limit=50&
  city=Delhi&
  state=Delhi&
  batch_id=xxx&
  product_id=yyy&
  start_date=2025-01-01&
  end_date=2025-12-31&
  export=xlsx
```

### Filters
- City-wise (dropdown with autocomplete)
- State-wise (dropdown)
- Batch-wise (dropdown)
- Product-wise (dropdown)
- Date range

### Excel Export
- Headers: Coupon Code, Product, Customer Mobile, Name, City, State, Location, Scanned Date, Reward
- File name: `scan_history_YYYY-MM-DD.xlsx`
- Max 100,000 rows per export

## 4. Customer Analytics

### Customer Performance
```typescript
interface CustomerPerformance {
  customer_id: string;
  mobile: string;
  name: string;
  total_products_purchased: number;
  total_codes_redeemed: number;
  total_rewards_won: number;
  first_scan_location: string;
  member_since: string;
  last_scan_date: string;
  favorite_product?: string;
  avg_reward_per_scan: number;
}
```

### API Endpoint
```
GET /api/tenant/analytics/customers?sort_by=total_rewards_won&order=desc&page=1&limit=50
GET /api/tenant/analytics/customers/:customer_id
```

### UI Components
- Customer list table with sorting
- Customer detail modal/page
- Reward history timeline

## 5. Scan Map View

### Geographic Data
```typescript
interface ScanMapData {
  coordinates: [number, number]; // [latitude, longitude]
  scan_count: number;
  customer_name: string;
  customer_mobile: string;
  city: string;
  state: string;
  product_name: string;
  scanned_at: string;
}
```

### API Endpoint
```
GET /api/tenant/analytics/scan-map?
  bounds=top,left,bottom,right&
  zoom_level=5&
  start_date=2025-01-01&
  end_date=2025-12-31
```

### Map Features
- Heat map overlay for scan density
- Red dots for individual scans
- Click on dot to show scan details popup
- Zoom in/out for drill-down
- Empty area identification (white/light areas)
- Filter by date range

### UI Components
- Interactive map (Leaflet/Google Maps)
- Zoom controls
- Legend
- Scan detail popup
- Area coverage statistics

## 6. Complete Coupon Creation Workflow

### Step 1: Create Category
```typescript
interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  product_count: number;
}
```

**API Endpoint**
```
POST /api/tenant/categories
{
  "name": "Construction Chemical",
  "description": "Building materials category"
}
```

### Step 2: Create Product Under Category
```typescript
interface Product {
  id: string;
  name: string;
  category_id: string;
  category_name: string;
  image_url?: string;
  description?: string;
  created_at: string;
  status: 'active' | 'inactive';
}
```

**API Endpoint**
```
POST /api/tenant/products
{
  "name": "Super Cement",
  "category_id": "uuid",
  "description": "Premium quality cement",
  "image": "base64_or_file_upload"
}
```

### Step 3: Create Batch for Product
```typescript
interface CouponBatch {
  id: string;
  product_id: string;
  batch_name: string;
  dealer_name: string;
  zone: string;
  total_coupons: number;
  status: 'draft' | 'code_assigned' | 'activated' | 'completed';
  created_at: string;
}
```

**API Endpoint**
```
POST /api/tenant/products/:product_id/batches
{
  "batch_name": "Dealer A - North Zone",
  "dealer_name": "Dealer A",
  "zone": "North Zone",
  "total_coupons": 1000
}

Response:
{
  "success": true,
  "batch": {
    "id": "batch-uuid",
    "status": "draft",
    "message": "Batch created successfully. Assign codes to activate."
  }
}
```

### Step 4: Assign Serial Numbers to Batch
```typescript
interface SerialNumberAssignment {
  batch_id: string;
  quantity: number;
  serial_number_start: number;
  serial_number_end: number;
}
```

**API Endpoint**
```
POST /api/tenant/batches/:batch_id/assign-codes
{
  "quantity": 1000
}

Response:
{
  "success": true,
  "serial_number_start": 31001,
  "serial_number_end": 32000,
  "message": "Serial numbers 31001 to 32000 assigned successfully",
  "coupons_generated": 1000,
  "batch_status": "code_assigned"
}
```

**Logic:**
- System finds next available serial number range
- Generates coupon codes with serial numbers
- Updates batch with serial number range
- Creates coupon records in database
- Changes batch status to 'code_assigned'

### Step 5: Activate Batch (Print Ready)
```typescript
interface BatchActivation {
  batch_id: string;
  activation_note?: string;
}
```

**API Endpoint**
```
POST /api/tenant/batches/:batch_id/activate
{
  "note": "Printed and ready for distribution"
}

Response:
{
  "success": true,
  "message": "Batch activated successfully",
  "batch_status": "activated",
  "total_coupons": 1000,
  "activated_at": "2025-12-01T10:30:00Z"
}
```

**Logic:**
- Validates batch has codes assigned
- Changes batch status to 'activated'
- Updates all coupons in batch to 'printed' status
- Records activation timestamp
- Now ready for reward assignment

### Step 6: Create Reward Campaign on Activated Batch

#### Option A: Common Reward (Same for All)
```typescript
interface CommonRewardCampaign {
  batch_id: string;
  campaign_name: string;
  start_date: string;
  end_date: string;
  reward_type: 'common';
  reward_amount: number;
}
```

**API Endpoint**
```
POST /api/tenant/rewards/campaigns
{
  "batch_id": "batch-uuid",
  "campaign_name": "December Rewards",
  "start_date": "2025-12-01",
  "end_date": "2026-12-01",
  "reward_type": "common",
  "reward_amount": 10,
  "apply_to_all_coupons": true
}

Response:
{
  "success": true,
  "message": "Common reward ₹10 assigned to all 1000 coupons",
  "campaign_id": "campaign-uuid",
  "total_coupons": 1000,
  "total_reward_value": 10000
}
```

#### Option B: Custom Reward (Variation Distribution)
```typescript
interface CustomRewardCampaign {
  batch_id: string;
  campaign_name: string;
  start_date: string;
  end_date: string;
  reward_type: 'custom';
  variations: RewardVariation[];
}

interface RewardVariation {
  amount: number;
  quantity: number;
}
```

**API Endpoint**
```
POST /api/tenant/rewards/campaigns
{
  "batch_id": "batch-uuid",
  "campaign_name": "December Custom Rewards",
  "start_date": "2025-12-01",
  "end_date": "2026-12-01",
  "reward_type": "custom",
  "variations": [
    { "amount": 5, "quantity": 700 },
    { "amount": 10, "quantity": 150 },
    { "amount": 50, "quantity": 150 }
  ]
}

Response:
{
  "success": true,
  "message": "Custom rewards assigned to 1000 coupons",
  "campaign_id": "campaign-uuid",
  "distribution": [
    { "amount": 5, "quantity": 700, "percentage": "70%" },
    { "amount": 10, "quantity": 150, "percentage": "15%" },
    { "amount": 50, "quantity": 150, "percentage": "15%" }
  ],
  "total_reward_value": 13000
}
```

**Validation:**
- Sum of variation quantities must equal batch total_coupons
- All amounts must be positive
- Start date must be before end date
- Batch must be in 'activated' status

**Logic:**
- Randomly assigns reward amounts to coupons based on distribution
- Updates each coupon record with reward_amount
- Creates campaign record
- Links all coupons to campaign

### Step 7: Coupon Ready for Scanning
After reward assignment, coupons are fully ready:
```typescript
interface ReadyCoupon {
  id: string;
  coupon_code: string;
  serial_number: number;
  product_id: string;
  batch_id: string;
  campaign_id: string;
  reward_amount: number;
  status: 'active';
  expiry_date: string;
  can_be_scanned: true;
}
```

### Complete Workflow Summary
```
1. Create Category → "Construction Chemical"
2. Create Product → "Super Cement" (with image)
3. Create Batch → "Dealer A - North Zone"
4. Assign Codes → Serial 31001-32000 (1000 coupons)
5. Activate Batch → Mark as printed and ready
6. Create Reward → Custom: ₹5(700) + ₹10(150) + ₹50(150)
7. Coupons Active → Ready for customer scanning
```

## 7. Enhanced Batch Management

### Batch Status Lifecycle
```typescript
type BatchStatus = 
  | 'draft'          // Just created, no codes assigned
  | 'code_assigned'  // Serial numbers assigned, coupons generated
  | 'activated'      // Printed and ready for distribution
  | 'live'           // Rewards assigned, scanning enabled
  | 'completed';     // All coupons used or expired

interface CouponBatch {
  id: string;
  product_id: string;
  product_name: string;
  batch_name: string;
  dealer_name: string;
  zone: string;
  serial_number_start: number;
  serial_number_end: number;
  total_coupons: number;
  assigned_coupons: number;
  activated_coupons: number;
  scanned_coupons: number;
  status: BatchStatus;
  activated_at?: string;
  created_at: string;
  updated_at: string;
}
```

### Coupon Record Structure
```typescript
interface Coupon {
  id: string;
  coupon_code: string; // Generated unique code
  serial_number: number; // Sequential number
  product_id: string;
  batch_id: string;
  campaign_id?: string;
  reward_amount: number;
  status: 'generated' | 'printed' | 'active' | 'scanned' | 'expired';
  expiry_date: string;
  printed_at?: string;
  scanned_at?: string;
  scanned_by?: string; // customer_id
  created_at: string;
}
```

### Batch Actions API
```
POST   /api/tenant/batches                    - Create batch
POST   /api/tenant/batches/:id/assign-codes   - Assign serial numbers
POST   /api/tenant/batches/:id/activate       - Mark as printed/activated
GET    /api/tenant/batches/:id                - Get batch details
GET    /api/tenant/batches                    - List all batches
PUT    /api/tenant/batches/:id                - Update batch info
DELETE /api/tenant/batches/:id                - Delete (only if draft)
```

## 8. Advanced Reward Planning

### Reward Types
```typescript
type RewardType = 'common' | 'custom';

interface CommonReward {
  type: 'common';
  amount: number;
  applicable_to: 'all'; // All coupons in batch
}

interface CustomReward {
  type: 'custom';
  variations: RewardVariation[];
}

interface RewardVariation {
  amount: number;
  quantity: number; // Number of coupons with this reward
  percentage?: number; // Auto-calculated
}
```

### Reward Campaign
```typescript
interface RewardCampaign {
  id: string;
  batch_id: string;
  name: string;
  start_date: string;
  end_date: string;
  reward_type: RewardType;
  common_amount?: number;
  custom_variations?: RewardVariation[];
  total_coupons: number;
  status: 'active' | 'scheduled' | 'expired';
}
```

### Example: Custom Reward Distribution
```javascript
// 1000 coupons:
// - 700 coupons with ₹5 reward (70%)
// - 150 coupons with ₹10 reward (15%)
// - 150 coupons with ₹50 reward (15%)

{
  type: 'custom',
  variations: [
    { amount: 5, quantity: 700 },
    { amount: 10, quantity: 150 },
    { amount: 50, quantity: 150 }
  ]
}
```

### API Endpoints
```
POST /api/tenant/rewards/campaigns
GET /api/tenant/rewards/campaigns/:campaign_id
PUT /api/tenant/rewards/campaigns/:campaign_id
```

### UI Flow
1. Select batch
2. Choose reward type (Common/Custom)
3. If Common: Enter single amount
4. If Custom: 
   - Enter number of variations
   - For each variation: amount + quantity
   - System validates total = batch total
5. Set start/end dates
6. Submit campaign

## Database Schema Updates

### New Tables

```sql
-- Product Categories
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update products table
ALTER TABLE products ADD COLUMN category_id UUID REFERENCES product_categories(id);

-- Batch enhancements
ALTER TABLE coupon_batches ADD COLUMN dealer_name VARCHAR(255);
ALTER TABLE coupon_batches ADD COLUMN zone VARCHAR(100);
ALTER TABLE coupon_batches ADD COLUMN serial_number_start INTEGER;
ALTER TABLE coupon_batches ADD COLUMN serial_number_end INTEGER;
ALTER TABLE coupon_batches ADD COLUMN status VARCHAR(50) DEFAULT 'draft';
ALTER TABLE coupon_batches ADD COLUMN activated_at TIMESTAMP;
ALTER TABLE coupon_batches ADD COLUMN activation_note TEXT;

-- Coupon table enhancements
ALTER TABLE coupons ADD COLUMN serial_number INTEGER;
ALTER TABLE coupons ADD COLUMN campaign_id UUID REFERENCES reward_campaigns(id);
ALTER TABLE coupons ADD COLUMN reward_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE coupons ADD COLUMN status VARCHAR(50) DEFAULT 'generated';
ALTER TABLE coupons ADD COLUMN printed_at TIMESTAMP;
ALTER TABLE coupons ADD COLUMN expiry_date TIMESTAMP;

-- Serial number tracker (to avoid overlaps)
CREATE TABLE serial_number_tracker (
  tenant_id UUID REFERENCES tenants(id),
  last_serial_number INTEGER DEFAULT 30000,
  PRIMARY KEY (tenant_id)
);

-- Batch status enum
CREATE TYPE batch_status AS ENUM ('draft', 'code_assigned', 'activated', 'live', 'completed');
ALTER TABLE coupon_batches ALTER COLUMN status TYPE batch_status USING status::batch_status;

-- Reward Campaigns
CREATE TABLE reward_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES coupon_batches(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  reward_type VARCHAR(50) CHECK (reward_type IN ('common', 'custom')),
  common_amount DECIMAL(10,2),
  custom_variations JSONB, -- Store variation array
  status VARCHAR(50) DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scan location enhancement
ALTER TABLE scan_history ADD COLUMN latitude DECIMAL(10,7);
ALTER TABLE scan_history ADD COLUMN longitude DECIMAL(10,7);
ALTER TABLE scan_history ADD COLUMN location_address TEXT;

-- Customer analytics cache
CREATE TABLE customer_analytics_cache (
  customer_id UUID PRIMARY KEY REFERENCES customers(id),
  tenant_id UUID REFERENCES tenants(id),
  total_products_purchased INTEGER DEFAULT 0,
  total_codes_redeemed INTEGER DEFAULT 0,
  total_rewards_won DECIMAL(10,2) DEFAULT 0,
  first_scan_location VARCHAR(255),
  last_scan_date TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_scan_history_tenant_date ON scan_history(tenant_id, scanned_at);
CREATE INDEX idx_scan_history_location ON scan_history(tenant_id, latitude, longitude);
CREATE INDEX idx_scan_history_city ON scan_history(tenant_id, customer_city);
CREATE INDEX idx_customer_analytics_tenant ON customer_analytics_cache(tenant_id);
```

## Performance Considerations

### Caching Strategy
- Cache overview metrics for 5 minutes
- Cache top cities for 15 minutes
- Real-time data for scan history (paginated)
- Pre-aggregate daily scan trends (background job)

### Database Optimization
- Partition scan_history by month
- Use PostGIS for geographic queries
- Implement pagination for all list endpoints
- Limit Excel exports to 100K rows

### Frontend Optimization
- Lazy load map markers (show only visible bounds)
- Virtual scrolling for large lists
- Debounce filter inputs
- Progressive data loading for charts

## Security
- All endpoints require tenant authentication
- Tenant can only access their own data
- Rate limiting on export endpoints
- Validate date ranges (max 1 year)
