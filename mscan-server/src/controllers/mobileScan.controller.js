const db = require('../config/database');
const mobileScanService = require('../services/mobileScan.service');

/**
 * POST /api/mobile/v1/scan
 * Scan and verify coupon for authenticated customer
 */
exports.scanCoupon = async (req, res) => {
  try {
    const { coupon_code, app_code, location, scanned_at, device_info } = req.body;

    // Validate required fields
    if (!coupon_code || !app_code) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        message: 'coupon_code and app_code are required'
      });
    }

    // Get customer from JWT token (set by authenticate middleware)
    const customerId = req.user?.customerId;
    const customerPhone = req.user?.phone_e164;
    const tenantId = req.tenant?.id;

    if (!customerId || !tenantId) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Invalid or expired token'
      });
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
    if (result.success) {
      return res.status(200).json(result);
    } else {
      const statusCode = result.statusCode || 400;
      return res.status(statusCode).json(result);
    }

  } catch (error) {
    console.error('Error in scanCoupon:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'An error occurred while processing the scan'
    });
  }
};

/**
 * GET /api/mobile/v1/scan/history
 * Get scan transaction history for authenticated customer
 */
exports.getScanHistory = async (req, res) => {
  try {
    const customerId = req.user?.customerId;
    const tenantId = req.tenant?.id;

    if (!customerId || !tenantId) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Invalid or expired token'
      });
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

  } catch (error) {
    console.error('Error in getScanHistory:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'An error occurred while fetching scan history'
    });
  }
};

/**
 * GET /api/mobile/v1/scan/:id
 * Get specific scan transaction details
 */
exports.getScanDetails = async (req, res) => {
  try {
    const scanId = req.params.id;
    const customerId = req.user?.customerId;
    const tenantId = req.tenant?.id;

    if (!customerId || !tenantId) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Invalid or expired token'
      });
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

  } catch (error) {
    console.error('Error in getScanDetails:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'An error occurred while fetching scan details'
    });
  }
};

/**
 * GET /api/mobile/v1/scan/stats/summary
 * Get scan statistics for authenticated customer
 */
exports.getScanStats = async (req, res) => {
  try {
    const customerId = req.user?.customerId;
    const tenantId = req.tenant?.id;

    if (!customerId || !tenantId) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Get statistics
    const result = await mobileScanService.getScanStats({
      customerId,
      tenantId
    });

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error in getScanStats:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'An error occurred while fetching statistics'
    });
  }
};
