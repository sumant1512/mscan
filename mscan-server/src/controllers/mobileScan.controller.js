/**
 * Mobile Scan Controller
 * Refactored to use modern error handling and validators
 */

const db = require('../config/database');
const mobileScanService = require('../services/mobileScan.service');
const { asyncHandler } = require('../modules/common/middleware/errorHandler.middleware');
const {
  AuthenticationError,
  ValidationError,
  NotFoundError
} = require('../modules/common/errors/AppError');
const {
  validateRequiredFields
} = require('../modules/common/validators/common.validator');
const {
  sendSuccess
} = require('../modules/common/utils/response.util');

/**
 * POST /api/mobile/v1/scan
 * Scan and verify coupon for authenticated customer
 */
exports.scanCoupon = asyncHandler(async (req, res) => {
  const { coupon_code, app_code, location, scanned_at, device_info } = req.body;

  validateRequiredFields(req.body, ['coupon_code', 'app_code']);

  // Get customer from JWT token (set by authenticate middleware)
  const customerId = req.user?.customerId;
  const customerPhone = req.user?.phone_e164;
  const tenantId = req.tenant?.id;

  if (!customerId || !tenantId) {
    throw new AuthenticationError('Invalid or expired token', 'unauthorized');
  }

  // Process the scan
  const result = await mobileScanService.processScan({
    customerId,
    customerPhone,
    tenantId,
    couponCode: coupon_code,
    appCode: app_code,
    location,
    scannedAt: scanned_at || new Date().toISOString(),
    deviceInfo: device_info
  });

  // Return appropriate response based on result
  const statusCode = result.success ? 200 : (result.statusCode || 400);
  return res.status(statusCode).json(result);
});

/**
 * GET /api/mobile/v1/scan/history
 * Get scan transaction history for authenticated customer
 */
exports.getScanHistory = asyncHandler(async (req, res) => {
  const customerId = req.user?.customerId;
  const tenantId = req.tenant?.id;

  if (!customerId || !tenantId) {
    throw new AuthenticationError('Invalid or expired token', 'unauthorized');
  }

  // Parse query parameters
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const status = req.query.status; // 'SUCCESS', 'EXPIRED', etc.
  const app_code = req.query.app_code;
  const from_date = req.query.from_date;
  const to_date = req.query.to_date;
  const sort = req.query.sort || 'desc';

  // Get scan history
  const result = await mobileScanService.getScanHistory({
    customerId,
    tenantId,
    page,
    limit,
    status,
    appCode: app_code,
    fromDate: from_date,
    toDate: to_date,
    sort
  });

  return res.status(200).json(result);
});

/**
 * GET /api/mobile/v1/scan/:id
 * Get specific scan transaction details
 */
exports.getScanDetails = asyncHandler(async (req, res) => {
  const scanId = req.params.id;
  const customerId = req.user?.customerId;
  const tenantId = req.tenant?.id;

  if (!customerId || !tenantId) {
    throw new AuthenticationError('Invalid or expired token', 'unauthorized');
  }

  // Get scan details
  const result = await mobileScanService.getScanDetails({
    scanId,
    customerId,
    tenantId
  });

  if (!result.success) {
    return res.status(404).json(result);
  }

  return res.status(200).json(result);
});

/**
 * GET /api/mobile/v1/scan/stats/summary
 * Get scan statistics for authenticated customer
 */
exports.getScanStats = asyncHandler(async (req, res) => {
  const customerId = req.user?.customerId;
  const tenantId = req.tenant?.id;

  if (!customerId || !tenantId) {
    throw new AuthenticationError('Invalid or expired token', 'unauthorized');
  }

  // Get statistics
  const result = await mobileScanService.getScanStats({
    customerId,
    tenantId
  });

  return res.status(200).json(result);
});
