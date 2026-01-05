# Mobile Scanner Specification

## ADDED Requirements

### Requirement: Real-time Coupon Scanning (Online Mode)
The system SHALL provide a mobile-optimized coupon verification endpoint that validates and redeems coupons instantly when the device is online.

#### Scenario: Successful coupon scan
- **GIVEN** a customer is authenticated in the mobile app
- **AND** the customer scans a valid, active QR code
- **AND** the device has internet connectivity
- **WHEN** the mobile app sends the coupon code to the server
- **THEN** the system SHALL validate the coupon
- **AND** check coupon status is 'active'
- **AND** verify the coupon has not exceeded usage limits
- **AND** increment the coupon usage count
- **AND** log the scan in the scans table
- **AND** link the scan to the customer_id
- **AND** return success with discount details
- **AND** update customer's total_scans and successful_scans counters

#### Scenario: Scan expired coupon
- **GIVEN** a customer scans a QR code for an expired coupon
- **WHEN** the verification request is processed
- **THEN** the system SHALL reject the scan
- **AND** return error "This coupon has expired"
- **AND** log the failed scan with status 'EXPIRED'

#### Scenario: Scan exhausted coupon
- **GIVEN** a coupon has reached its total usage limit
- **WHEN** a customer attempts to scan it
- **THEN** the system SHALL reject the scan
- **AND** return error "This coupon has been fully redeemed"
- **AND** log the failed scan with status 'EXHAUSTED'

#### Scenario: Scan inactive coupon
- **GIVEN** a coupon has been deactivated by tenant admin
- **WHEN** a customer scans it
- **THEN** the system SHALL reject the scan
- **AND** return error "This coupon is no longer active"
- **AND** log the failed scan with status 'INACTIVE'

#### Scenario: Scan with GPS location
- **GIVEN** a customer grants location permission
- **AND** the customer scans a coupon
- **WHEN** the mobile app includes GPS coordinates
- **THEN** the system SHALL store the location data (latitude, longitude)
- **AND** verify the coupon (location is logged but not validated)

#### Scenario: Scan without GPS location
- **GIVEN** a customer denies location permission
- **WHEN** the customer scans a coupon
- **THEN** the system SHALL process the scan normally
- **AND** log the scan with null location data

### Requirement: Offline Coupon Scanning with Queue
The system SHALL support offline coupon scanning by queuing scans locally and syncing them when connectivity is restored.

#### Scenario: Queue scan while offline
- **GIVEN** a customer's device has no internet connectivity
- **AND** the customer scans a QR code
- **WHEN** the mobile app attempts to queue the scan
- **THEN** the app SHALL store the scan locally in device storage
- **AND** include: coupon_code, scanned_at timestamp, location (if available)
- **AND** mark scan as 'pending_sync' in local storage
- **AND** display "Scan queued. Will verify when online." message

#### Scenario: Sync queued scans when online
- **GIVEN** a customer has 5 queued scans in local storage
- **AND** the device reconnects to the internet
- **WHEN** the mobile app triggers sync
- **THEN** the app SHALL send all queued scans to POST /api/mobile/v1/scan/queue
- **AND** the server SHALL create scan_queue entries for each scan
- **AND** return scan_queue IDs for tracking
- **AND** the app SHALL mark local scans as 'synced'

#### Scenario: Process queued scan on server
- **GIVEN** a scan_queue entry has status 'pending'
- **WHEN** the background queue processor runs
- **THEN** the system SHALL verify the coupon validity at time of actual scan (scanned_at timestamp)
- **AND** check if coupon was active at that time
- **AND** apply usage limits
- **AND** create scan record with correct timestamp
- **AND** update scan_queue status to 'completed' or 'failed'
- **AND** store verification result in scan_queue.verification_result

#### Scenario: Notify customer of queued scan result
- **GIVEN** a queued scan has been processed
- **AND** the customer's device is registered for push notifications
- **WHEN** the scan processing completes
- **THEN** the system SHALL send a push notification to the customer's device
- **AND** include scan result (success/failure)
- **AND** include discount details if successful

#### Scenario: Queued scan verification fails
- **GIVEN** a queued scan is being processed
- **AND** the coupon is no longer valid (expired since scan time)
- **WHEN** the verification runs
- **THEN** the system SHALL mark the scan as 'failed'
- **AND** store error reason "Coupon expired before sync"
- **AND** update scan_queue status to 'failed'
- **AND** notify customer via push notification

#### Scenario: Prevent duplicate queued scans
- **GIVEN** a customer scans the same coupon code twice while offline
- **WHEN** the mobile app checks local queue
- **THEN** the app SHALL detect the duplicate
- **AND** prevent adding a second queue entry
- **AND** display "This coupon is already queued for verification"

### Requirement: Scan History for Customers
The system SHALL provide customers with a complete history of their coupon scans and redemptions.

#### Scenario: View scan history
- **GIVEN** a customer is authenticated
- **WHEN** the customer requests their scan history
- **THEN** the system SHALL return a paginated list of scans
- **AND** include: coupon code, discount value, status, scanned date/time
- **AND** sort by most recent first
- **AND** support filtering by status (success, failed, expired)

#### Scenario: View scan details
- **GIVEN** a customer selects a specific scan from history
- **WHEN** the customer requests scan details
- **THEN** the system SHALL return:
  - Coupon code and reference
  - Discount details (type, value, currency)
  - Scan timestamp and location
  - Verification status
  - Verification app name
  - Terms and conditions

#### Scenario: Scan history pagination
- **GIVEN** a customer has 200 scan records
- **WHEN** the customer requests scan history
- **THEN** the system SHALL return 50 records per page
- **AND** provide pagination metadata (page, total_pages, has_more)
- **AND** support page parameter for navigation

### Requirement: Customer Redemption Statistics
The system SHALL provide customers with insights into their coupon usage and savings.

#### Scenario: View redemption stats
- **GIVEN** a customer is authenticated
- **WHEN** the customer requests their redemption statistics
- **THEN** the system SHALL return:
  - Total scans attempted
  - Successful scans (redeemed)
  - Failed scans
  - Total rewards value redeemed
  - Most recent scan timestamp
  - Average savings per month

#### Scenario: Monthly redemption breakdown
- **GIVEN** a customer wants to see monthly statistics
- **WHEN** the customer requests monthly breakdown
- **THEN** the system SHALL return redemption data grouped by month
- **AND** include: month/year, scan count, total savings
- **AND** support date range filtering (last 6 months, last year, custom)

### Requirement: Available Coupons Discovery
The system SHALL allow customers to view active coupons available for their tenant before scanning.

#### Scenario: List available coupons
- **GIVEN** a customer is authenticated
- **AND** the customer belongs to a specific tenant
- **WHEN** the customer requests available coupons
- **THEN** the system SHALL return all active coupons for the tenant
- **AND** include: description, discount value, expiry date, terms
- **AND** exclude expired or exhausted coupons
- **AND** sort by expiry date (expiring soon first)

#### Scenario: View coupon details before scanning
- **GIVEN** a customer views the available coupons list
- **WHEN** the customer selects a coupon to view details
- **THEN** the system SHALL return:
  - Full description
  - Discount type and value
  - Expiry date
  - Terms and conditions
  - Total usage limit (if applicable)
  - Per-user usage limit (if applicable)
  - Note: QR code and coupon_code are NOT shown (prevent sharing)

#### Scenario: Filter available coupons by expiry
- **GIVEN** a customer wants to see coupons expiring soon
- **WHEN** the customer applies "expiring soon" filter
- **THEN** the system SHALL return coupons expiring within 7 days
- **AND** highlight expiry date in red

### Requirement: Tenant Verification App Configuration
The system SHALL provide mobile apps with tenant-specific branding and configuration for white-label scanner apps.

#### Scenario: Fetch verification app config
- **GIVEN** a mobile app is configured for a specific tenant
- **WHEN** the app requests verification app configuration
- **THEN** the system SHALL return:
  - App name and logo URL
  - Primary and secondary brand colors
  - Welcome message
  - Scan success message
  - Scan failure message
  - Post-scan redirect URL (optional)
  - Terms and conditions URL

#### Scenario: Apply tenant branding in mobile app
- **GIVEN** the mobile app receives tenant configuration
- **WHEN** the app UI is rendered
- **THEN** the app SHALL apply:
  - Tenant logo in app header
  - Brand colors for buttons and UI elements
  - Custom success/failure messages on scan results
  - Redirect to tenant URL after successful scan (if configured)

### Requirement: Device Information Logging
The system SHALL log device information for analytics and fraud detection.

#### Scenario: Log device info on scan
- **GIVEN** a customer scans a coupon
- **WHEN** the scan verification request is sent
- **THEN** the system SHALL log:
  - Device model and OS version
  - App version
  - User agent string
  - IP address
  - Device_id (linked to customer_devices table)

### Requirement: Scan Rate Limiting for Customers
The system SHALL prevent abuse by rate-limiting scan requests per customer.

#### Scenario: Normal scan rate
- **GIVEN** a customer scans 10 coupons in 1 hour
- **WHEN** all scans are processed
- **THEN** the system SHALL allow all scans
- **AND** process them normally

#### Scenario: Excessive scan rate
- **GIVEN** a customer attempts to scan 100 coupons in 1 hour
- **WHEN** the 101st scan is attempted
- **THEN** the system SHALL block the request
- **AND** return error "Too many scan attempts. Please try again in 1 hour."
- **AND** log the rate limit violation

### Requirement: Scan Data Export for Customers
The system SHALL allow customers to export their scan history for personal records (GDPR compliance).

#### Scenario: Request scan data export
- **GIVEN** a customer wants to export their data
- **WHEN** the customer requests data export
- **THEN** the system SHALL generate a CSV file with all scan records
- **AND** include: date, time, coupon_code, discount_value, status, location
- **AND** return a download URL valid for 24 hours

## API Endpoints

### POST /api/mobile/v1/scan/verify
Verify and redeem a coupon in real-time (online mode).

**Headers**: `Authorization: Bearer {access_token}`

**Request Body**:
```json
{
  "coupon_code": "ABC123XYZ",
  "location_lat": 28.6139,  // Optional
  "location_lng": 77.2090,  // Optional
  "device_info": {
    "model": "iPhone 14 Pro",
    "os_version": "iOS 17.2",
    "app_version": "1.2.3"
  }
}
```

**Response (200 OK - Success)**:
```json
{
  "success": true,
  "message": "Success! Your coupon has been verified.",
  "data": {
    "scan_id": "uuid",
    "coupon": {
      "code": "ABC123XYZ",
      "reference": "CP-00042",
      "discount_type": "FIXED_AMOUNT",
      "discount_value": 50.00,
      "discount_currency": "INR",
      "description": "₹50 OFF on orders above ₹500",
      "terms": "Valid for 30 days. One-time use only."
    },
    "scanned_at": "2025-01-03T14:25:30Z",
    "location": {
      "lat": 28.6139,
      "lng": 77.2090
    }
  }
}
```

**Response (400 Bad Request - Failed)**:
```json
{
  "success": false,
  "error": "Coupon Expired",
  "message": "This coupon has expired.",
  "scan_status": "EXPIRED",
  "data": {
    "scan_id": "uuid",
    "scanned_at": "2025-01-03T14:25:30Z"
  }
}
```

### POST /api/mobile/v1/scan/queue
Queue a scan for offline processing.

**Headers**: `Authorization: Bearer {access_token}`

**Request Body**:
```json
{
  "scans": [
    {
      "coupon_code": "ABC123XYZ",
      "scanned_at": "2025-01-03T14:20:00Z",  // When customer actually scanned (may be past)
      "location_lat": 28.6139,
      "location_lng": 77.2090,
      "device_id": "uuid"
    },
    {
      "coupon_code": "DEF456UVW",
      "scanned_at": "2025-01-03T14:22:00Z",
      "location_lat": 28.6139,
      "location_lng": 77.2090,
      "device_id": "uuid"
    }
  ]
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "2 scans queued for processing",
  "data": {
    "queued_count": 2,
    "queue_entries": [
      {
        "queue_id": "uuid-1",
        "coupon_code": "ABC123XYZ",
        "status": "pending"
      },
      {
        "queue_id": "uuid-2",
        "coupon_code": "DEF456UVW",
        "status": "pending"
      }
    ]
  }
}
```

### GET /api/mobile/v1/scan/queue/status
Check status of queued scans.

**Headers**: `Authorization: Bearer {access_token}`

**Query Parameters**: `queue_ids` (comma-separated UUIDs)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "queue_entries": [
      {
        "queue_id": "uuid-1",
        "coupon_code": "ABC123XYZ",
        "sync_status": "completed",
        "verification_result": {
          "success": true,
          "discount_value": 50.00,
          "scanned_at": "2025-01-03T14:20:00Z"
        }
      },
      {
        "queue_id": "uuid-2",
        "coupon_code": "DEF456UVW",
        "sync_status": "pending",
        "verification_result": null
      }
    ]
  }
}
```

### GET /api/mobile/v1/scan/history
Get customer's scan history with pagination.

**Headers**: `Authorization: Bearer {access_token}`

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 50, max: 100)
- `status` (optional: success, failed, expired, inactive)
- `from_date` (optional: ISO date)
- `to_date` (optional: ISO date)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "scans": [
      {
        "scan_id": "uuid",
        "coupon_code": "ABC123XYZ",
        "coupon_reference": "CP-00042",
        "discount_type": "FIXED_AMOUNT",
        "discount_value": 50.00,
        "discount_currency": "INR",
        "scan_status": "SUCCESS",
        "scanned_at": "2025-01-03T14:25:30Z",
        "location": {
          "lat": 28.6139,
          "lng": 77.2090
        },
        "verification_app_name": "ACME Rewards"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 234,
      "total_pages": 5,
      "has_more": true
    }
  }
}
```

### GET /api/mobile/v1/scan/stats
Get customer's redemption statistics.

**Headers**: `Authorization: Bearer {access_token}`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "total_scans": 150,
    "successful_scans": 120,
    "failed_scans": 30,
    "success_rate": 80.0,
    "total_rewards_redeemed": 6000.00,
    "currency": "INR",
    "last_scan_at": "2025-01-03T14:25:30Z",
    "monthly_breakdown": [
      {
        "month": "2025-01",
        "scans": 45,
        "successful": 38,
        "rewards": 1900.00
      },
      {
        "month": "2024-12",
        "scans": 60,
        "successful": 50,
        "rewards": 2500.00
      }
    ]
  }
}
```

### GET /api/mobile/v1/coupons/available
List active coupons available for the customer's tenant.

**Headers**: `Authorization: Bearer {access_token}`

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 20)
- `filter` (optional: expiring_soon, high_value)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "coupons": [
      {
        "id": "uuid",
        "coupon_reference": "CP-00042",
        "description": "₹50 OFF on orders above ₹500",
        "discount_type": "FIXED_AMOUNT",
        "discount_value": 50.00,
        "discount_currency": "INR",
        "expiry_date": "2025-02-01T23:59:59Z",
        "days_until_expiry": 28,
        "terms": "Valid for 30 days. One-time use only.",
        "is_expiring_soon": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "has_more": true
    }
  }
}
```

### GET /api/mobile/v1/config/:tenant_slug
Get tenant's verification app configuration for branding.

**Public endpoint** (no authentication required)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "tenant_id": "uuid",
    "tenant_slug": "acme-logistics",
    "app_name": "ACME Rewards Scanner",
    "logo_url": "https://cdn.mscan.com/logos/acme.png",
    "primary_color": "#FF6B35",
    "secondary_color": "#004E89",
    "welcome_message": "Welcome to ACME Rewards! Scan to redeem.",
    "scan_success_message": "Success! Your reward has been applied.",
    "scan_failure_message": "Sorry, this coupon is not valid.",
    "post_scan_redirect_url": "https://acme.com/rewards",
    "terms_url": "https://acme.com/terms",
    "support_email": "support@acme.com",
    "support_phone": "+91-1800-123-4567"
  }
}
```

### POST /api/mobile/v1/scan/export
Request scan history data export (GDPR).

**Headers**: `Authorization: Bearer {access_token}`

**Request Body**:
```json
{
  "format": "csv",  // or "json"
  "from_date": "2024-01-01",
  "to_date": "2025-01-03"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Export ready for download",
  "data": {
    "download_url": "https://cdn.mscan.com/exports/customer-uuid-scans.csv",
    "expires_at": "2025-01-04T14:25:30Z",
    "file_size_bytes": 45678,
    "record_count": 234
  }
}
```

## Non-Functional Requirements

### Performance
- Real-time scan verification: < 300ms response time
- Queue scan submission: < 200ms response time
- History fetch: < 400ms for 50 records
- Queue processing: Process 1000 scans/minute

### Reliability
- 99.9% uptime for scan verification
- Queue processing retries: 3 attempts with exponential backoff
- Failed queue entries retained for 7 days

### Security
- Rate limiting: 100 scans per hour per customer
- GPS location optional (customer consent required)
- Device binding to prevent token sharing
- Scan timestamps validated (cannot be more than 24 hours old)

### Scalability
- Support 10,000 concurrent scan requests
- Handle 1 million queued scans per day
- Horizontal scaling for queue processors
