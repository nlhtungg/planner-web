const Joi = require('joi');

// Validation schema for user registration
const registrationSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username must only contain alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters',
      'any.required': 'Username is required'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(6)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    }),
  
  firstName: Joi.string()
    .max(50)
    .required()
    .messages({
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required'
    }),
  
  lastName: Joi.string()
    .max(50)
    .required()
    .messages({
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required'
    }),
  
  avatar: Joi.string().uri().optional()
});

// Validation schema for Google OAuth
const googleAuthSchema = Joi.object({
  idToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Google ID token is required'
    })
});

// Validation schema for Google OAuth callback
const googleCallbackSchema = Joi.object({
  code: Joi.string()
    .required()
    .messages({
      'any.required': 'Authorization code is required'
    })
});

// Validation schema for user login
const loginSchema = Joi.object({
  identifier: Joi.string()
    .required()
    .messages({
      'any.required': 'Email or username is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Validation schema for password change
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  
  newPassword: Joi.string()
    .min(6)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'New password must be at least 6 characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'New password is required'
    })
});

// Validation schema for profile update
const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .max(50)
    .optional()
    .messages({
      'string.max': 'First name cannot exceed 50 characters'
    }),
  
  lastName: Joi.string()
    .max(50)
    .optional()
    .messages({
      'string.max': 'Last name cannot exceed 50 characters'
    }),
  
  avatar: Joi.string().uri().optional(),
  
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .optional()
    .messages({
      'string.alphanum': 'Username must only contain alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters'
    })
});

// Validation schema for refresh token
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
});

// Validation schema for email verification
const emailVerificationSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Verification token is required'
    })
});

// Validation schema for password reset request
const passwordResetRequestSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
});

// Validation schema for password reset
const passwordResetSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required'
    }),
  
  newPassword: Joi.string()
    .min(6)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'New password must be at least 6 characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'New password is required'
    })
});

// Validation functions
const validateRegistration = (data) => {
  return registrationSchema.validate(data, { abortEarly: false });
};

const validateLogin = (data) => {
  return loginSchema.validate(data, { abortEarly: false });
};

const validateChangePassword = (data) => {
  return changePasswordSchema.validate(data, { abortEarly: false });
};

const validateUpdateProfile = (data) => {
  return updateProfileSchema.validate(data, { abortEarly: false });
};

const validateRefreshToken = (data) => {
  return refreshTokenSchema.validate(data, { abortEarly: false });
};

const validateEmailVerification = (data) => {
  return emailVerificationSchema.validate(data, { abortEarly: false });
};

const validatePasswordResetRequest = (data) => {
  return passwordResetRequestSchema.validate(data, { abortEarly: false });
};

const validatePasswordReset = (data) => {
  return passwordResetSchema.validate(data, { abortEarly: false });
};

const validateGoogleAuth = (data) => {
  return googleAuthSchema.validate(data, { abortEarly: false });
};

const validateGoogleCallback = (data) => {
  return googleCallbackSchema.validate(data, { abortEarly: false });
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateChangePassword,
  validateUpdateProfile,
  validateRefreshToken,
  validateEmailVerification,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateGoogleAuth,
  validateGoogleCallback
};