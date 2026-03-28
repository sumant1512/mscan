/**
 * Dealer Service
 * Handles dealer CRUD operations for tenant admin
 */

const db = require('../config/database');
const { executeTransaction } = require('../modules/common/utils/database.util');
const { ConflictError, NotFoundError } = require('../modules/common/errors/AppError');

/**
 * Generate a unique dealer code
 */
function generateDealerCode(shopName) {
  const prefix = shopName
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 4)
    .toUpperCase();
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${suffix}`;
}

/**
 * Create a new dealer (user + dealer + dealer_points in transaction)
 */
const createDealer = async (tenantId, data) => {
  const { full_name, email, phone_e164, shop_name, address, pincode, city, state, dealer_code, metadata } = data;

  return executeTransaction(db, async (client) => {
    // Check for duplicate phone in tenant
    const phoneCheck = await client.query(
      'SELECT id FROM users WHERE tenant_id = $1 AND phone_e164 = $2',
      [tenantId, phone_e164]
    );
    if (phoneCheck.rows.length > 0) {
      throw new ConflictError('Phone number already registered');
    }

    // Check for duplicate email in tenant
    if (email) {
      const emailCheck = await client.query(
        'SELECT id FROM users WHERE tenant_id = $1 AND email = $2',
        [tenantId, email.toLowerCase()]
      );
      if (emailCheck.rows.length > 0) {
        throw new ConflictError('Email already registered');
      }
    }

    // Generate or validate dealer code
    const code = dealer_code || generateDealerCode(shop_name);

    const codeCheck = await client.query(
      'SELECT id FROM dealers WHERE tenant_id = $1 AND dealer_code = $2',
      [tenantId, code]
    );
    if (codeCheck.rows.length > 0) {
      throw new ConflictError('Dealer code already exists in this tenant');
    }

    // Create user record
    const userRes = await client.query(
      `INSERT INTO users (tenant_id, email, full_name, phone_e164, role, is_active)
       VALUES ($1, $2, $3, $4, 'DEALER', true)
       RETURNING id`,
      [tenantId, email ? email.toLowerCase() : null, full_name, phone_e164]
    );
    const userId = userRes.rows[0].id;

    // Create dealer record
    const dealerRes = await client.query(
      `INSERT INTO dealers (user_id, tenant_id, dealer_code, shop_name, address, pincode, city, state, is_active, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
       RETURNING *`,
      [userId, tenantId, code, shop_name, address, pincode, city, state, metadata ? JSON.stringify(metadata) : '{}']
    );

    // Initialize dealer points
    await client.query(
      `INSERT INTO dealer_points (dealer_id, tenant_id, balance)
       VALUES ($1, $2, 0)`,
      [dealerRes.rows[0].id, tenantId]
    );

    return {
      id: dealerRes.rows[0].id,
      user_id: userId,
      dealer_code: code,
      full_name,
      email: email ? email.toLowerCase() : null,
      phone_e164,
      shop_name,
      address,
      pincode,
      city,
      state,
      is_active: true,
      points_balance: 0
    };
  });
};

/**
 * List dealers with pagination and search
 */
const listDealers = async (tenantId, { page = 1, limit = 10, search = null }) => {
  const offset = (page - 1) * limit;
  const params = [tenantId];
  let whereClause = 'd.tenant_id = $1';

  if (search) {
    params.push(`%${search}%`);
    const searchIdx = params.length;
    whereClause += ` AND (u.full_name ILIKE $${searchIdx} OR d.shop_name ILIKE $${searchIdx} OR d.dealer_code ILIKE $${searchIdx})`;
  }

  const countRes = await db.query(
    `SELECT COUNT(*) as total
     FROM dealers d
     JOIN users u ON u.id = d.user_id
     WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countRes.rows[0].total);

  params.push(limit, offset);
  const dataRes = await db.query(
    `SELECT d.id, d.dealer_code, u.full_name, u.email, u.phone_e164, d.shop_name,
            d.city, d.state, d.is_active, COALESCE(dp.balance, 0) as points_balance
     FROM dealers d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN dealer_points dp ON dp.dealer_id = d.id AND dp.tenant_id = d.tenant_id
     WHERE ${whereClause}
     ORDER BY d.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { dealers: dataRes.rows, total };
};

/**
 * Get single dealer by ID
 */
const getDealerById = async (tenantId, dealerId) => {
  const result = await db.query(
    `SELECT d.*, u.full_name, u.email, u.phone_e164, u.is_active as user_active,
            COALESCE(dp.balance, 0) as points_balance
     FROM dealers d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN dealer_points dp ON dp.dealer_id = d.id AND dp.tenant_id = d.tenant_id
     WHERE d.id = $1 AND d.tenant_id = $2`,
    [dealerId, tenantId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Dealer');
  }

  return result.rows[0];
};

/**
 * Update dealer details
 */
const updateDealer = async (tenantId, dealerId, data) => {
  const dealer = await getDealerById(tenantId, dealerId);

  return executeTransaction(db, async (client) => {
    // Update user record fields
    const { full_name, email, shop_name, address, pincode, city, state, metadata } = data;

    if (full_name || email) {
      const userFields = [];
      const userParams = [];
      let idx = 1;

      if (full_name) {
        userFields.push(`full_name = $${idx++}`);
        userParams.push(full_name);
      }
      if (email !== undefined) {
        userFields.push(`email = $${idx++}`);
        userParams.push(email ? email.toLowerCase() : null);
      }

      if (userFields.length > 0) {
        userParams.push(dealer.user_id);
        await client.query(
          `UPDATE users SET ${userFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx}`,
          userParams
        );
      }
    }

    // Update dealer record fields
    const dealerFields = [];
    const dealerParams = [];
    let dIdx = 1;

    if (shop_name) { dealerFields.push(`shop_name = $${dIdx++}`); dealerParams.push(shop_name); }
    if (address) { dealerFields.push(`address = $${dIdx++}`); dealerParams.push(address); }
    if (pincode) { dealerFields.push(`pincode = $${dIdx++}`); dealerParams.push(pincode); }
    if (city) { dealerFields.push(`city = $${dIdx++}`); dealerParams.push(city); }
    if (state) { dealerFields.push(`state = $${dIdx++}`); dealerParams.push(state); }
    if (metadata) { dealerFields.push(`metadata = $${dIdx++}`); dealerParams.push(JSON.stringify(metadata)); }

    if (dealerFields.length > 0) {
      dealerParams.push(dealerId, tenantId);
      await client.query(
        `UPDATE dealers SET ${dealerFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${dIdx} AND tenant_id = $${dIdx + 1}`,
        dealerParams
      );
    }

    return getDealerById(tenantId, dealerId);
  });
};

/**
 * Toggle dealer active status
 */
const toggleDealerStatus = async (tenantId, dealerId, isActive) => {
  return executeTransaction(db, async (client) => {
    const dealer = await getDealerById(tenantId, dealerId);

    await client.query(
      'UPDATE dealers SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND tenant_id = $3',
      [isActive, dealerId, tenantId]
    );

    await client.query(
      'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [isActive, dealer.user_id]
    );

    return { ...dealer, is_active: isActive };
  });
};

/**
 * Get dealer points balance
 */
const getDealerPoints = async (tenantId, dealerId) => {
  const result = await db.query(
    'SELECT COALESCE(balance, 0) as balance FROM dealer_points WHERE dealer_id = $1 AND tenant_id = $2',
    [dealerId, tenantId]
  );

  return { balance: result.rows.length > 0 ? result.rows[0].balance : 0, currency: 'points' };
};

/**
 * Get dealer point transactions
 */
const getDealerPointTransactions = async (tenantId, dealerId, { page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;

  const countRes = await db.query(
    'SELECT COUNT(*) as total FROM dealer_point_transactions WHERE dealer_id = $1 AND tenant_id = $2',
    [dealerId, tenantId]
  );
  const total = parseInt(countRes.rows[0].total);

  const dataRes = await db.query(
    `SELECT id, amount, type, reason, reference_id, reference_type, metadata, created_at
     FROM dealer_point_transactions
     WHERE dealer_id = $1 AND tenant_id = $2
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [dealerId, tenantId, limit, offset]
  );

  return { transactions: dataRes.rows, total };
};

module.exports = {
  createDealer,
  listDealers,
  getDealerById,
  updateDealer,
  toggleDealerStatus,
  getDealerPoints,
  getDealerPointTransactions
};
