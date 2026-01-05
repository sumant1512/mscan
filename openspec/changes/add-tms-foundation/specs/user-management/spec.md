## ADDED Requirements

### Requirement: Customer Registration by Super Admin
The system SHALL provide a customer registration capability that allows only Super Admin users to create new tenant accounts in the TMS platform.

#### Scenario: Super Admin creates new customer
- **WHEN** a Super Admin provides valid customer details (company name, admin email, contact information)
- **THEN** a new tenant account is created with a unique tenant ID
- **AND** a tenant admin user is created with the provided email
- **AND** the customer receives a welcome email notification

#### Scenario: Duplicate customer registration prevention
- **WHEN** a Super Admin attempts to register a customer with an email that already exists
- **THEN** the system SHALL reject the registration
- **AND** display an appropriate error message

#### Scenario: Non-admin user attempts registration
- **WHEN** a non-Super Admin user attempts to create a customer account
- **THEN** the system SHALL reject the request
- **AND** return an authorization error

### Requirement: Tenant Data Isolation
The system SHALL ensure complete data isolation between different tenant accounts.

#### Scenario: Tenant-specific data access
- **WHEN** a tenant user accesses the system
- **THEN** they SHALL only see data belonging to their tenant
- **AND** they SHALL NOT have access to other tenants' data

### Requirement: User Profile Management
The system SHALL allow users to view and update their profile information.

#### Scenario: View user profile
- **WHEN** an authenticated user accesses their profile
- **THEN** the system SHALL display their current profile information (name, email, role, tenant)

#### Scenario: Update user profile
- **WHEN** a user updates their profile information
- **THEN** the system SHALL validate and save the changes
- **AND** confirm the update to the user
