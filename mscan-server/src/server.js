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
const rewardsRoutes = require('./routes/rewards.routes');
const batchRoutes = require('./routes/batchRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const productsRoutes = require('./routes/products.routes');
const publicScanRoutes = require('./routes/publicScan.routes');
const mobileAuthRoutes = require('./routes/mobileAuth.routes');
const userCreditsRoutes = require('./routes/userCredits.routes');
const externalAppRoutes = require('./routes/externalApp.routes');
const permissionsRoutes = require('./routes/permissions.routes');
const tenantUsersRoutes = require('./routes/tenantUsers.routes');
const tagRoutes = require('./routes/tag.routes'); // Tag system
const apiConfigRoutes = require('./routes/apiConfig.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const webhooksRoutes = require('./routes/webhooks.routes');
const mobileApiV2Routes = require('./routes/mobileApiV2.routes');
const ecommerceApiRoutes = require('./routes/ecommerceApi.routes');
// Import middleware
const errorHandler = require('./middleware/error.middleware');
const { subdomainMiddleware } = require('./middleware/subdomain.middleware');

// Import new common interceptors and error handling
const { errorHandler: globalErrorHandler } = require('./modules/common/middleware/errorHandler.middleware');
const { requestLogger, requestValidator, sanitizeBody } = require('./modules/common/interceptors/request.interceptor');
const { securityHeaders, compressionHints } = require('./modules/common/interceptors/response.interceptor');

// Import new modular routes
const superAdminRoutes = require('./modules/super-admin/routes/index');
const tenantAdminRoutes = require('./modules/tenant-admin/routes/index');

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

// Apply common interceptors
app.use(securityHeaders);
app.use(compressionHints);
app.use(requestLogger);
app.use(sanitizeBody);

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
  const dbHealth = await db.checkHealth();

  if (dbHealth.success) {
    res.json({
      status: 'healthy',
      server: 'running',
      database: dbHealth.status,
      timestamp: dbHealth.timestamp,
      responseTime: dbHealth.responseTime
    });
  } else {
    res.status(503).json({
      status: 'unhealthy',
      server: 'running',
      database: dbHealth.status,
      error: dbHealth.error,
      timestamp: new Date().toISOString(),
      responseTime: dbHealth.responseTime
    });
  }
});

// ============================================
// API Routes
// ============================================

// Core routes (refactored with modular structure)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Super Admin routes (from modules/super-admin but same URLs)
const superAdminTenantRoutes = require('./modules/super-admin/routes/tenant.routes');
const creditsRoutes = require('./routes/credits.routes'); // Unified credits router (routes by role)
app.use('/api/tenants', superAdminTenantRoutes);
app.use('/api/credits', creditsRoutes);

// Tenant Admin routes (from modules/tenant-admin but same URLs)
const tenantAdminTemplateRoutes = require('./modules/tenant-admin/routes/template.routes');
app.use('/api/templates', tenantAdminTemplateRoutes);

// Other routes
app.use('/api/rewards', rewardsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/tenant/batches', batchRoutes);
app.use('/api/tenant/rewards/campaigns', campaignRoutes);
app.use('/api/public/scan', publicScanRoutes);
app.use('/api/mobile/v1/auth', mobileAuthRoutes);
app.use('/api/mobile/v1/scan', require('./routes/mobileScan.routes'));
app.use('/api/mobile/v2', mobileApiV2Routes);
app.use('/api/ecommerce/v1', ecommerceApiRoutes);
app.use('/api/v1/permissions', permissionsRoutes);
app.use('/api/v1/tenants', tenantUsersRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/verification-apps', apiConfigRoutes);
app.use('/api', inventoryRoutes);
app.use('/api', webhooksRoutes);
app.use('/api', userCreditsRoutes);
app.use('/api/app', externalAppRoutes); // External app routes - scoped to /api/app/* to prevent intercepting other routes

// ============================================
// Error Handling
// ============================================
// Use new global error handler (handles AppError instances)
app.use(globalErrorHandler);
// Fallback to legacy error handler for backward compatibility
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
    return res.status(500).json({ status: false, error: 'server_error' });
  }
});

// 404 Handler (must be after all routes)
app.use('*', (req, res) => {
  res.status(404).json({
    status: false,
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
    return res.status(500).json({ status: false, error: 'server_error' });
  }
});

// ============================================
// Start Server (with Database Health Check)
// ============================================
async function startServer() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║            MScan Server - Starting Up                 ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    // Step 1: Check Database Connection
    console.log('🔍 Checking database connection...');
    const dbHealth = await db.checkHealth();

    if (!dbHealth.success) {
      // Database is not healthy
      console.error('\n❌ DATABASE CONNECTION FAILED!\n');
      console.error('Error Details:');
      console.error(`  • Message: ${dbHealth.error}`);
      console.error(`  • Code: ${dbHealth.code || 'N/A'}`);
      console.error(`  • Response Time: ${dbHealth.responseTime}`);
      console.error('\nDatabase Configuration:');
      console.error(`  • Host: ${dbHealth.config.host}`);
      console.error(`  • Port: ${dbHealth.config.port}`);
      console.error(`  • Database: ${dbHealth.config.database}`);
      console.error(`  • User: ${dbHealth.config.user}`);
      console.error('\n💡 Troubleshooting:');
      console.error('  1. Check if PostgreSQL is running');
      console.error('  2. Verify database exists: npm run db:setup');
      console.error('  3. Check .env configuration');
      console.error('  4. Test connection: psql -h localhost -U postgres -d mscan_db');
      console.error('\n🛑 Server startup aborted.\n');
      process.exit(1);
    }

    // Database is healthy
    console.log('✅ Database connection successful!');
    console.log(`  • Database: ${dbHealth.database}`);
    console.log(`  • Response Time: ${dbHealth.responseTime}`);
    console.log(`  • Status: ${dbHealth.status}`);

    // Step 2: Start HTTP Server
    console.log('\n🚀 Starting HTTP server...');
    const server = app.listen(PORT, () => {
      console.log('\n╔═══════════════════════════════════════════════════════╗');
      console.log('║            MScan Server - Ready!                      ║');
      console.log('╚═══════════════════════════════════════════════════════╝');
      console.log(`\n📡 Server: http://localhost:${PORT}`);
      console.log(`📝 API: http://localhost:${PORT}/api`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: ${dbHealth.config.database}`);
      console.log('\n✨ Ready to accept requests!\n');
    });

    // Graceful Shutdown
    process.on('SIGTERM', () => {
      console.log('\n⚠️  SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('✅ HTTP server closed');
        db.pool.end(() => {
          console.log('✅ Database pool closed');
          process.exit(0);
        });
      });
    });

    process.on('SIGINT', () => {
      console.log('\n\n⚠️  SIGINT signal received: closing HTTP server');
      server.close(() => {
        console.log('✅ HTTP server closed');
        db.pool.end(() => {
          console.log('✅ Database pool closed');
          process.exit(0);
        });
      });
    });

    return server;

  } catch (error) {
    console.error('\n❌ FATAL ERROR during startup!');
    console.error(error);
    console.error('\n🛑 Server startup aborted.\n');
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;
