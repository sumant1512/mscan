/**
 * Dealer Mobile Controller
 * Mobile app endpoints for dealers
 */

const dealerScanService = require('../services/dealerScan.service');
const { asyncHandler } = require('../modules/common/middleware/errorHandler.middleware');
const { validateRequiredFields, validatePagination } = require('../modules/common/validators/common.validator');
const { sendSuccess, sendPaginated } = require('../modules/common/utils/response.util');

/**
 * Scan a coupon QR code
 */
exports.scan = asyncHandler(async (req, res) => {
  const { dealerId, tenant_id } = req.user;
  validateRequiredFields(req.body, ['coupon_code']);

  const result = await dealerScanService.processDealerScan(dealerId, tenant_id, req.body.coupon_code);
  return sendSuccess(res, result, 'Scan successful');
});

/**
 * Get points balance
 */
exports.getPoints = asyncHandler(async (req, res) => {
  const { dealerId, tenant_id } = req.user;
  const points = await dealerScanService.getPoints(dealerId, tenant_id);
  return sendSuccess(res, points);
});

/**
 * Get point transaction history
 */
exports.getPointHistory = asyncHandler(async (req, res) => {
  const { dealerId, tenant_id } = req.user;
  const { page, limit } = validatePagination(req.query.page, req.query.limit);

  const { from, to } = req.query;
  const { transactions, total } = await dealerScanService.getPointHistory(dealerId, tenant_id, { page, limit, from, to });
  return sendPaginated(res, transactions, page, limit, total, 'transactions');
});

/**
 * Get dealer profile
 */
exports.getProfile = asyncHandler(async (req, res) => {
  const { id, tenant_id } = req.user;
  const profile = await dealerScanService.getProfile(id, tenant_id);
  return sendSuccess(res, profile);
});
