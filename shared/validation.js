const Joi = require('joi');

/**
 * User registration validation schema
 */
const userRegisterSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'Password is required',
  }),
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'First name must be at least 2 characters',
    'string.max': 'First name must not exceed 50 characters',
    'any.required': 'First name is required',
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Last name must be at least 2 characters',
    'string.max': 'Last name must not exceed 50 characters',
    'any.required': 'Last name is required',
  }),
  role: Joi.string().valid('buyer', 'seller', 'admin').default('buyer'),
  phone: Joi.string()
    .pattern(/^\+?[0-9]{10,15}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Phone number must be 10-15 digits (with optional + prefix)',
    }),
});

/**
 * User login validation schema
 */
const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

/**
 * Product creation validation schema
 */
const productCreateSchema = Joi.object({
  sellerId: Joi.number().integer().positive().optional(),
  categoryId: Joi.number().integer().positive().required(),
  name: Joi.string().min(3).max(200).required(),
  slug: Joi.string().optional(),
  description: Joi.string().min(10).max(2000).required(),
  price: Joi.number().positive().precision(2).required(),
  stock: Joi.number().integer().min(0).optional(),
  stockQuantity: Joi.number().integer().min(0).optional(),
  sku: Joi.string().max(100).optional(),
  status: Joi.string().valid('active', 'inactive', 'out_of_stock').optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
});

/**
 * Product update validation schema
 */
const productUpdateSchema = Joi.object({
  categoryId: Joi.number().integer().positive().optional(),
  name: Joi.string().min(3).max(200).optional(),
  slug: Joi.string().optional(),
  description: Joi.string().min(10).max(2000).optional(),
  price: Joi.number().positive().precision(2).optional(),
  stock: Joi.number().integer().min(0).optional(),
  stockQuantity: Joi.number().integer().min(0).optional(),
  sku: Joi.string().max(100).optional(),
  status: Joi.string().valid('active', 'inactive', 'out_of_stock').optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
});

/**
 * Order creation validation schema
 */
const orderCreateSchema = Joi.object({
  shippingAddress: Joi.object({
    line1: Joi.string().required(),
    line2: Joi.string().optional().allow(''),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postalCode: Joi.string().required(),
    country: Joi.string().default('USA'),
  }).required(),
  billingAddress: Joi.object({
    line1: Joi.string().required(),
    line2: Joi.string().optional().allow(''),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postalCode: Joi.string().required(),
    country: Joi.string().default('USA'),
  }).optional(),
  paymentMethod: Joi.string().valid('card', 'stripe').default('card'),
});

/**
 * Cart item validation schema
 */
const cartItemSchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().positive().min(1).required(),
});

/**
 * Pagination validation schema
 */
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

/**
 * Search validation schema
 */
const searchSchema = Joi.object({
  query: Joi.string().min(1).max(100).optional(),
  category: Joi.string().optional(),
  minPrice: Joi.number().positive().optional(),
  maxPrice: Joi.number().positive().optional(),
  sellerId: Joi.number().integer().positive().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

/**
 * Validate data against schema
 * @param {object} schema - Joi schema
 * @param {object} data - Data to validate
 * @returns {object} - Validated data or error
 */
const validate = (schema, data) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    return { isValid: false, errors };
  }

  return { isValid: true, value };
};

/**
 * Validation middleware
 * @param {object} schema - Joi schema
 * @returns {Function} - Express middleware
 */
const validateMiddleware = schema => {
  return (req, res, next) => {
    const { isValid, errors, value } = validate(schema, req.body);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    req.validatedData = value;
    next();
  };
};

module.exports = {
  userRegisterSchema,
  userLoginSchema,
  productCreateSchema,
  productUpdateSchema,
  orderCreateSchema,
  cartItemSchema,
  paginationSchema,
  searchSchema,
  validate,
  validateMiddleware,
};
