const { database } = require('@cloudretail/shared');

const DB_NAME = process.env.DB_NAME_CATALOG || 'catalog_db';

class Category {
  /**
   * Get all categories
   */
  static async getAll() {
    const query = `
      SELECT id, name, slug, description, parent_id, image_url, display_order, is_active
      FROM categories
      WHERE is_active = TRUE
      ORDER BY display_order ASC, name ASC
    `;

    const categories = await database.query(DB_NAME, query);
    return categories.map(c => this.mapCategoryFromDB(c));
  }

  /**
   * Find category by ID
   */
  static async findById(id) {
    const query = `SELECT * FROM categories WHERE id = ?`;
    const results = await database.query(DB_NAME, query, [id]);
    
    if (results.length === 0) return null;
    return this.mapCategoryFromDB(results[0]);
  }

  /**
   * Find category by slug
   */
  static async findBySlug(slug) {
    const query = `SELECT * FROM categories WHERE slug = ?`;
    const results = await database.query(DB_NAME, query, [slug]);
    
    if (results.length === 0) return null;
    return this.mapCategoryFromDB(results[0]);
  }

  /**
   * Get category tree (with subcategories)
   */
  static async getTree() {
    const categories = await this.getAll();
    
    // Build tree structure
    const categoryMap = {};
    const tree = [];

    categories.forEach(cat => {
      categoryMap[cat.id] = { ...cat, children: [] };
    });

    categories.forEach(cat => {
      if (cat.parentId) {
        if (categoryMap[cat.parentId]) {
          categoryMap[cat.parentId].children.push(categoryMap[cat.id]);
        }
      } else {
        tree.push(categoryMap[cat.id]);
      }
    });

    return tree;
  }

  static mapCategoryFromDB(row) {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      parentId: row.parent_id,
      imageUrl: row.image_url,
      displayOrder: row.display_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

module.exports = Category;
