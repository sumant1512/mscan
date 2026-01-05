## ADDED Requirements

### Requirement: Role-Based Side Navigation
The system SHALL provide a side navigation component that displays different menu items based on the authenticated user's role.

#### Scenario: Display Super Admin navigation menu
- **WHEN** a Super Admin user is logged in and views the application
- **THEN** the system SHALL display a side navigation with the following menu items:
  - Dashboard
  - Tenant Management (Add Tenant, View Tenants)
  - Credit Requests (Pending Approvals, History)
  - System Settings (optional)
- **AND** each menu item SHALL be clickable and navigate to the corresponding route
- **AND** the active route SHALL be visually highlighted

#### Scenario: Display Tenant navigation menu
- **WHEN** a Tenant user is logged in and views the application
- **THEN** the system SHALL display a side navigation with the following menu items:
  - Dashboard
  - Verification App (Configure, Manage)
  - Rewards (Create Coupons, Coupon List, Scan History)
  - Credits (Balance, Request Credits, Transaction History)
  - Profile Settings (optional)
- **AND** each menu item SHALL be clickable and navigate to the corresponding route
- **AND** the active route SHALL be visually highlighted

#### Scenario: Navigation responsiveness
- **WHEN** the application is viewed on different screen sizes
- **THEN** the navigation SHALL adapt responsively
- **AND** on mobile devices SHALL collapse to a hamburger menu or drawer
- **AND** SHALL maintain full functionality on all devices

#### Scenario: Navigation visibility control
- **WHEN** a user is not logged in
- **THEN** the side navigation SHALL NOT be displayed
- **AND** SHALL only appear after successful authentication

### Requirement: Navigation Icons and Labels
The system SHALL display clear icons and labels for each navigation menu item.

#### Scenario: Display menu with icons
- **WHEN** the side navigation is rendered
- **THEN** each menu item SHALL have an associated icon
- **AND** each menu item SHALL have a descriptive text label
- **AND** icons SHALL be consistent with the application's design system

#### Scenario: Collapsible navigation (optional feature)
- **WHEN** a user clicks a collapse toggle
- **THEN** the navigation SHALL collapse to show only icons
- **AND** SHALL expand back to show icons and labels when toggled again
- **AND** SHALL remember the user's preference

### Requirement: Navigation Routing Integration
The system SHALL integrate the navigation component with Angular routing for seamless page transitions.

#### Scenario: Navigate to feature pages
- **WHEN** a user clicks a navigation menu item
- **THEN** the system SHALL navigate to the corresponding route without page reload
- **AND** SHALL update the browser URL
- **AND** SHALL highlight the active menu item
- **AND** SHALL maintain authentication state

#### Scenario: Handle unauthorized route access
- **WHEN** a user attempts to access a route not authorized for their role
- **THEN** the system SHALL redirect to their default dashboard
- **AND** SHALL display an error message indicating insufficient permissions
- **AND** SHALL log the unauthorized access attempt

### Requirement: Navigation State Management
The system SHALL maintain navigation state across page transitions and sessions.

#### Scenario: Persist active route highlight
- **WHEN** a user navigates to a page and refreshes the browser
- **THEN** the navigation SHALL maintain the correct active route highlight
- **AND** SHALL keep the navigation expanded/collapsed state if applicable

#### Scenario: Dynamic menu updates
- **WHEN** a user's role or permissions change (rare case)
- **THEN** the navigation menu SHALL update dynamically
- **AND** SHALL reflect the new set of available menu items
- **AND** SHALL NOT require logout/login to see changes
