const { database } = require('@cloudretail/shared');

const DB_NAME = process.env.DB_NAME_CATALOG || 'catalog_db';

class Product {
  /**
   * Create a new product
   */
  static async create(productData) {
    const {
      sellerId,
      categoryId,
      name,
      slug,
      description,
      price,
      comparePrice,
      stock,
      sku,
      weight,
      weightUnit,
      status = 'active',
    } = productData;

    const query = `
      INSERT INTO products (
        seller_id, category_id, name, slug, description, price, compare_price,
        stock, sku, weight, weight_unit, status, featured
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)
    `;

    const result = await database.query(DB_NAME, query, [
      sellerId,
      categoryId,
      name,
      slug,
      description,
      price,
      comparePrice || null,
      stock,
      sku || null,
      weight || null,
      weightUnit || 'kg',
      status,
    ]);

    return {
      id: result.insertId,
      ...productData,
    };
  }

  /**
   * Find product by ID
   */
  static async findById(id) {
    const query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `;

    const results = await database.query(DB_NAME, query, [id]);
    if (results.length === 0) return null;

    return this.mapProductFromDB(results[0]);
  }

  /**
   * Search products with filters
   */
  static async search(filters = {}) {
    const {
      query,
      categoryId,
      sellerId,
      minPrice,
      maxPrice,
      status = 'active',
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = filters;

    const offset = (page - 1) * limit;
    const params = [];
    let whereConditions = ['p.status = ?'];
    params.push(status);

    if (query) {
      whereConditions.push('(p.name LIKE ? OR p.description LIKE ?)');
      params.push(`%${query}%`, `%${query}%`);
    }

    if (categoryId) {
      whereConditions.push('p.category_id = ?');
      params.push(categoryId);
    }

    if (sellerId) {
      whereConditions.push('p.seller_id = ?');
      params.push(sellerId);
    }

    if (minPrice) {
      whereConditions.push('p.price >= ?');
      params.push(minPrice);
    }

    if (maxPrice) {
      whereConditions.push('p.price <= ?');
      params.push(maxPrice);
    }

    const whereClause = whereConditions.join(' AND ');

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM products p WHERE ${whereClause}`;
    const countResult = await database.query(DB_NAME, countQuery, params);
    const total = countResult[0].total;

    // Get products
    const validSortColumns = ['created_at', 'price', 'name', 'rating', 'sales_count'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Note: Using template literals for LIMIT/OFFSET as MySQL prepared statements 
    // don't support placeholders for these clauses in some configurations
    const productsQuery = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${whereClause}
      ORDER BY p.${sortColumn} ${order}
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    const products = await database.query(DB_NAME, productsQuery, params);

    return {
      data: products.map(p => this.mapProductFromDB(p)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update product
   */
  static async update(id, updates) {
    const allowedFields = [
      'name',
      'slug',
      'description',
      'price',
      'compare_price',
      'stock',
      'sku',
      'weight',
      'weight_unit',
      'status',
      'category_id',
    ];

    const setFields = [];
    const params = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        setFields.push(`${key} = ?`);
        params.push(updates[key]);
      }
    });

    if (setFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    params.push(id);
    const query = `UPDATE products SET ${setFields.join(', ')} WHERE id = ?`;
    await database.query(DB_NAME, query, params);

    return this.findById(id);
  }

  /**
   * Delete product
   */
  static async delete(id) {
    const query = 'DELETE FROM products WHERE id = ?';
    await database.query(DB_NAME, query, [id]);
  }

  /**
   * Update stock
   */
  static async updateStock(id, quantity) {
    const query = 'UPDATE products SET stock = stock + ? WHERE id = ?';
    await database.query(DB_NAME, query, [quantity, id]);
  }

  /**
   * Increment view count
   */
  static async incrementViews(id) {
    const query = 'UPDATE products SET view_count = view_count + 1 WHERE id = ?';
    await database.query(DB_NAME, query, [id]);
  }

  /**
   * Get featured products
   */
  static async getFeatured(limit = 10) {
    const query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.featured = 1 AND p.status = 'active'
      ORDER BY p.rating DESC, p.sales_count DESC
      LIMIT ${parseInt(limit)}
    `;

    const products = await database.query(DB_NAME, query, []);
    return products.map(p => this.mapProductFromDB(p));
  }

  /**
   * Map database row to product object
   */
  static mapProductFromDB(row) {
    return {
      id: row.id,
      sellerId: row.seller_id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categorySlug: row.category_slug,
      name: row.name,
      slug: row.slug,
      description: row.description,
      price: parseFloat(row.price),
      comparePrice: row.compare_price ? parseFloat(row.compare_price) : null,
      stock: row.stock,
      sku: row.sku,
      weight: row.weight ? parseFloat(row.weight) : null,
      weightUnit: row.weight_unit,
      status: row.status,
      featured: row.featured,
      rating: parseFloat(row.rating),
      reviewCount: row.review_count,
      viewCount: row.view_count,
      salesCount: row.sales_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

module.exports = Product;
