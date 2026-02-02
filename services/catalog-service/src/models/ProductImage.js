const { database } = require('@cloudretail/shared');

const DB_NAME = process.env.DB_NAME_CATALOG || 'catalog_db';

class ProductImage {
  /**
   * Add image to product
   */
  static async create(productId, imageData) {
    const { imageUrl, thumbnailUrl, altText, displayOrder = 0, isPrimary = false } = imageData;

    const query = `
      INSERT INTO product_images (product_id, image_url, thumbnail_url, alt_text, display_order, is_primary)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = await database.query(DB_NAME, query, [
      productId,
      imageUrl,
      thumbnailUrl || null,
      altText || null,
      displayOrder,
      isPrimary,
    ]);

    return {
      id: result.insertId,
      productId,
      ...imageData,
    };
  }

  /**
   * Get images for product
   */
  static async findByProductId(productId) {
    const query = `
      SELECT id, product_id, image_url, thumbnail_url, alt_text, display_order, is_primary, created_at
      FROM product_images
      WHERE product_id = ?
      ORDER BY is_primary DESC, display_order ASC
    `;

    const images = await database.query(DB_NAME, query, [productId]);
    return images.map(img => ({
      id: img.id,
      productId: img.product_id,
      imageUrl: img.image_url,
      thumbnailUrl: img.thumbnail_url,
      altText: img.alt_text,
      displayOrder: img.display_order,
      isPrimary: img.is_primary,
      createdAt: img.created_at,
    }));
  }

  /**
   * Delete image
   */
  static async delete(id) {
    const query = 'DELETE FROM product_images WHERE id = ?';
    await database.query(DB_NAME, query, [id]);
  }

  /**
   * Set primary image
   */
  static async setPrimary(productId, imageId) {
    await database.transaction(DB_NAME, async connection => {
      // Clear existing primary
      await connection.execute('UPDATE product_images SET is_primary = FALSE WHERE product_id = ?', [
        productId,
      ]);

      // Set new primary
      await connection.execute('UPDATE product_images SET is_primary = TRUE WHERE id = ?', [imageId]);
    });
  }
}

module.exports = ProductImage;
