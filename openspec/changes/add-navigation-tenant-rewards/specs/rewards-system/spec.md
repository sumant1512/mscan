## ADDED Requirements

### Requirement: Verification App Configuration
The system SHALL allow tenants to create and configure their verification applications with customizable settings.

#### Scenario: Create verification app configuration
- **WHEN** a tenant creates a new verification app configuration
- **WITH** app name, description, and business type
- **THEN** the system SHALL create a verification app record
- **AND** SHALL associate it with the tenant's account
- **AND** SHALL generate a unique app identifier
- **AND** SHALL set default scan settings
- **AND** SHALL return the created app configuration

#### Scenario: Configure app branding
- **WHEN** a tenant configures their verification app
- **THEN** the system SHALL allow setting app name and display name
- **AND** SHALL allow adding company logo URL
- **AND** SHALL allow setting brand colors (primary, secondary)
- **AND** SHALL allow setting welcome message for scan interface
- **AND** SHALL preview the branding before saving

#### Scenario: Configure scan behavior
- **WHEN** a tenant configures scan settings
- **THEN** the system SHALL allow enabling/disabling QR code scanning
- **AND** SHALL allow setting scan success message
- **AND** SHALL allow setting scan failure message
- **AND** SHALL allow configuring post-scan redirect URL
- **AND** SHALL allow enabling scan analytics tracking

#### Scenario: Update verification app configuration
- **WHEN** a tenant modifies their app configuration
- **THEN** the system SHALL update the app record
- **AND** SHALL maintain version history of changes
- **AND** SHALL apply changes immediately to scan interface
- **AND** SHALL log the modification with timestamp

#### Scenario: View verification app details
- **WHEN** a tenant views their verification app
- **THEN** the system SHALL display complete app configuration
- **AND** SHALL show total coupons created for this app
- **AND** SHALL show total scans performed
- **AND** SHALL show app creation date and last modified date
- **AND** SHALL provide edit and scan analytics options

### Requirement: Coupon Creation with Multiple Parameters
The system SHALL allow tenants to create coupons with various discount types, values, and constraints.

#### Scenario: Create percentage discount coupon
- **WHEN** a tenant creates a coupon with percentage discount
- **WITH** discount percentage (1-100%), expiry date, and usage limit
- **AND** with sufficient credit balance
- **THEN** the system SHALL create the coupon record
- **AND** SHALL generate a unique coupon code
- **AND** SHALL generate QR code for the coupon
- **AND** SHALL deduct calculated credits from tenant balance
- **AND** SHALL return coupon details with QR code URL

#### Scenario: Create fixed amount discount coupon
- **WHEN** a tenant creates a coupon with fixed amount discount
- **WITH** discount amount, currency, expiry date, and usage limit
- **AND** with sufficient credit balance
- **THEN** the system SHALL create the coupon record
- **AND** SHALL generate a unique coupon code
- **AND** SHALL generate QR code for the coupon
- **AND** SHALL deduct calculated credits from tenant balance
- **AND** SHALL return coupon details with QR code URL

#### Scenario: Create buy-X-get-Y coupon
- **WHEN** a tenant creates a buy-X-get-Y offer coupon
- **WITH** buy quantity, get quantity, applicable products, and constraints
- **AND** with sufficient credit balance
- **THEN** the system SHALL create the coupon record with offer details
- **AND** SHALL generate appropriate coupon code and QR
- **AND** SHALL deduct calculated credits
- **AND** SHALL validate product applicability rules

#### Scenario: Set coupon expiry date
- **WHEN** a tenant creates a coupon
- **THEN** the system SHALL require an expiry date
- **AND** SHALL validate expiry date is in the future (minimum 1 day ahead)
- **AND** SHALL allow maximum validity period (e.g., 1 year)
- **AND** SHALL automatically invalidate coupon after expiry

#### Scenario: Set coupon usage limits
- **WHEN** a tenant creates a coupon
- **THEN** the system SHALL allow setting total usage limit (e.g., 1000 uses)
- **AND** SHALL allow setting per-user usage limit (e.g., once per customer)
- **AND** SHALL allow unlimited usage if specified
- **AND** SHALL enforce limits during scan verification

#### Scenario: Set minimum purchase amount
- **WHEN** a tenant creates a coupon
- **THEN** the system SHALL allow setting minimum purchase amount
- **AND** SHALL validate during scan that purchase meets minimum
- **AND** SHALL reject coupon application if minimum not met

#### Scenario: Preview coupon before creation
- **WHEN** a tenant fills coupon creation form
- **BEFORE** final submission
- **THEN** the system SHALL display preview of the coupon
- **AND** SHALL show credit cost breakdown
- **AND** SHALL display generated QR code preview
- **AND** SHALL show all configured parameters
- **AND** SHALL allow going back to edit

### Requirement: Coupon Code and QR Generation
The system SHALL generate unique coupon codes and QR codes for each coupon.

#### Scenario: Generate unique coupon code
- **WHEN** a coupon is created
- **THEN** the system SHALL generate a unique alphanumeric code (8-12 characters)
- **AND** SHALL ensure code uniqueness across all tenants
- **AND** SHALL make code readable (exclude confusing characters like O, 0, I, l)
- **AND** SHALL include tenant prefix for identification (optional)

#### Scenario: Generate QR code for coupon
- **WHEN** a coupon is created
- **THEN** the system SHALL generate a QR code encoding the coupon code
- **AND** SHALL include tenant identifier in QR data
- **AND** SHALL include verification URL in QR data
- **AND** SHALL store QR code image in cloud storage
- **AND** SHALL return publicly accessible QR code URL

#### Scenario: Download QR code
- **WHEN** a tenant views coupon details
- **THEN** the system SHALL provide download option for QR code
- **AND** SHALL allow downloading in multiple formats (PNG, SVG, PDF)
- **AND** SHALL allow downloading in different sizes
- **AND** SHALL include coupon details in downloaded file name

### Requirement: Coupon Listing and Management
The system SHALL provide comprehensive coupon management interface for tenants.

#### Scenario: View all coupons
- **WHEN** a tenant accesses their coupons page
- **THEN** the system SHALL display all coupons created by the tenant
- **AND** SHALL show coupon code, type, discount, expiry date, status
- **AND** SHALL show usage count vs limit
- **AND** SHALL paginate results (20 per page)
- **AND** SHALL allow sorting by creation date, expiry, usage

#### Scenario: Filter coupons by status
- **WHEN** a tenant applies status filter
- **THEN** the system SHALL show coupons matching selected status:
  - Active (not expired, usage limit not reached)
  - Expired (past expiry date)
  - Exhausted (usage limit reached)
  - Inactive (manually deactivated)
- **AND** SHALL update counts for each filter

#### Scenario: Search coupons
- **WHEN** a tenant enters search query
- **THEN** the system SHALL search across coupon code and description
- **AND** SHALL display matching results in real-time
- **AND** SHALL maintain applied filters during search

#### Scenario: View coupon details
- **WHEN** a tenant clicks on a coupon
- **THEN** the system SHALL display complete coupon information
- **AND** SHALL show QR code image
- **AND** SHALL show creation date and credit cost
- **AND** SHALL show total scans and usage statistics
- **AND** SHALL provide actions (Deactivate, Edit, Download QR, View Analytics)

#### Scenario: Deactivate coupon
- **WHEN** a tenant deactivates an active coupon
- **THEN** the system SHALL update coupon status to inactive
- **AND** SHALL prevent further scans/usage
- **AND** SHALL NOT refund credits
- **AND** SHALL maintain coupon data for historical reference
- **AND** SHALL allow reactivation if not expired

#### Scenario: Bulk coupon operations
- **WHEN** a tenant selects multiple coupons
- **THEN** the system SHALL allow bulk actions:
  - Download QR codes as ZIP
  - Deactivate selected coupons
  - Export coupon list as CSV
- **AND** SHALL confirm before executing bulk actions

### Requirement: Scan Verification and Tracking
The system SHALL provide QR code scanning capability to verify and redeem coupons.

#### Scenario: Scan coupon QR code successfully
- **WHEN** a user scans a coupon QR code
- **WITH** valid coupon that is active and within limits
- **THEN** the system SHALL verify the coupon
- **AND** SHALL increment usage count
- **AND** SHALL display coupon details (discount, terms)
- **AND** SHALL display success message configured by tenant
- **AND** SHALL log the scan with timestamp and location (if available)

#### Scenario: Scan expired coupon
- **WHEN** a user scans a coupon QR code
- **WITH** expired coupon (past expiry date)
- **THEN** the system SHALL reject the scan
- **AND** SHALL display "Coupon Expired" message
- **AND** SHALL NOT increment usage count
- **AND** SHALL log the failed scan attempt

#### Scenario: Scan exhausted coupon
- **WHEN** a user scans a coupon QR code
- **WITH** coupon that has reached usage limit
- **THEN** the system SHALL reject the scan
- **AND** SHALL display "Coupon Limit Reached" message
- **AND** SHALL NOT increment usage count
- **AND** SHALL log the failed scan attempt

#### Scenario: Scan inactive coupon
- **WHEN** a user scans a coupon QR code
- **WITH** deactivated coupon
- **THEN** the system SHALL reject the scan
- **AND** SHALL display "Coupon No Longer Valid" message
- **AND** SHALL NOT increment usage count

#### Scenario: Scan invalid or tampered QR code
- **WHEN** a user scans an invalid or tampered QR code
- **THEN** the system SHALL reject the scan
- **AND** SHALL display "Invalid Coupon" message
- **AND** SHALL log the security incident
- **AND** SHALL NOT provide coupon details

#### Scenario: Track scan location and device
- **WHEN** a coupon is scanned successfully
- **THEN** the system SHALL optionally capture scan location (GPS coordinates)
- **AND** SHALL capture device information (user agent, device type)
- **AND** SHALL capture scan timestamp
- **AND** SHALL store this data for analytics

### Requirement: Scan History and Analytics
The system SHALL provide comprehensive scan history and analytics for tenants.

#### Scenario: View scan history
- **WHEN** a tenant accesses scan history page
- **THEN** the system SHALL display all scan attempts for their coupons
- **AND** SHALL show coupon code, scan timestamp, status (success/failure)
- **AND** SHALL show scan location (if available)
- **AND** SHALL allow filtering by date range, coupon, and status
- **AND** SHALL paginate results

#### Scenario: View coupon-specific scan analytics
- **WHEN** a tenant views a specific coupon's analytics
- **THEN** the system SHALL display total scans over time (chart)
- **AND** SHALL show success vs failure rate
- **AND** SHALL show geographic distribution of scans (if location data available)
- **AND** SHALL show peak scan times (day of week, hour of day)
- **AND** SHALL show remaining usage capacity

#### Scenario: View overall scan analytics
- **WHEN** a tenant accesses analytics dashboard
- **THEN** the system SHALL display aggregated scan statistics
- **AND** SHALL show total scans across all coupons
- **AND** SHALL show most popular coupons by scan count
- **AND** SHALL show scan trends over time (daily, weekly, monthly)
- **AND** SHALL show conversion metrics (scans vs redemptions)

#### Scenario: Export scan data
- **WHEN** a tenant requests scan data export
- **THEN** the system SHALL generate CSV or Excel file
- **AND** SHALL include all scan records with details
- **AND** SHALL apply any active filters to export
- **AND** SHALL provide download link

### Requirement: Rewards System Authorization
The system SHALL enforce role-based access for rewards and coupon operations.

#### Scenario: Tenant can manage own coupons only
- **WHEN** a tenant accesses coupon features
- **THEN** the system SHALL allow creating coupons within credit limits
- **AND** SHALL allow viewing only their own coupons
- **AND** SHALL allow managing only their own verification app
- **AND** SHALL NOT allow viewing other tenants' coupons or scans

#### Scenario: Super Admin can view all rewards data
- **WHEN** a Super Admin accesses rewards system
- **THEN** the system SHALL allow viewing all tenants' coupons
- **AND** SHALL allow viewing system-wide scan analytics
- **AND** SHALL NOT allow creating coupons on behalf of tenants
- **AND** SHALL provide administrative oversight capabilities

#### Scenario: Public scan verification access
- **WHEN** a public user scans a QR code
- **THEN** the system SHALL allow scan verification without authentication
- **AND** SHALL display coupon details if valid
- **AND** SHALL NOT expose tenant backend information
- **AND** SHALL rate-limit scan attempts to prevent abuse

### Requirement: Coupon Edit and Update
The system SHALL allow tenants to modify certain coupon parameters after creation.

#### Scenario: Update coupon expiry date
- **WHEN** a tenant extends a coupon's expiry date
- **THEN** the system SHALL allow extending to a future date
- **AND** SHALL NOT allow setting expiry in the past
- **AND** SHALL recalculate and deduct additional credits if applicable
- **AND** SHALL log the modification

#### Scenario: Update coupon usage limits
- **WHEN** a tenant increases coupon usage limit
- **THEN** the system SHALL allow increasing the limit
- **AND** SHALL recalculate and deduct additional credits
- **AND** SHALL NOT allow decreasing below current usage count
- **AND** SHALL log the modification

#### Scenario: Prevent editing discount value
- **WHEN** a tenant attempts to modify discount percentage or amount
- **THEN** the system SHALL reject the modification
- **AND** SHALL display message that discount cannot be changed after creation
- **AND** SHALL suggest creating new coupon instead

#### Scenario: Update coupon description
- **WHEN** a tenant updates coupon description or terms
- **THEN** the system SHALL allow updating text fields
- **AND** SHALL NOT deduct additional credits
- **AND** SHALL reflect changes immediately
- **AND** SHALL log the modification
