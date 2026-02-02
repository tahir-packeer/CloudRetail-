const bcrypt = require('bcrypt');
const { database } = require('@cloudretail/shared');

const DB_NAME = process.env.DB_NAME_AUTH || 'auth_db';

class User {
  /**
   * Create a new user
   */
  static async create(userData) {
    const { email, password, firstName, lastName, phone, role = 'buyer' } = userData;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, phone, role, status, email_verified)
      VALUES (?, ?, ?, ?, ?, ?, 'active', FALSE)
    `;

    const result = await database.query(DB_NAME, query, [
      email,
      passwordHash,
      firstName,
      lastName,
      phone || null,
      role,
    ]);

    return {
      id: result.insertId,
      email,
      firstName,
      lastName,
      phone,
      role,
      status: 'active',
      emailVerified: false,
    };
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const query = `
      SELECT id, email, password_hash, first_name, last_name, phone, role, status, email_verified, created_at, last_login
      FROM users
      WHERE email = ?
    `;

    const results = await database.query(DB_NAME, query, [email]);
    if (results.length === 0) return null;

    const user = results[0];
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      lastLogin: user.last_login,
    };
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const query = `
      SELECT id, email, first_name, last_name, phone, role, status, email_verified, created_at, last_login
      FROM users
      WHERE id = ?
    `;

    const results = await database.query(DB_NAME, query, [id]);
    if (results.length === 0) return null;

    const user = results[0];
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      lastLogin: user.last_login,
    };
  }

  /**
   * Verify password
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(userId) {
    const query = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
    await database.query(DB_NAME, query, [userId]);
  }

  /**
   * Update user status
   */
  static async updateStatus(userId, status) {
    const query = 'UPDATE users SET status = ? WHERE id = ?';
    await database.query(DB_NAME, query, [status, userId]);
  }

  /**
   * Get seller profile
   */
  static async getSellerProfile(userId) {
    const query = `
      SELECT id, user_id, business_name, business_description, business_address,
             verification_status, verification_date, rating, total_sales, created_at
      FROM seller_profiles
      WHERE user_id = ?
    `;

    const results = await database.query(DB_NAME, query, [userId]);
    if (results.length === 0) return null;

    const profile = results[0];
    return {
      id: profile.id,
      userId: profile.user_id,
      businessName: profile.business_name,
      businessDescription: profile.business_description,
      businessAddress: profile.business_address,
      verificationStatus: profile.verification_status,
      verificationDate: profile.verification_date,
      rating: parseFloat(profile.rating),
      totalSales: profile.total_sales,
      createdAt: profile.created_at,
    };
  }

  /**
   * Create seller profile
   */
  static async createSellerProfile(userId, profileData) {
    const { businessName, businessDescription, businessAddress } = profileData;

    const query = `
      INSERT INTO seller_profiles (user_id, business_name, business_description, business_address, verification_status)
      VALUES (?, ?, ?, ?, 'pending')
    `;

    const result = await database.query(DB_NAME, query, [
      userId,
      businessName,
      businessDescription || null,
      businessAddress || null,
    ]);

    return {
      id: result.insertId,
      userId,
      businessName,
      businessDescription,
      businessAddress,
      verificationStatus: 'pending',
    };
  }

  /**
   * Find all users
   */
  static async findAll() {
    try {
      const query = `
        SELECT 
          u.id, u.email, u.first_name, u.last_name, u.phone, u.role, 
          u.status, u.email_verified, u.created_at,
          sp.verification_status
        FROM users u
        LEFT JOIN seller_profiles sp ON u.id = sp.user_id AND u.role = 'seller'
        ORDER BY u.created_at DESC
      `;

      const users = await database.query(DB_NAME, query);

      return users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        emailVerified: Boolean(user.email_verified),
        isVerified: user.role === 'seller' ? (user.verification_status === 'verified') : true,
        verificationStatus: user.verification_status || null,
        createdAt: user.created_at,
      }));
    } catch (error) {
      console.error('Error in findAll:', error);
      throw error;
    }
  }

  /**
   * Update user status
   */
  static async updateStatus(userId, status) {
    const query = `
      UPDATE users
      SET status = ?
      WHERE id = ?
    `;

    await database.query(DB_NAME, query, [status, userId]);
  }

  /**
   * Verify seller
   */
  static async verifySeller(userId) {
    // Check if seller profile exists
    const checkQuery = 'SELECT id FROM seller_profiles WHERE user_id = ?';
    const existing = await database.query(DB_NAME, checkQuery, [userId]);

    if (existing.length === 0) {
      // Create seller profile if it doesn't exist
      const insertQuery = `
        INSERT INTO seller_profiles (user_id, business_name, verification_status, verification_date)
        VALUES (?, 'Business Name', 'verified', NOW())
      `;
      await database.query(DB_NAME, insertQuery, [userId]);
    } else {
      // Update existing profile
      const updateQuery = `
        UPDATE seller_profiles
        SET verification_status = 'verified', verification_date = NOW()
        WHERE user_id = ?
      `;
      await database.query(DB_NAME, updateQuery, [userId]);
    }
  }
}

module.exports = User;
