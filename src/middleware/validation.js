const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Order validation rules
const validateOrder = [
  body('username')
    .isLength({ min: 3, max: 32 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-32 characters and contain only letters, numbers, and underscores'),
  
  body('package')
    .isIn(['Mixed', 'Mom And Son', 'Rape', 'SL Leaks'])
    .withMessage('Invalid package type'),
  
  body('count')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Count must be between 1 and 10000'),
  
  handleValidationErrors
];

// User validation rules
const validateUser = [
  body('username')
    .isLength({ min: 3, max: 32 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Invalid username format'),
  
  handleValidationErrors
];

// Admin login validation
const validateAdminLogin = [
  body('adminId')
    .isNumeric()
    .withMessage('Admin ID must be numeric'),
  
  body('secret')
    .isLength({ min: 8 })
    .withMessage('Secret must be at least 8 characters'),
  
  handleValidationErrors
];

// Package deletion validation
const validatePackageDeletion = [
  body('username')
    .isLength({ min: 3, max: 32 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Invalid username format'),
  
  body('index')
    .isInt({ min: 0 })
    .withMessage('Index must be a non-negative integer'),
  
  handleValidationErrors
];

// Query parameter validation
const validateUsername = [
  query('username')
    .isLength({ min: 3, max: 32 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Invalid username format'),
  
  handleValidationErrors
];

// PIN validation
const validatePin = [
  body('pin')
    .isLength({ min: 4, max: 4 })
    .isNumeric()
    .withMessage('PIN must be exactly 4 digits'),
  
  handleValidationErrors
];

module.exports = {
  validateOrder,
  validateUser,
  validateAdminLogin,
  validatePackageDeletion,
  validateUsername,
  validatePin,
  handleValidationErrors
};