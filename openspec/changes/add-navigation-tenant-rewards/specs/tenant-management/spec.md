## ADDED Requirements

### Requirement: Tenant Creation by Super Admin
The system SHALL allow Super Admins to create new tenant accounts with complete business information.

#### Scenario: Create new tenant successfully
- **WHEN** a Super Admin submits a form to create a new tenant
- **WITH** valid tenant information (company name, contact name, email, phone, address)
- **THEN** the system SHALL create a new tenant record in the database
- **AND** SHALL assign a unique tenant ID
- **AND** SHALL set the tenant status to "active" by default
- **AND** SHALL send a welcome email to the tenant contact email
- **AND** SHALL return the created tenant details

#### Scenario: Prevent duplicate tenant email
- **WHEN** a Super Admin attempts to create a tenant
- **WITH** an email address that already exists in the system
- **THEN** the system SHALL reject the creation
- **AND** SHALL return an error message indicating duplicate email
- **AND** SHALL NOT create any database record

#### Scenario: Validate tenant information
- **WHEN** a Super Admin submits tenant creation form
- **WITH** missing required fields (company name, contact email)
- **THEN** the system SHALL reject the submission
- **AND** SHALL return validation errors for each missing field
- **AND** SHALL indicate which fields are required

#### Scenario: Create tenant with optional fields
- **WHEN** a Super Admin creates a tenant
- **WITH** only required fields filled
- **THEN** the system SHALL successfully create the tenant
- **AND** SHALL allow updating optional fields later

### Requirement: Tenant Listing and Search
The system SHALL provide Super Admins with a comprehensive list of all tenants with search and filter capabilities.

#### Scenario: View all tenants
- **WHEN** a Super Admin accesses the tenant management page
- **THEN** the system SHALL display a paginated list of all tenants
- **AND** SHALL show key information (company name, contact email, status, created date)
- **AND** SHALL display 20 tenants per page by default
- **AND** SHALL provide pagination controls

#### Scenario: Search tenants by name or email
- **WHEN** a Super Admin enters a search query
- **THEN** the system SHALL filter the tenant list in real-time
- **AND** SHALL search across company name and contact email fields
- **AND** SHALL display matching results
- **AND** SHALL show a message if no results are found

#### Scenario: Filter tenants by status
- **WHEN** a Super Admin selects a status filter (active/inactive)
- **THEN** the system SHALL display only tenants with the selected status
- **AND** SHALL update the count of displayed tenants
- **AND** SHALL allow clearing the filter to show all tenants

#### Scenario: Sort tenant list
- **WHEN** a Super Admin clicks a column header (name, email, created date)
- **THEN** the system SHALL sort the list by that column
- **AND** SHALL toggle between ascending and descending order
- **AND** SHALL indicate the current sort direction

### Requirement: Tenant Editing
The system SHALL allow Super Admins to edit existing tenant information.

#### Scenario: Edit tenant details successfully
- **WHEN** a Super Admin selects a tenant to edit
- **AND** modifies tenant information (company name, contact details, address)
- **AND** submits the update
- **THEN** the system SHALL update the tenant record
- **AND** SHALL maintain the tenant ID unchanged
- **AND** SHALL log the modification with timestamp and admin user
- **AND** SHALL return the updated tenant details

#### Scenario: Prevent duplicate email during edit
- **WHEN** a Super Admin edits a tenant
- **AND** changes the email to one already used by another tenant
- **THEN** the system SHALL reject the update
- **AND** SHALL return an error indicating duplicate email
- **AND** SHALL NOT modify the tenant record

#### Scenario: View tenant edit history
- **WHEN** a Super Admin views a tenant's details
- **THEN** the system SHALL display an audit trail of changes
- **AND** SHALL show who made each change and when
- **AND** SHALL indicate what fields were modified

### Requirement: Tenant Status Management
The system SHALL allow Super Admins to activate or deactivate tenant accounts.

#### Scenario: Deactivate tenant account
- **WHEN** a Super Admin changes a tenant's status to "inactive"
- **THEN** the system SHALL update the tenant status
- **AND** SHALL prevent the tenant users from logging in
- **AND** SHALL retain all tenant data for potential reactivation
- **AND** SHALL send a notification email to the tenant contact
- **AND** SHALL log the status change with reason (if provided)

#### Scenario: Reactivate tenant account
- **WHEN** a Super Admin changes an inactive tenant's status to "active"
- **THEN** the system SHALL update the tenant status
- **AND** SHALL restore login access for tenant users
- **AND** SHALL send a notification email to the tenant contact
- **AND** SHALL log the reactivation

#### Scenario: Inactive tenant credit restrictions
- **WHEN** a tenant is inactive
- **THEN** the system SHALL NOT allow new credit requests
- **AND** SHALL NOT allow coupon creation
- **AND** SHALL maintain existing data (coupons, credits) in read-only mode
- **AND** SHALL display a clear message about inactive status

### Requirement: Tenant Detail View
The system SHALL provide a detailed view of tenant information and associated data.

#### Scenario: View comprehensive tenant details
- **WHEN** a Super Admin clicks to view a tenant's details
- **THEN** the system SHALL display complete tenant information
- **AND** SHALL show current credit balance
- **AND** SHALL show total credit requests (pending, approved, rejected)
- **AND** SHALL show total coupons created
- **AND** SHALL show verification app configuration status
- **AND** SHALL provide quick action buttons (Edit, Change Status)

#### Scenario: Access tenant's credit history from detail view
- **WHEN** a Super Admin views tenant details
- **AND** clicks on credit balance or credit history
- **THEN** the system SHALL navigate to filtered credit transaction view for that tenant
- **AND** SHALL show all credit requests and approvals for that tenant

### Requirement: Authorization for Tenant Management
The system SHALL restrict tenant management operations to Super Admin users only.

#### Scenario: Super Admin access granted
- **WHEN** a Super Admin attempts to access tenant management features
- **THEN** the system SHALL allow full access to all tenant operations
- **AND** SHALL display all tenant management menu items

#### Scenario: Tenant user access denied
- **WHEN** a Tenant user attempts to access tenant management endpoints
- **THEN** the system SHALL deny access
- **AND** SHALL return a 403 Forbidden error
- **AND** SHALL log the unauthorized access attempt
- **AND** SHALL NOT expose any tenant list or details

#### Scenario: Unauthorized user access denied
- **WHEN** an unauthenticated user attempts to access tenant management
- **THEN** the system SHALL deny access
- **AND** SHALL redirect to the login page
- **AND** SHALL return a 401 Unauthorized error
