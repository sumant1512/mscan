# Mobile Profile Management Specification

## ADDED Requirements

### Requirement: Customer Profile Viewing
The system SHALL allow customers to view their complete profile information in the mobile app.

#### Scenario: View complete profile
- **GIVEN** a customer is authenticated
- **WHEN** the customer requests their profile
- **THEN** the system SHALL return:
  - Personal information (name, phone, email, date of birth, gender)
  - Contact information (address, city, state, postal code, country)
  - Profile picture URL
  - Verification status (phone_verified, email_verified)
  - Account statistics (total scans, successful scans, rewards redeemed)
  - Account creation and last update timestamps

### Requirement: Customer Profile Editing
The system SHALL allow customers to update their profile information through the mobile app.

#### Scenario: Update basic information
- **GIVEN** a customer is authenticated
- **WHEN** the customer updates their full name, date of birth, or gender
- **THEN** the system SHALL validate the input
- **AND** update the customer record
- **AND** update the updated_at timestamp
- **AND** return success with updated profile

#### Scenario: Update contact information
- **GIVEN** a customer wants to update their address
- **WHEN** the customer provides new address, city, state, postal code
- **THEN** the system SHALL validate the postal code format
- **AND** update the customer record
- **AND** return success with updated profile

#### Scenario: Update phone number
- **GIVEN** a customer wants to change their phone number
- **WHEN** the customer provides a new phone number
- **THEN** the system SHALL verify the phone number is not already registered
- **AND** send OTP to the new phone number
- **AND** mark phone as unverified until OTP is confirmed
- **AND** return success with verification pending status

#### Scenario: Update email address
- **GIVEN** a customer wants to change their email
- **WHEN** the customer provides a new email address
- **THEN** the system SHALL verify the email is not already registered
- **AND** send OTP to the new email address
- **AND** mark email as unverified until OTP is confirmed
- **AND** return success with verification pending status

#### Scenario: Prevent duplicate phone/email
- **GIVEN** a customer attempts to update their phone number
- **AND** the phone number is already registered to another account
- **WHEN** the update request is processed
- **THEN** the system SHALL reject the update
- **AND** return error "This phone number is already in use"

### Requirement: Profile Picture Upload
The system SHALL allow customers to upload and manage their profile pictures.

#### Scenario: Upload profile picture
- **GIVEN** a customer is authenticated
- **WHEN** the customer uploads a profile picture (JPEG/PNG, max 5MB)
- **THEN** the system SHALL validate the file type and size
- **AND** resize the image to 512x512 pixels
- **AND** upload to cloud storage (CDN)
- **AND** generate a secure URL
- **AND** update customer.profile_picture_url
- **AND** return the new profile picture URL

#### Scenario: Remove profile picture
- **GIVEN** a customer has a profile picture
- **WHEN** the customer requests to remove it
- **THEN** the system SHALL delete the image from cloud storage
- **AND** set customer.profile_picture_url to NULL
- **AND** return success

#### Scenario: Invalid image upload
- **GIVEN** a customer attempts to upload a file
- **AND** the file is not a valid image (e.g., PDF, TXT)
- **WHEN** the upload is attempted
- **THEN** the system SHALL reject the upload
- **AND** return error "Invalid file type. Only JPEG and PNG are supported."

#### Scenario: Image too large
- **GIVEN** a customer uploads an image larger than 5MB
- **WHEN** the upload is attempted
- **THEN** the system SHALL reject the upload
- **AND** return error "File too large. Maximum size is 5MB."

### Requirement: Device Management
The system SHALL allow customers to view and manage their registered devices.

#### Scenario: List registered devices
- **GIVEN** a customer is authenticated
- **WHEN** the customer requests their device list
- **THEN** the system SHALL return all registered devices
- **AND** include: device name, platform, OS version, app version, last active date
- **AND** highlight the current device

#### Scenario: Register new device
- **GIVEN** a customer logs in on a new device
- **WHEN** the login is successful
- **THEN** the system SHALL automatically register the device
- **AND** store device_id, platform, OS version, app version
- **AND** request FCM/APNS token for push notifications
- **AND** mark device as active

#### Scenario: Unregister device
- **GIVEN** a customer wants to remove a registered device
- **WHEN** the customer unregisters a device
- **THEN** the system SHALL mark the device as inactive
- **AND** blacklist all tokens issued to that device
- **AND** remove FCM/APNS tokens
- **AND** prevent future logins from that device until re-registered

#### Scenario: Exceed device limit
- **GIVEN** a customer has 5 registered devices (max limit)
- **WHEN** the customer attempts to register a 6th device
- **THEN** the system SHALL reject the registration
- **AND** return error "Maximum 5 devices allowed. Please unregister an old device first."
- **AND** provide list of registered devices

#### Scenario: Update FCM token
- **GIVEN** a customer's device receives a new FCM token from Firebase
- **WHEN** the mobile app sends the updated token
- **THEN** the system SHALL update the customer_devices record
- **AND** store the new FCM token
- **AND** return success

### Requirement: Push Notification Preferences
The system SHALL allow customers to manage their push notification preferences.

#### Scenario: Enable push notifications
- **GIVEN** a customer has disabled notifications
- **WHEN** the customer enables push notifications in profile settings
- **THEN** the system SHALL update notification preferences
- **AND** request FCM/APNS token from device
- **AND** store the token in customer_devices table
- **AND** return success

#### Scenario: Disable push notifications
- **GIVEN** a customer wants to stop receiving notifications
- **WHEN** the customer disables push notifications
- **THEN** the system SHALL update notification preferences
- **AND** mark FCM/APNS token as inactive (don't delete)
- **AND** stop sending push notifications to that device
- **AND** return success

#### Scenario: Notification preference types
- **GIVEN** a customer wants granular control
- **WHEN** the customer manages notification preferences
- **THEN** the system SHALL support:
  - New coupon alerts: ON/OFF
  - Scan verification results: ON/OFF
  - Coupon expiry reminders: ON/OFF
  - Account security alerts: ON/OFF (cannot be disabled)

### Requirement: Account Security Settings
The system SHALL provide customers with security controls for their mobile accounts.

#### Scenario: View active sessions
- **GIVEN** a customer is authenticated
- **WHEN** the customer requests active sessions
- **THEN** the system SHALL return all devices with valid tokens
- **AND** include: device name, platform, last active time, login IP address
- **AND** highlight current session

#### Scenario: Logout from specific device
- **GIVEN** a customer sees an unfamiliar device in active sessions
- **WHEN** the customer selects "Logout from this device"
- **THEN** the system SHALL blacklist all tokens for that device
- **AND** mark device as inactive
- **AND** send security alert to customer's verified phone/email

#### Scenario: Logout from all devices
- **GIVEN** a customer suspects account compromise
- **WHEN** the customer selects "Logout from all devices"
- **THEN** the system SHALL blacklist all access and refresh tokens
- **AND** mark all devices as inactive
- **AND** require re-authentication on all devices
- **AND** send security alert to customer's verified contact

### Requirement: Account Verification Status
The system SHALL track and display verification status for customer contact information.

#### Scenario: View verification status
- **GIVEN** a customer is authenticated
- **WHEN** the customer views their profile
- **THEN** the system SHALL display:
  - Phone verified: YES/NO with verification date
  - Email verified: YES/NO with verification date
  - Verification badges in UI

#### Scenario: Resend verification OTP
- **GIVEN** a customer's phone/email is unverified
- **WHEN** the customer requests OTP resend
- **THEN** the system SHALL generate a new OTP
- **AND** send to unverified phone/email
- **AND** return "Verification code sent"

#### Scenario: Verify phone/email with OTP
- **GIVEN** a customer has an unverified phone/email
- **AND** the customer receives an OTP
- **WHEN** the customer enters the correct OTP
- **THEN** the system SHALL mark phone/email as verified
- **AND** update phone_verified/email_verified to true
- **AND** store verification timestamp
- **AND** return success

### Requirement: Account Privacy Controls
The system SHALL allow customers to control their data visibility and privacy settings.

#### Scenario: View data collection consent
- **GIVEN** a customer is concerned about privacy
- **WHEN** the customer views privacy settings
- **THEN** the system SHALL display:
  - Location data collection: ON/OFF
  - Device information logging: ON/OFF (mandatory)
  - Marketing communications: ON/OFF
  - Data sharing with third parties: ON/OFF

#### Scenario: Disable location tracking
- **GIVEN** a customer wants to disable location tracking
- **WHEN** the customer turns off location consent
- **THEN** the system SHALL update privacy preferences
- **AND** stop logging location data on future scans
- **AND** return success

### Requirement: Account Deletion
The system SHALL allow customers to permanently delete their accounts (GDPR Right to Erasure).

#### Scenario: Request account deletion
- **GIVEN** a customer wants to delete their account
- **WHEN** the customer confirms account deletion
- **THEN** the system SHALL:
  - Mark account as deleted (soft delete)
  - Anonymize personal data (name → "Deleted User", phone/email hashed)
  - Blacklist all tokens
  - Unregister all devices
  - Retain scan history for audit (anonymized)
  - Delete profile picture from cloud storage
  - Send confirmation to original email/phone
  - Schedule hard delete after 30 days

#### Scenario: Prevent login after deletion
- **GIVEN** an account has been deleted
- **WHEN** the customer attempts to log in
- **THEN** the system SHALL reject the login
- **AND** return error "Account not found. Please register."

### Requirement: Data Export for Customers
The system SHALL allow customers to export their personal data (GDPR Right to Data Portability).

#### Scenario: Request data export
- **GIVEN** a customer wants to export their data
- **WHEN** the customer requests data export
- **THEN** the system SHALL generate a JSON file containing:
  - Profile information
  - All scan history
  - Device information
  - Notification preferences
  - Privacy settings
- **AND** return a download URL valid for 24 hours

#### Scenario: Download exported data
- **GIVEN** a data export has been generated
- **WHEN** the customer accesses the download URL
- **THEN** the system SHALL serve the JSON file
- **AND** log the download event
- **AND** expire the URL after download or 24 hours

### Requirement: Customer Support Contact
The system SHALL provide customers with easy access to support channels.

#### Scenario: View support information
- **GIVEN** a customer needs help
- **WHEN** the customer accesses support settings
- **THEN** the system SHALL display:
  - Tenant's support email
  - Tenant's support phone number
  - FAQ/Help center URL
  - In-app feedback form
  - App version and customer ID (for support tickets)

#### Scenario: Submit feedback
- **GIVEN** a customer wants to provide feedback
- **WHEN** the customer submits feedback via in-app form
- **THEN** the system SHALL send feedback to tenant's support email
- **AND** include customer ID, device info, app version
- **AND** return confirmation "Feedback submitted successfully"

## API Endpoints

### GET /api/mobile/v1/profile
Get complete customer profile.

**Headers**: `Authorization: Bearer {access_token}`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenant_id": "uuid",
    "tenant_name": "ACME Logistics",
    "full_name": "Rajesh Kumar",
    "phone": "+919876543210",
    "email": "rajesh@example.com",
    "phone_verified": true,
    "email_verified": false,
    "date_of_birth": "1990-05-15",
    "gender": "male",
    "address": "123 Main Street, Apartment 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postal_code": "400001",
    "country": "India",
    "profile_picture_url": "https://cdn.mscan.com/profiles/uuid.jpg",
    "total_scans": 150,
    "successful_scans": 120,
    "total_rewards_redeemed": 6000.00,
    "currency": "INR",
    "last_scan_at": "2025-01-03T14:25:30Z",
    "created_at": "2024-06-15T10:00:00Z",
    "updated_at": "2025-01-02T08:30:00Z"
  }
}
```

### PUT /api/mobile/v1/profile
Update customer profile.

**Headers**: `Authorization: Bearer {access_token}`

**Request Body** (all fields optional):
```json
{
  "full_name": "Rajesh Kumar",
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "address": "123 Main Street, Apartment 4B",
  "city": "Mumbai",
  "state": "Maharashtra",
  "postal_code": "400001",
  "country": "India"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid",
    "full_name": "Rajesh Kumar",
    "updated_at": "2025-01-03T15:00:00Z"
  }
}
```

### PUT /api/mobile/v1/profile/phone
Update phone number (requires OTP verification).

**Headers**: `Authorization: Bearer {access_token}`

**Request Body**:
```json
{
  "new_phone": "+919876543211"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "OTP sent to new phone number. Please verify.",
  "data": {
    "phone_verified": false,
    "otp_sent_to": "+91****3211",
    "expires_in": 300
  }
}
```

### POST /api/mobile/v1/profile/phone/verify
Verify new phone number with OTP.

**Headers**: `Authorization: Bearer {access_token}`

**Request Body**:
```json
{
  "otp": "123456"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Phone number verified successfully",
  "data": {
    "phone": "+919876543211",
    "phone_verified": true,
    "verified_at": "2025-01-03T15:05:00Z"
  }
}
```

### PUT /api/mobile/v1/profile/email
Update email address (requires OTP verification).

**Headers**: `Authorization: Bearer {access_token}`

**Request Body**:
```json
{
  "new_email": "newemail@example.com"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "OTP sent to new email. Please verify.",
  "data": {
    "email_verified": false,
    "otp_sent_to": "new****@example.com",
    "expires_in": 300
  }
}
```

### POST /api/mobile/v1/profile/email/verify
Verify new email with OTP.

**Headers**: `Authorization: Bearer {access_token}`

**Request Body**:
```json
{
  "otp": "123456"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "email": "newemail@example.com",
    "email_verified": true,
    "verified_at": "2025-01-03T15:10:00Z"
  }
}
```

### POST /api/mobile/v1/profile/picture
Upload profile picture.

**Headers**: 
- `Authorization: Bearer {access_token}`
- `Content-Type: multipart/form-data`

**Request Body** (multipart):
```
picture: <image file> (JPEG/PNG, max 5MB)
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Profile picture updated successfully",
  "data": {
    "profile_picture_url": "https://cdn.mscan.com/profiles/uuid.jpg",
    "uploaded_at": "2025-01-03T15:15:00Z"
  }
}
```

### DELETE /api/mobile/v1/profile/picture
Remove profile picture.

**Headers**: `Authorization: Bearer {access_token}`

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Profile picture removed successfully"
}
```

### GET /api/mobile/v1/devices
List registered devices for customer.

**Headers**: `Authorization: Bearer {access_token}`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "uuid",
        "device_id": "device-uuid-1",
        "device_name": "iPhone 14 Pro",
        "platform": "iOS",
        "os_version": "17.2",
        "app_version": "1.2.3",
        "is_active": true,
        "is_current": true,
        "last_active_at": "2025-01-03T15:00:00Z",
        "created_at": "2024-06-15T10:00:00Z"
      },
      {
        "id": "uuid",
        "device_id": "device-uuid-2",
        "device_name": "Samsung Galaxy S23",
        "platform": "Android",
        "os_version": "14",
        "app_version": "1.2.2",
        "is_active": true,
        "is_current": false,
        "last_active_at": "2025-01-02T20:00:00Z",
        "created_at": "2024-08-20T14:00:00Z"
      }
    ],
    "total_devices": 2,
    "max_devices": 5
  }
}
```

### POST /api/mobile/v1/devices
Register a new device.

**Headers**: `Authorization: Bearer {access_token}`

**Request Body**:
```json
{
  "device_id": "device-uuid-3",
  "device_name": "iPad Air",
  "platform": "iOS",
  "os_version": "17.2",
  "app_version": "1.2.3",
  "fcm_token": "fcm-token-string",
  "apns_token": "apns-token-string"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "message": "Device registered successfully",
  "data": {
    "device_id": "uuid",
    "is_active": true,
    "created_at": "2025-01-03T15:20:00Z"
  }
}
```

### PUT /api/mobile/v1/devices/:id
Update device information (FCM token, app version).

**Headers**: `Authorization: Bearer {access_token}`

**Request Body**:
```json
{
  "app_version": "1.2.4",
  "fcm_token": "new-fcm-token-string"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Device updated successfully"
}
```

### DELETE /api/mobile/v1/devices/:id
Unregister a device.

**Headers**: `Authorization: Bearer {access_token}`

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Device unregistered successfully"
}
```

### GET /api/mobile/v1/profile/notifications
Get notification preferences.

**Headers**: `Authorization: Bearer {access_token}`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "push_enabled": true,
    "preferences": {
      "new_coupon_alerts": true,
      "scan_verification_results": true,
      "coupon_expiry_reminders": false,
      "account_security_alerts": true
    }
  }
}
```

### PUT /api/mobile/v1/profile/notifications
Update notification preferences.

**Headers**: `Authorization: Bearer {access_token}`

**Request Body**:
```json
{
  "push_enabled": true,
  "preferences": {
    "new_coupon_alerts": false,
    "scan_verification_results": true,
    "coupon_expiry_reminders": true
  }
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Notification preferences updated"
}
```

### GET /api/mobile/v1/profile/sessions
View active sessions (devices with valid tokens).

**Headers**: `Authorization: Bearer {access_token}`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "device_id": "uuid",
        "device_name": "iPhone 14 Pro",
        "platform": "iOS",
        "is_current": true,
        "last_active_at": "2025-01-03T15:00:00Z",
        "login_ip": "49.207.XX.XX",
        "login_location": "Mumbai, India"
      }
    ]
  }
}
```

### DELETE /api/mobile/v1/profile/sessions/:device_id
Logout from specific device.

**Headers**: `Authorization: Bearer {access_token}`

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logged out from device successfully"
}
```

### POST /api/mobile/v1/profile/export
Request data export.

**Headers**: `Authorization: Bearer {access_token}`

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Data export ready",
  "data": {
    "download_url": "https://cdn.mscan.com/exports/customer-uuid-data.json",
    "expires_at": "2025-01-04T15:30:00Z",
    "file_size_bytes": 124567
  }
}
```

### DELETE /api/mobile/v1/profile
Delete customer account.

**Headers**: `Authorization: Bearer {access_token}`

**Request Body**:
```json
{
  "confirmation": "DELETE",
  "reason": "No longer need the service"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Account deletion scheduled. Your data will be permanently removed in 30 days."
}
```

## Non-Functional Requirements

### Performance
- Profile fetch: < 200ms
- Profile update: < 300ms
- Picture upload: < 2 seconds for 5MB file
- Device registration: < 250ms

### Security
- Profile picture URLs: Signed URLs with 1-hour expiry
- OTP required for phone/email changes
- Device limit: 5 devices per customer
- Session management: Track active tokens by device

### Privacy
- GDPR compliance: Data export and deletion
- Anonymization on account deletion
- Soft delete with 30-day grace period
- Location data consent required

### Scalability
- Support 1 million customer profiles
- Handle 10,000 profile updates per minute
- CDN for profile pictures (global distribution)
