const { database } = require('@cloudretail/shared');

const DB_NAME = process.env.DB_NAME_AUTH || 'auth_db';

class RefreshToken {
  /**
   * Create a new refresh token
   */
  static async create(userId, token, expiresAt) {
    const query = `
      INSERT INTO refresh_tokens (user_id, token, expires_at, revoked)
      VALUES (?, ?, ?, FALSE)
    `;

    const result = await database.query(DB_NAME, query, [userId, token, expiresAt]);

    return {
      id: result.insertId,
      userId,
      token,
      expiresAt,
      revoked: false,
    };
  }

  /**
   * Find refresh token
   */
  static async findByToken(token) {
    const query = `
      SELECT id, user_id, token, expires_at, revoked, created_at
      FROM refresh_tokens
      WHERE token = ?
    `;

    const results = await database.query(DB_NAME, query, [token]);
    if (results.length === 0) return null;

    const rt = results[0];
    return {
      id: rt.id,
      userId: rt.user_id,
      token: rt.token,
      expiresAt: rt.expires_at,
      revoked: rt.revoked,
      createdAt: rt.created_at,
    };
  }

  /**
   * Revoke refresh token
   */
  static async revoke(token) {
    const query = 'UPDATE refresh_tokens SET revoked = TRUE WHERE token = ?';
    await database.query(DB_NAME, query, [token]);
  }

  /**
   * Revoke all tokens for a user
   */
  static async revokeAllForUser(userId) {
    const query = 'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?';
    await database.query(DB_NAME, query, [userId]);
  }

  /**
   * Delete expired tokens
   */
  static async deleteExpired() {
    const query = 'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = TRUE';
    const result = await database.query(DB_NAME, query);
    return result.affectedRows;
  }
}

module.exports = RefreshToken;
