# Root Cause Analysis: Missing Authorization Header

## 🎯 The Mystery

**Symptoms:**
- ✅ Auth interceptor runs (console logs confirm)
- ✅ Interceptor adds Authorization header to request object
- ✅ Token exists in localStorage
- ✅ Direct fetch() call works
- ❌ Angular HttpClient request fails with "No token provided"
- ❌ Authorization header NOT visible in Network tab for HttpClient requests

## 🔍 What I Found

### 1. **Interceptor Code is Correct**

Your interceptor at `mscan-client/src/app/core/interceptors/auth.interceptor.ts` is working properly:

```typescript
const accessToken = localStorage.getItem('tms_access_token');

if (accessToken) {
  req = req.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

return next(req).pipe(...);
```

The header IS being added to the request object. Your console log at line 38 confirms this.

### 2. **CORS Configuration Issue Detected**

I tested your server's CORS preflight response:

```bash
curl -I -X OPTIONS http://sumant.localhost:8080/api/products
```

**Server Response:**
```
HTTP/1.1 204 No Content
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
Vary: Origin, Access-Control-Request-Headers
```

**❌ MISSING:**
```
Access-Control-Allow-Headers: Content-Type, Authorization, X-Tenant-ID
```

### 3. **The CORS Preflight Flow (What's Happening)**

When Angular HttpClient makes a cross-origin request with custom headers:

```
1. Browser: "I want to send a GET request to /api/products with Authorization header"

2. Browser → Server: OPTIONS /api/products
   (Preflight request asking "Am I allowed to send Authorization header?")

3. Server → Browser:
   ✅ Access-Control-Allow-Methods: GET, POST, ...
   ❌ Access-Control-Allow-Headers: [NOT SPECIFIED OR INCOMPLETE]

4. Browser thinks: "Server didn't say Authorization is allowed, so I'll strip it"

5. Browser → Server: GET /api/products
   (WITHOUT Authorization header)

6. Server → Browser: 401 "No token provided"
```

## 🎓 Why This Happens

### Your Server Has TWO CORS Configurations:

**1. Main CORS Middleware** (server.js:53-81)
```javascript
const corsOptions = {
  origin: function(origin, callback) {
    // ... origin validation ...
  },
  credentials: true  // ← This is set
  // ❌ allowedHeaders is NOT set!
};

app.use(cors(corsOptions));
```

**2. Custom CORS Headers** (modules/common/interceptors/response.interceptor.js:97-110)
```javascript
const corsHeaders = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID');
  // ... other headers ...
};
```

**The Problem:**
- The `cors()` middleware handles OPTIONS preflight requests
- Your `corsHeaders` middleware is NOT being applied to OPTIONS requests
- So preflight responses don't include `Access-Control-Allow-Headers`
- Browser blocks the Authorization header

## 🤔 Why Does fetch() Work?

When you test with fetch() from the browser console on a page already at `http://sumant.localhost:4200`, the browser might:

1. **Reuse existing CORS preflight cache** - If you previously made a request that allowed the header
2. **Different CORS rules** - DevTools console sometimes has relaxed CORS
3. **No preflight** - Simple requests don't trigger preflight

Also, if you're testing fetch() from the same origin (http://sumant.localhost:4200 → http://sumant.localhost:8080), both are `localhost`, so some browsers treat it as same-origin for certain purposes.

## 🧩 The Angular HttpClient Difference

### Why HttpClient Triggers This But fetch() Doesn't:

**Angular HttpClient:**
```typescript
this.http.get(url)  // Angular sets specific headers that trigger CORS preflight
```

Angular's HttpClient automatically adds headers like:
- `Accept: application/json, text/plain, */*`
- Custom headers from interceptors
- These trigger a CORS preflight request

**Native fetch():**
```javascript
fetch(url, { headers: { Authorization: '...' }})  // Might not trigger preflight in some cases
```

Depending on how fetch is called, it might:
- Not trigger preflight if it's a "simple request"
- Use cached preflight results
- Have different browser handling

## 📊 Request Flow Comparison

### What Should Happen (Working):
```
1. HttpClient: GET /api/products
2. Interceptor: Add Authorization header ✅
3. Browser: Send OPTIONS preflight ✅
4. Server: Respond with Access-Control-Allow-Headers: Authorization ✅
5. Browser: Send GET with Authorization header ✅
6. Server: Process request ✅
```

### What's Actually Happening (Broken):
```
1. HttpClient: GET /api/products
2. Interceptor: Add Authorization header ✅
3. Browser: Send OPTIONS preflight ✅
4. Server: Respond WITHOUT Access-Control-Allow-Headers ❌
5. Browser: Strip Authorization header ❌
6. Browser: Send GET WITHOUT Authorization header ❌
7. Server: "No token provided" ❌
```

## 🔧 The Fix (Not Implementing, Just Explaining)

To fix this, you need to ensure the CORS middleware includes `allowedHeaders`:

```javascript
const corsOptions = {
  origin: function(origin, callback) {
    // ... existing origin validation ...
  },
  credentials: true,
  // ADD THIS:
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
  // OR use:
  // allowedHeaders: '*'  // Allow all headers (less secure but works)
};
```

This will make the server respond to OPTIONS requests with:
```
Access-Control-Allow-Headers: Content-Type, Authorization, X-Tenant-ID
```

Then the browser will allow the Authorization header through.

## 🎯 Summary

**Root Cause:**
Your server's CORS configuration is missing `allowedHeaders`, so the browser strips the Authorization header from HttpClient requests (but not from simple fetch() calls in some scenarios).

**The Flow:**
1. ✅ Interceptor adds header correctly
2. ✅ Request object has the header
3. ❌ CORS preflight response doesn't allow Authorization header
4. ❌ Browser strips the header before sending
5. ❌ Server receives request without header

**Evidence:**
- `curl -I -X OPTIONS http://sumant.localhost:8080/api/products` shows no `Access-Control-Allow-Headers`
- Interceptor logs show header is added
- Network tab shows header is missing
- Server says "No token provided"

**Why Your Logs Show the Header:**
The console logs show the request object in JavaScript memory. At that point, the header IS present. But when the browser actually sends the HTTP request over the network, it strips the header due to CORS policy.

**Why fetch() Works:**
fetch() might bypass the preflight in certain scenarios, or it's using a cached successful preflight from a previous request, or browser DevTools has different CORS handling.

## 📝 What to Check in Your Console

When you look at the console log you added:
```javascript
if(req.url.includes('/products')) {
  console.log('*****************📦 Requesting products with token:', req);
}
```

Expand that `req` object and check:
```javascript
req.headers  // This is an HttpHeaders object
```

You should see the Authorization header listed there. This confirms the interceptor is working.

But the key is checking the **Network tab**, not the console. The Network tab shows what the browser ACTUALLY sent, after CORS filtering.

## 🎬 The Complete Picture

```
┌─────────────────────────────────────────────────────────────┐
│ Angular App (http://sumant.localhost:4200)                  │
│                                                              │
│  1. Component calls HttpClient.get('/api/products')         │
│  2. Auth Interceptor adds Authorization header ✅           │
│  3. Request object in memory has the header ✅              │
│     (This is what console.log shows)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Browser (Chrome/Firefox/etc)                                │
│                                                              │
│  4. Browser: "This is cross-origin with custom headers"     │
│  5. Browser sends OPTIONS preflight                         │
│     OPTIONS http://sumant.localhost:8080/api/products       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Server (http://sumant.localhost:8080)                       │
│                                                              │
│  6. CORS middleware processes OPTIONS                       │
│  7. Responds with:                                          │
│     Access-Control-Allow-Methods: GET, POST, ...  ✅        │
│     Access-Control-Allow-Headers: [MISSING!]  ❌            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Browser (Chrome/Firefox/etc)                                │
│                                                              │
│  8. Browser: "Server didn't allow Authorization header"     │
│  9. Browser STRIPS Authorization header from request ❌     │
│  10. Browser sends actual GET request WITHOUT header        │
│      GET http://sumant.localhost:8080/api/products          │
│      Headers: [Content-Type, Accept] (NO Authorization!)   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Server (http://sumant.localhost:8080)                       │
│                                                              │
│  11. Auth middleware checks req.headers.authorization       │
│  12. Header is missing!                                     │
│  13. Returns: 401 "No token provided" ❌                    │
└─────────────────────────────────────────────────────────────┘
```

## 🔍 How to Verify This Theory

### Test 1: Check Preflight Headers
```bash
curl -v -X OPTIONS \
  -H "Origin: http://sumant.localhost:4200" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" \
  http://sumant.localhost:8080/api/products
```

Look for `Access-Control-Allow-Headers` in the response.

### Test 2: Check Browser Network Tab

1. Open Network tab
2. Filter for `/products`
3. Look for TWO requests:
   - **OPTIONS** /api/products (preflight)
   - **GET** /api/products (actual request)
4. Click on OPTIONS request → Headers tab → Response Headers
5. Check if `Access-Control-Allow-Headers` includes "authorization"
6. Click on GET request → Headers tab → Request Headers
7. Check if `Authorization: Bearer ...` is present

If OPTIONS response doesn't include Authorization in allowed headers, then GET request won't have the header.

## 🎓 Technical Details

### CORS Simple vs Preflight Requests

**Simple Request (no preflight):**
- Methods: GET, POST, HEAD
- Headers: Accept, Accept-Language, Content-Language, Content-Type (only certain values)
- No custom headers

**Preflight Request (requires OPTIONS):**
- Any method other than GET/POST/HEAD
- Custom headers (like Authorization)
- Content-Type other than application/x-www-form-urlencoded, multipart/form-data, or text/plain

Your request has `Authorization` header, so it ALWAYS requires preflight.

### Why the Interceptor Logs Show Success

The Angular interceptor runs in the JavaScript execution context. It modifies the request object in memory. The console.log shows this in-memory object.

But after the interceptor returns, the browser's network stack takes over. The browser:
1. Checks CORS policy
2. Sends preflight if needed
3. Strips headers that aren't allowed
4. Sends the actual request

So you see "Header added ✅" in console, but the actual network request doesn't have it.

This is the strange behavior you're experiencing!
