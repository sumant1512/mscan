# Test Products API - Authentication Issue

## Quick Test

Open browser console (F12) and run this:

```javascript
// Test 1: Check if token exists
const token = localStorage.getItem('tms_access_token');
console.log('Token exists:', !!token);
console.log('Token preview:', token ? token.substring(0, 50) + '...' : 'NO TOKEN');

// Test 2: Make direct request with token
if (token) {
  fetch('http://sumant.localhost:3000/api/products?search=&app_id=b3fe1206-da13-40b6-9259-8082ca15430f', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(r => r.json())
  .then(data => {
    console.log('✅ Direct API call result:', data);
  })
  .catch(err => {
    console.error('❌ Direct API call failed:', err);
  });
} else {
  console.error('❌ NO TOKEN - Please log in first!');
}

// Test 3: Check interceptor is registered
console.log('HTTP Interceptors:', 'Check Network tab for Authorization header');
```

## Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Try to load products
4. Click on the `/api/products` request
5. Go to "Headers" tab
6. Look for **Request Headers** section
7. Check if **Authorization: Bearer ...** header is present

### If Authorization header is MISSING:
- The auth interceptor is not running
- This is a client-side issue

### If Authorization header is PRESENT:
- The token is being sent
- Server is rejecting it
- Check server logs

## Potential Issues

### Issue 1: Not Logged In
**Solution:**
```javascript
localStorage.getItem('tms_access_token') // Should return a token, not null
```
If null, log in first.

### Issue 2: Wrong Subdomain
**Current URL:** Check `window.location.href`
**Token subdomain:** Check `localStorage.getItem('tms_tenant_subdomain')`

They should match!

### Issue 3: HttpClient Not Injected Properly
Check if ProductsService is using `@angular/common/http` HttpClient:

```typescript
// In products.service.ts
import { HttpClient } from '@angular/common/http'; // ✅ Correct
// NOT
import { Http } from '@angular/http'; // ❌ Wrong (old Angular)
```

### Issue 4: Request Made Before Interceptor Registered
This can happen if:
- Service makes request in constructor
- Request made before app fully initialized

## Debug Steps

### Step 1: Verify Token Exists
```javascript
console.log('Token:', localStorage.getItem('tms_access_token') ? 'EXISTS' : 'MISSING');
```

### Step 2: Check Request Headers in Network Tab
1. F12 → Network tab
2. Try loading products
3. Click the `/api/products` request
4. Check if `Authorization: Bearer <token>` is in Request Headers

### Step 3: Compare with Working API
Try another API that works (e.g., tags):
```javascript
// Test tags API (if it works)
fetch('http://sumant.localhost:3000/api/tags', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('tms_access_token')}`
  }
})
.then(r => r.json())
.then(console.log);
```

### Step 4: Check Server Logs
If Authorization header is being sent but server says "No token provided", check server logs:
```bash
# In server terminal
# Look for log output when request is made
```

## Common Solutions

### Solution 1: Re-login
```javascript
localStorage.clear();
window.location.href = '/login';
```

### Solution 2: Hard Refresh
```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

### Solution 3: Check Permission
The products API requires `view_products` permission.

Check if your user has this permission:
```javascript
// After logging in, check user context
fetch('http://sumant.localhost:3000/api/auth/context', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('tms_access_token')}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('User permissions:', data.data.permissions);
  console.log('Has view_products:', data.data.permissions.includes('view_products'));
});
```

## Most Likely Cause

Based on the error "No token provided" for ONLY the products API:

1. **Check if you're logged in as the right user type**
   - Products API blocks SUPER_ADMIN users (see products.routes.js line 14)
   - You must log in as a TENANT_ADMIN or TENANT_USER

2. **Check the Network tab**
   - If Authorization header is missing → Client issue (interceptor not running)
   - If Authorization header is present → Server issue (middleware problem)

3. **Try this test:**
```javascript
// Check your user role
fetch('http://sumant.localhost:3000/api/auth/context', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('tms_access_token')}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('Your role:', data.data.role);
  if (data.data.role === 'SUPER_ADMIN') {
    console.warn('⚠️ SUPER_ADMIN cannot access products API!');
    console.log('📌 Log in as TENANT_ADMIN or TENANT_USER instead');
  }
});
```

## Expected Behavior

✅ **Working State:**
- Token in localStorage
- Authorization header in request
- User role: TENANT_ADMIN or TENANT_USER
- User has `view_products` permission
- Server returns products data

❌ **Current State:**
- Getting: `{status: false, message: "No token provided"}`
- Only for products API
- Other APIs work fine

This suggests either:
1. You're logged in as SUPER_ADMIN (products API explicitly blocks this)
2. The Authorization header is not being added to products requests (check Network tab)

**Next Step:** Run the tests above and report what you see in the Network tab!
