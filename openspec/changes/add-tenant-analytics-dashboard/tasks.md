# Implementation Tasks: Tenant Analytics Dashboard

## Phase 1: Database Schema (Week 1)

### Task 1.1: Create Product Categories
- [ ] Create `product_categories` table
- [ ] Add migration script
- [ ] Add `category_id` to products table
- [ ] Add foreign key constraints
- [ ] Seed with default categories

### Task 1.2: Enhance Coupon Batches
- [ ] Add `dealer_name` column to batches
- [ ] Add `zone` column to batches
- [ ] Add `serial_number_start` column
- [ ] Add `serial_number_end` column
- [ ] Update existing batch creation logic

### Task 1.3: Create Reward Campaigns Table
- [ ] Create `reward_campaigns` table
- [ ] Add JSONB column for custom variations
- [ ] Add status enum
- [ ] Add date range validation
- [ ] Create indexes

### Task 1.4: Enhance Scan History
- [ ] Add `latitude` column
- [ ] Add `longitude` column
- [ ] Add `location_address` column
- [ ] Add `customer_city` column (if not exists)
- [ ] Add `customer_state` column (if not exists)
- [ ] Create spatial indexes

### Task 1.5: Create Analytics Cache
- [ ] Create `customer_analytics_cache` table
- [ ] Add indexes for performance
- [ ] Create update trigger/function
- [ ] Add background job for cache refresh

## Phase 2: Backend APIs - Analytics (Week 2-3)

### Task 2.1: Overview Dashboard API
- [ ] Create `/api/tenant/analytics/overview` endpoint
- [ ] Implement time range filters
- [ ] Calculate total scans
- [ ] Calculate unique users
- [ ] Calculate repeat users
- [ ] Calculate product scans
- [ ] Add response caching
- [ ] Write unit tests

### Task 2.2: Scan Trends API
- [ ] Create `/api/tenant/analytics/scan-trends` endpoint
- [ ] Query daily scan aggregates
- [ ] Group by date
- [ ] Calculate unique users per day
- [ ] Add response caching
- [ ] Write unit tests

### Task 2.3: Top Cities API
- [ ] Create `/api/tenant/analytics/top-cities` endpoint
- [ ] Aggregate scans by city
- [ ] Calculate percentages
- [ ] Sort by scan count
- [ ] Limit to top N cities
- [ ] Write unit tests

### Task 2.4: Enhanced Scan History API
- [ ] Update `/api/tenant/analytics/scan-history` endpoint
- [ ] Add city filter
- [ ] Add state filter
- [ ] Add batch filter
- [ ] Add product filter
- [ ] Add date range filter
- [ ] Implement pagination
- [ ] Add sorting options
- [ ] Write unit tests

### Task 2.5: Excel Export
- [ ] Install xlsx library
- [ ] Create export service
- [ ] Format data for Excel
- [ ] Add all filter support
- [ ] Set proper headers
- [ ] Handle large datasets (streaming)
- [ ] Add filename with date
- [ ] Write integration tests

### Task 2.6: Customer Analytics API
- [ ] Create `/api/tenant/analytics/customers` endpoint
- [ ] Query customer performance metrics
- [ ] Join with analytics cache
- [ ] Add sorting options
- [ ] Implement pagination
- [ ] Create customer detail endpoint
- [ ] Calculate derived metrics
- [ ] Write unit tests

### Task 2.7: Scan Map API
- [ ] Install PostGIS extension
- [ ] Create `/api/tenant/analytics/scan-map` endpoint
- [ ] Query scans with lat/long
- [ ] Filter by bounds (viewport)
- [ ] Filter by zoom level
- [ ] Add date range filter
- [ ] Optimize for large datasets
- [ ] Return GeoJSON format
- [ ] Write unit tests

## Phase 3: Backend APIs - Complete Coupon Workflow (Week 3-4)

### Task 3.1: Product Categories CRUD
- [ ] Create POST `/api/tenant/categories` endpoint
- [ ] Create GET `/api/tenant/categories` endpoint
- [ ] Create PUT `/api/tenant/categories/:id` endpoint
- [ ] Create DELETE `/api/tenant/categories/:id` endpoint
- [ ] Add validation
- [ ] Prevent delete if products exist
- [ ] Write unit tests

### Task 3.2: Enhanced Product Creation
- [ ] Update POST `/api/tenant/products` endpoint
- [ ] Add `category_id` field
- [ ] Add image upload support (S3/local storage)
- [ ] Generate image thumbnails
- [ ] Validate category exists
- [ ] Update product list to show category
- [ ] Add product status field
- [ ] Write unit tests

### Task 3.3: Batch Creation (Draft Status)
- [ ] Create POST `/api/tenant/products/:product_id/batches` endpoint
- [ ] Add `batch_name`, `dealer_name`, `zone` fields
- [ ] Set initial status to 'draft'
- [ ] Validate product exists
- [ ] Create batch record
- [ ] Return batch ID for next step
- [ ] Write unit tests

### Task 3.4: Serial Number Assignment
- [ ] Create `serial_number_tracker` table
- [ ] Initialize tracker for each tenant (start: 30000)
- [ ] Create POST `/api/tenant/batches/:id/assign-codes` endpoint
- [ ] Lock tracker row for update (prevent race condition)
- [ ] Get next available serial range
- [ ] Generate coupon codes with serial numbers
- [ ] Insert coupon records in batch
- [ ] Update batch with serial_number_start/end
- [ ] Change batch status to 'code_assigned'
- [ ] Update tracker with new last serial number
- [ ] Write unit tests

### Task 3.5: Batch Activation
- [ ] Create POST `/api/tenant/batches/:id/activate` endpoint
- [ ] Validate batch has codes assigned
- [ ] Validate batch is in 'code_assigned' status
- [ ] Update all coupons in batch:
  - Set status to 'printed'
  - Set printed_at timestamp
- [ ] Update batch:
  - Set status to 'activated'
  - Set activated_at timestamp
  - Save activation_note
- [ ] Write unit tests

### Task 3.6: Batch Management Endpoints
- [ ] Create GET `/api/tenant/batches` endpoint (list with filters)
- [ ] Create GET `/api/tenant/batches/:id` endpoint (detail view)
- [ ] Add filter by status, product, dealer, zone
- [ ] Add pagination and sorting
- [ ] Return batch with coupon counts
- [ ] Write unit tests

### Task 3.7: Reward Campaign Creation (Common Type)
- [ ] Create POST `/api/tenant/rewards/campaigns` endpoint
- [ ] Validate batch is in 'activated' status
- [ ] Validate date range (start < end)
- [ ] For common type:
  - Validate reward amount > 0
  - Update all coupons with same reward_amount
  - Set coupon status to 'active'
  - Set coupon expiry_date
- [ ] Create campaign record
- [ ] Update batch status to 'live'
- [ ] Write unit tests

### Task 3.8: Reward Campaign Creation (Custom Type)
- [ ] For custom type:
  - Validate variations array
  - Validate sum of quantities = batch total
  - Validate all amounts > 0
  - Create reward pool array
  - Shuffle for random distribution
  - Assign rewards to coupons
  - Update coupon records
  - Set status to 'active'
- [ ] Store custom_variations in campaign JSONB
- [ ] Calculate distribution percentages
- [ ] Write unit tests
- [ ] Test with large batches (10K+ coupons)

### Task 3.9: Reward Campaign Management
- [ ] Create GET `/api/tenant/rewards/campaigns` endpoint
- [ ] Create GET `/api/tenant/rewards/campaigns/:id` endpoint
- [ ] Show campaign statistics:
  - Total coupons
  - Scanned count
  - Remaining count
  - Total reward distributed
  - Total reward pending
- [ ] Add campaign filtering
- [ ] Write unit tests

## Phase 4: Frontend - Analytics Dashboard (Week 4-5)

### Task 4.1: Overview Dashboard Component
- [ ] Create `OverviewDashboard` component
- [ ] Add metric cards
- [ ] Add time range selector
- [ ] Add custom date picker
- [ ] Connect to API
- [ ] Add loading states
- [ ] Add error handling
- [ ] Style with Tailwind

### Task 4.2: Scan Trends Component
- [ ] Create `ScanTrends` component
- [ ] Install Chart.js
- [ ] Create line chart for daily trends
- [ ] Create bar chart for top cities
- [ ] Connect to API
- [ ] Add tooltips
- [ ] Style charts

### Task 4.3: Enhanced Scan History Component
- [ ] Update `ScanHistory` component
- [ ] Add city filter dropdown
- [ ] Add state filter dropdown
- [ ] Add batch filter dropdown
- [ ] Add product filter dropdown
- [ ] Add date range picker
- [ ] Add Excel export button
- [ ] Add table with all new columns
- [ ] Implement pagination
- [ ] Add sorting

### Task 4.4: Customer Analytics Component
- [ ] Create `CustomerAnalytics` component
- [ ] Create customer list table
- [ ] Add sorting controls
- [ ] Add customer detail modal
- [ ] Show performance metrics
- [ ] Show reward history timeline
- [ ] Connect to API
- [ ] Add pagination

### Task 4.5: Scan Map View Component
- [ ] Create `ScanMapView` component
- [ ] Install Leaflet or Google Maps
- [ ] Initialize map with center
- [ ] Add zoom controls
- [ ] Add heat map layer
- [ ] Add marker clustering
- [ ] Add click handlers for markers
- [ ] Create scan detail popup
- [ ] Add date range filter
- [ ] Optimize marker rendering
- [ ] Add legeComplete Batch Creation Workflow UI
- [ ] Create multi-step batch wizard
- [ ] **Step 1: Create Batch**
  - [ ] Product selection dropdown
  - [ ] Batch name input
  - [ ] Dealer name input
  - [ ] Zone input
  - [ ] Submit creates batch in 'draft' status
- [ ] **Step 2: Assign Codes**
  - [ ] Show batch details
  - [ ] Quantity input (number of coupons)
  - [ ] Show next available serial number
  - [ ] Preview: "Serial numbers XXXXX to YYYYY"
  - [ ] Submit generates coupons
  - [ ] Show success with serial range
- [ ] **Step 3: Activate Batch**
  - [ ] Show batch summary
  - [ ] Confirm coupons printed
  - [ ] Optional activation note
  - [ ] Submit activates batch
  - [ ] Show "Batch activated successfully"
- [ ] Add progress indicator for each step
- [ ] Add validation for each step
- [ ] Connect to all APIs

### Task 5.4: Reward Campaign Creation UI
- [ ] Create `RewardCampaignForm` component
- [ ] **Step 1: Select Batch**
  - [ ] Dropdown showing only 'activated' batches
  - [ ] Show batch details (product, total coupons, dealer)
- [ ] **Step 2: Campaign Details**
  - [ ] Campaign name input
  - [ ] Start date picker
  - [ ] End date picker (must be after start)
- [ ] **Step 3: Reward Type Selection**
  - [ ] Radio buttons: Common / Custom
  - [ ] Show explanation for each type
- [ ] **Step 4A: Common Reward**
  - [ ] Reward amount input (₹)
  - [ ] Preview: "All X coupons will get ₹Y"
  - [ ] Calculate total reward value
- [ ] **Step 4B: Custom Reward**
  - [ ] Number of variations input (1-10)
  - [ ] For each variation:
    - [ ] Amount input (₹)
    - [ ] Quantity input (number)
    - [ ] Show percentage auto-calculated
  - [ ] Running total display
  - [ ] Validation: total must equal batch total
  - [ ] Visual distribution preview (pie chart)
  - [ ] Show error if quantities don't sum correctly
- [ ] **Step 5: Review & Submit**
  - [ ] Show complete summary
  - [ ] Show distribution breakdown
  - [ ] Calculate total reward budget
  - [ ] Confirm button
- [ ] Connect to campaign creation API
- [ ] Show success message with campaign ID
- [ ] Redirect to campaign listomponent
- [ ] Add dealer name field
- [ ] Add zone field
- [ ] Add serial number range section
- [ ] Show available ranges
- [ ] Add quantity calculator
- [ ] Update validation
- [ ] Connect to API

### Task 5.4: Reward Campaign Creation
- [ ] Create `RewardCampaignForm` component
- [ ] Add campaign name field
- [ ] Add date range pickers
- [ ] Add reward type selector (Common/Custom)
- [ ] For Common: single amount input
- [ ] For Custom: variation builder
  - [ ] Number of variations input
  - [ ] Amount + Quantity inputs for each
  - [ ] Auto-calculate percentages
  - [ ] Validate total = batch total
- [ ] Add submit button
- [ ] Connect to API
- [ ] Show success message

### Ta**Create E2E test for complete coupon workflow:**
  - [ ] Create category
  - [ ] Create product with image
  - [ ] Create batch (draft)
  - [ ] Assign codes (1000 coupons)
  - [ ] Verify serial numbers assigned
  - [ ] Activate batch
  - [ ] Create common reward campaign
  - [ ] Verify coupons are active
- [ ] **Create E2E test for custom reward distribution:**
  - [ ] Create batch with 100 coupons
  - [ ] Activate batch
  - [ ] Create custom campaign (₹5/50, ₹10/30, ₹50/20)
  - [ ] Verify reward distribution is correct
  - [ ] Verify no coupon has zero reward
- [ ] Create `CampaignList` component
- [ ] Show campaign cards/table
- [ ] Add status badges
- [ ] Add edit/delete actions
- [ ] Create campaign detail view
- [ ] Show reward distribution chart
- [ ] Connect to APIs

## Phase 6: Testing & Optimization (Week 6-7)

### Task 6.1: Backend Testing
- [ ] Write unit tests for all analytics APIs
- [ ] Write unit tests for reward campaign logic
- [ ] Write integration tests for Excel export
- [ ] Write integration tests for map API
- [ ] Test with large datasets (>100K scans)
- [ ] Performance testing
- [ ] Fix any issues

### Task 6.2: Frontend Testing
- [ ] Write component tests for analytics
- [ ] Write component tests for reward forms
- [ ] Test map rendering with many markers
- [ ] Test Excel export download
- [ ] Test filter combinations
- [ ] Fix UI bugs

### Task 6.3: E2E Testing
- [ ] Create E2E test for overview dashboard
- [ ] Create E2E test for scan history filters
- [ ] Create E2E test for Excel export
- [ ] Create E2E test for customer analytics
- [ ] Create E2E test for map view
- [ ] Create E2E test for category creation
- [ ] Create E2E test for reward campaign flow
- [ ] Run full regression suite

### Task 6.4: Performance Optimization
- [ ] Implement response caching
- [ ] Add database query optimization
- [ ] Add indexes where needed
- [ ] Implement pagination everywhere
- [ ] Optimize map marker rendering
- [ ] Add lazy loading
- [ ] Compress API responses
- [ ] Measure and improve load times

### Task 6.5: Documentation
- [ ] Update API documentation
- [ ] Create user guide for analytics
- [ ] Create user guide for reward campaigns
- [ ] Document Excel export format
- [ ] Document map features
- [ ] Update tenant admin manual

## Phase 7: Deployment (Week 7)

### Task 7.1: Database Migration
- [ ] Review all migration scripts
- [ ] Test migrations on staging
- [ ] Create rollback scripts
- [ ] Run migrations on production

### Task 7.2: Backend Deployment
- [ ] Deploy updated backend APIs
- [ ] Verify API endpoints
- [ ] Monitor error logs
- [ ] Test critical flows

### Task 7.3: Frontend Deployment
- [ ] Build production frontend
- [ ] Deploy to CDN/hosting
- [ ] Clear cache
- [ ] Verify all pages load

### Task 7.4: Post-Deployment
- [ ] Run smoke tests
- [ ] Monitor performance metrics
- [ ] Monitor error rates
- [ ] Gather user feedback
- [ ] Create bug fix backlog

## Total Tasks: 120+
## Estimated Effort: 7 weeks
