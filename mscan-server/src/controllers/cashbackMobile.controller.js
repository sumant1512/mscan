/**
 * Cashback Mobile Controller
 * Customer mobile app endpoints for cashback
 */

const cashbackService = require('../services/cashback.service');
const { asyncHandler } = require('../modules/common/middleware/errorHandler.middleware');
const { validateRequiredFields, validatePagination } = require('../modules/common/validators/common.validator');
const { sendSuccess, sendPaginated } = require('../modules/common/utils/response.util');
const db = require('../config/database');

/**
 * Get customer ID from user context
 */
async function getCustomerId(userId, tenantId) {
  const result = await db.query(
    `SELECT c.id FROM customers c
     JOIN users u ON u.phone_e164 = c.phone_e164 AND u.tenant_id = c.tenant_id
     WHERE u.id = $1 AND c.tenant_id = $2`,
    [userId, tenantId]
  );
  if (result.rows.length === 0) {
    throw new Error('Customer record not found');
  }
  return result.rows[0].id;
}

/**
 * Scan a coupon for cashback
 */
exports.scan = asyncHandler(async (req, res) => {
  const { id, tenant_id } = req.user;
  validateRequiredFields(req.body, ['coupon_code']);

  const customerId = await getCustomerId(id, tenant_id);
  const result = await cashbackService.scanCoupon(customerId, tenant_id, req.body.coupon_code);
  return sendSuccess(res, result, 'Scan successful');
});

/**
 * Save UPI ID
 */
exports.saveUpi = asyncHandler(async (req, res) => {
  const { id, tenant_id } = req.user;
  validateRequiredFields(req.body, ['upi_id']);

  const customerId = await getCustomerId(id, tenant_id);
  const result = await cashbackService.saveUpiId(customerId, tenant_id, req.body.upi_id);
  return sendSuccess(res, result, 'UPI ID saved successfully');
});

/**
 * Get UPI details
 */
exports.getUpi = asyncHandler(async (req, res) => {
  const { id, tenant_id } = req.user;

  const customerId = await getCustomerId(id, tenant_id);
  const upiDetails = await cashbackService.getUpiDetails(customerId, tenant_id);
  return sendSuccess(res, { upi_details: upiDetails });
});

/**
 * Claim pending cashback
 */
exports.claim = asyncHandler(async (req, res) => {
  const { id, tenant_id } = req.user;

  const customerId = await getCustomerId(id, tenant_id);
  const result = await cashbackService.claimCashback(customerId, tenant_id);
  return sendSuccess(res, result, 'Cashback claim submitted');
});

/**
 * Get cashback history
 */
exports.getHistory = asyncHandler(async (req, res) => {
  const { id, tenant_id } = req.user;
  const { page, limit } = validatePagination(req.query.page, req.query.limit);
  const { status, from, to } = req.query;

  const customerId = await getCustomerId(id, tenant_id);
  const { transactions, total } = await cashbackService.getCashbackHistory(customerId, tenant_id, { page, limit, status, from, to });
  return sendPaginated(res, transactions, page, limit, total, 'transactions');
});

/**
 * Get cashback balance
 */
exports.getBalance = asyncHandler(async (req, res) => {
  const { id, tenant_id } = req.user;

  const customerId = await getCustomerId(id, tenant_id);
  const balance = await cashbackService.getCashbackBalance(customerId, tenant_id);
  return sendSuccess(res, balance);
});
