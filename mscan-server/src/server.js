/**
 * Main Server Application
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const tenantRoutes = require('./routes/tenant.routes');
const creditRoutes = require('./routes/credit.routes');
const rewardsRoutes = require('./routes/rewards.routes');
const categoryRoutes = require('./routes/categoryRoutes');
const batchRoutes = require('./routes/batchRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const productsRoutes = require('./routes/products.routes');
const categoriesRoutes = require('./routes/categories.routes');
const publicScanRoutes = require('./routes/publicScan.routes');
const mobileAuthRoutes = require('./routes/mobileAuth.routes');
// Import middleware
const errorHandler = require('./middleware/error.middleware');
const { subdomainMiddleware } = require('./middleware/subdomain.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middleware
// ============================================
app.use(helmet());

// CORS Configuration - Support wildcard subdomains
const baseDomain = process.env.DOMAIN_BASE || 'localhost';
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      `http://localhost:4200`,
      `http://localhost:3000`,
      `http://${baseDomain}`,
      `https://${baseDomain}`,
    ];
    
    // Check if origin matches allowed origins or subdomain pattern
    const isAllowed = allowedOrigins.includes(origin) ||
      // Match http://subdomain.localhost:port or http://subdomain.localhost
      /^https?:\/\/[a-z0-9-]+\.localhost(:\d+)?$/.test(origin) ||
      // Match https://subdomain.domain.tld or http://subdomain.domain.tld
      new RegExp(`^https?://[a-z0-9-]+\\.${baseDomain.replace('.', '\\.')}$`).test(origin);
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Subdomain detection middleware (must be before routes)
app.use(subdomainMiddleware);

// Request logging
app.use((req, res, next) => {
  const subdomain = req.subdomain || 'root';
  const tenant = req.tenant ? req.tenant.tenant_name : 'N/A';
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} [${subdomain}] [${tenant}]`);
  next();
});

// ============================================
// Health Check
// ============================================
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

// ============================================
// API Routes
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/tenant/categories', categoryRoutes);
app.use('/api/tenant/batches', batchRoutes);
app.use('/api/tenant/rewards/campaigns', campaignRoutes);
app.use('/api/public/scan', publicScanRoutes);
app.use('/api/mobile/v1/auth', mobileAuthRoutes);

// ============================================
// Error Handling
// ============================================
app.use(errorHandler);

// ============================================
// 404 Handler
// ============================================

// Public QR landing route
app.get('/scan/:coupon_code', async (req, res) => {
  try {
    const { coupon_code } = req.params;
    const tenantId = req.tenant ? req.tenant.id : null;
    const result = await db.query(
      'SELECT id, tenant_id, coupon_code, status FROM coupons WHERE coupon_code = $1 AND ($2::uuid IS NULL OR tenant_id = $2::uuid) LIMIT 1',
      [coupon_code, tenantId]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'invalid_or_redeemed_coupon',
        message: 'Invalid or redeemed coupon. Please contact support.'
      });
    }
    const coupon = result.rows[0];
    if (coupon.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'invalid_or_redeemed_coupon',
        message: 'Coupon is not active.'
      });
    }
    res.set('Cache-Control', 'no-store');
    return res.json({
      success: true,
      message: 'Login to get award',
      coupon_code,
      status: 'pending-verification'
    });
  } catch (err) {
    console.error('Landing route error:', err);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

// 404 Handler (must be after all routes)
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});


// ============================================
// Start Server
// ============================================
// Public QR landing route
app.get('/scan/:coupon_code', async (req, res) => {
  try {
    const { coupon_code } = req.params;
    const tenantId = req.tenant ? req.tenant.id : null;
    const result = await db.query(
      'SELECT id, tenant_id, coupon_code, status FROM coupons WHERE coupon_code = $1 AND ($2::uuid IS NULL OR tenant_id = $2::uuid) LIMIT 1',
      [coupon_code, tenantId]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'invalid_or_redeemed_coupon',
        message: 'Invalid or redeemed coupon. Please contact support.'
      });
    }
    const coupon = result.rows[0];
    if (coupon.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'invalid_or_redeemed_coupon',
        message: 'Coupon is not active.'
      });
    }
    res.set('Cache-Control', 'no-store');
    return res.json({
      success: true,
      message: 'Login to get award',
      coupon_code,
      status: 'pending-verification'
    });
  } catch (err) {
    console.error('Landing route error:', err);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

app.listen(PORT, () => {
  console.log('\n🚀 TMS Server Started');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📝 API Base: http://localhost:${PORT}/api`);
  console.log('\n✨ Ready to accept requests\n');
});

// ============================================
// Graceful Shutdown
// ============================================
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    db.pool.end();
  });
});

module.exports = app;
