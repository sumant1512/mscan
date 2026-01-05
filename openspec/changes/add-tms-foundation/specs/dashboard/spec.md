## ADDED Requirements

### Requirement: Role-Specific Dashboard Display
The system SHALL provide dashboards that display information specific to the authenticated user's role type.

#### Scenario: Super Admin dashboard view
- **WHEN** a Super Admin accesses the dashboard
- **THEN** the system SHALL display a Super Admin dashboard
- **AND** show system-wide statistics (total tenants, total users, system health)
- **AND** provide links to tenant management and system administration functions

#### Scenario: Tenant dashboard view
- **WHEN** a Tenant user accesses the dashboard
- **THEN** the system SHALL display a Tenant dashboard
- **AND** show tenant-specific statistics and data
- **AND** provide links to tenant-scoped functions only
- **AND** NOT display system administration options

### Requirement: Dashboard Navigation
The system SHALL provide role-appropriate navigation based on user type.

#### Scenario: Navigation for Super Admin
- **WHEN** a Super Admin views the dashboard
- **THEN** the navigation SHALL include system administration menu items
- **AND** tenant management options
- **AND** user management across all tenants

#### Scenario: Navigation for Tenant user
- **WHEN** a Tenant user views the dashboard
- **THEN** the navigation SHALL include only tenant-scoped menu items
- **AND** NOT include system administration options
- **AND** NOT include cross-tenant functionality

### Requirement: User Context Display
The system SHALL display the current user's role and tenant information on the dashboard.

#### Scenario: Display user context
- **WHEN** any authenticated user views their dashboard
- **THEN** the system SHALL display the user's name and role
- **AND** for Tenant users, display the tenant company name
- **AND** for Super Admin, display "System Administrator" designation
