# Authentication Debug Guide

## Issue: "No token provided" Error

When you get this error, it means the JWT token is not being sent with the API request.

## Quick Check

### 1. Check if you're logged in

Open browser DevTools (F12) → Console and run:
```javascript
localStorage.getItem('tms_access_token')
```

**Expected Result:**
- If logged in: You'll see a long JWT token string
- If NOT logged in: `null`

### 2. Check all auth-related items
```javascript
console.log({
  accessToken: localStorage.getItem('tms_access_token'),
  refreshToken: localStorage.getItem('tms_refresh_token'),
  userType: localStorage.getItem('tms_user_type'),
  subdomain: localStorage.getItem('tms_tenant_subdomain')
});
```

## Common Issues & Solutions

### Issue 1: Token is `null` (Not Logged In)
**Solution:** Log in first
1. Navigate to the login page
2. Enter your credentials
3. Complete the OTP verification
4. The token will be automatically stored

### Issue 2: Token Expired
**Symptom:** Token exists but still getting 401 errors

**Solution:** The auth interceptor should automatically refresh the token. If it doesn't work:
1. Clear localStorage: `localStorage.clear()`
2. Refresh the page
3. Log in again

### Issue 3: Wrong Subdomain
**Symptom:** Logged in on `tenant1.localhost` but trying to access `tenant2.localhost`

**Solution:** Tokens are subdomain-specific
1. Log out from current subdomain
2. Navigate to correct subdomain
3. Log in there

### Issue 4: CORS or Network Issues
**Symptom:** Token exists but requests fail

**Check:**
```javascript
// In browser console
fetch('http://sumant.localhost:3000/api/auth/context', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('tms_access_token')}`
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## How Authentication Works

### 1. Login Flow
```
User enters email → Request OTP
  ↓
OTP sent to email
  ↓
User enters OTP → Verify OTP
  ↓
Server returns: { accessToken, refreshToken, userType, subdomain }
  ↓
Client stores in localStorage:
  - tms_access_token
  - tms_refresh_token
  - tms_user_type
  - tms_tenant_subdomain
```

### 2. API Request Flow
```
Component makes API request (e.g., getProducts())
  ↓
Auth Interceptor runs:
  - Reads token from localStorage
  - Adds to request headers: Authorization: Bearer <token>
  ↓
Server validates token
  ↓
Success: Returns data
  OR
Fail (401): Interceptor tries to refresh token
```

### 3. Token Refresh Flow
```
API returns 401 (token expired)
  ↓
Interceptor reads refreshToken from localStorage
  ↓
Calls /auth/refresh with refreshToken
  ↓
Server returns new accessToken and refreshToken
  ↓
Interceptor stores new tokens
  ↓
Retries original request with new token
```

## Auth Interceptor Location
File: `mscan-client/src/app/core/interceptors/auth.interceptor.ts`

**Key Logic:**
```typescript
// Line 24: Read token from localStorage
const accessToken = localStorage.getItem('tms_access_token');

// Line 26-30: Add to request headers
if (accessToken) {
  req = req.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}
```

## Debugging Steps

### Step 1: Verify Token Exists
```javascript
// Should return a JWT token
localStorage.getItem('tms_access_token')
```

### Step 2: Decode Token (Check Expiry)
```javascript
// Decode JWT token (client-side only, don't trust this on server!)
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

const token = localStorage.getItem('tms_access_token');
if (token) {
  const decoded = parseJwt(token);
  console.log('Token Payload:', decoded);
  console.log('Expires:', new Date(decoded.exp * 1000));
  console.log('Is Expired:', Date.now() >= decoded.exp * 1000);
}
```

### Step 3: Check Network Request
Open DevTools → Network Tab:
1. Make an API request (e.g., load products)
2. Click on the request in Network tab
3. Go to "Headers" tab
4. Check "Request Headers"
5. Look for: `Authorization: Bearer <token>`

**If Authorization header is missing:** Interceptor not working
**If Authorization header exists but error persists:** Server-side issue

### Step 4: Test Auth Endpoint Directly
```javascript
// Test if your token is valid
fetch('http://sumant.localhost:3000/api/auth/context', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('tms_access_token')}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  if (data.status) {
    console.log('✅ Token is valid!', data);
  } else {
    console.log('❌ Token invalid:', data);
  }
})
.catch(error => console.error('Error:', error));
```

## Quick Fixes

### Fix 1: Force Re-login
```javascript
// Clear everything and start fresh
localStorage.clear();
window.location.href = '/login';
```

### Fix 2: Manual Token Refresh
```javascript
// Try refreshing the token manually
const refreshToken = localStorage.getItem('tms_refresh_token');
if (refreshToken) {
  fetch('http://sumant.localhost:3000/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  })
  .then(r => r.json())
  .then(data => {
    if (data.status && data.data) {
      localStorage.setItem('tms_access_token', data.data.accessToken);
      localStorage.setItem('tms_refresh_token', data.data.refreshToken);
      console.log('✅ Token refreshed!');
      window.location.reload();
    }
  });
}
```

### Fix 3: Check if Server is Running
```bash
# Check if backend is running
curl http://sumant.localhost:3000/api/auth/health
```

## For Your Current Issue

Based on the error you're seeing, try this:

### Option A: Check if Logged In
```javascript
// In browser console
const token = localStorage.getItem('tms_access_token');
console.log('Token exists:', !!token);
console.log('Token:', token ? token.substring(0, 50) + '...' : 'null');
```

### Option B: Re-login
1. Navigate to: `http://sumant.localhost:4200/login`
2. Log in with your credentials
3. After successful login, try accessing products again

### Option C: Check Subdomain
Ensure you're on the correct subdomain:
- If you're a tenant user, access via: `http://yoursubdomain.localhost:4200/`
- If you're a super admin, access via: `http://localhost:4200/` or `http://sumant.localhost:4200/`

## Expected Behavior

### After Login
✅ Token stored in localStorage
✅ User redirected to dashboard
✅ All API requests include Authorization header
✅ Products load successfully

### When Token Expires (after ~30 min)
✅ First API call fails with 401
✅ Interceptor auto-refreshes token
✅ Original request retries with new token
✅ User stays logged in (seamless)

### When Refresh Fails
✅ Tokens cleared from localStorage
✅ User redirected to /login
✅ User must log in again

## Server-Side Check

If the token exists but server still says "No token provided", check the server:

```javascript
// Server-side: mscan-server/src/middleware/auth.middleware.js
// Should be extracting token from:
// req.headers.authorization
// Format: "Bearer <token>"
```

Make sure the server's auth middleware is:
1. Reading the Authorization header
2. Extracting the token (removing "Bearer " prefix)
3. Validating the token

## Still Not Working?

If you've tried everything above and it still doesn't work:

1. **Check browser console** for any error messages
2. **Check network tab** to see the actual request headers
3. **Check server logs** for authentication errors
4. **Verify environment** - are you using the correct API URL?

Run this diagnostic script:
```javascript
// Complete diagnostic
console.log('=== AUTH DIAGNOSTIC ===');
console.log('Token:', localStorage.getItem('tms_access_token') ? 'EXISTS' : 'MISSING');
console.log('Refresh Token:', localStorage.getItem('tms_refresh_token') ? 'EXISTS' : 'MISSING');
console.log('User Type:', localStorage.getItem('tms_user_type'));
console.log('Subdomain:', localStorage.getItem('tms_tenant_subdomain'));
console.log('Current URL:', window.location.href);
console.log('API URL:', 'Check in environment.ts');
```
