const { z } = require('zod');

// User validation schemas
const userRegistrationSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address format" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" })
});

const userLoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address format" }),
  password: z.string().min(1, { message: "Password is required" })
});

const userProfileUpdateSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }).optional(),
  profilePicture: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string()
    .min(8, { message: "Password must be at least 8 characters" })
    .refine(val => !val || /[A-Z]/.test(val), { message: "Password must contain at least one uppercase letter" })
    .refine(val => !val || /[0-9]/.test(val), { message: "Password must contain at least one number" })
    .optional()
});

// Password reset validation schemas
const passwordResetRequestSchema = z.object({
  email: z.string().email({ message: "Invalid email address format" })
});

const passwordResetSchema = z.object({
  email: z.string().email({ message: "Invalid email address format" }),
  code: z.string().length(6, { message: "Verification code must be 6 digits" })
    .refine(val => /^\d+$/.test(val), { message: "Verification code must contain only digits" })
});

// Contributor validation schemas
const contributorRegistrationSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address format" }),
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters" })
    .refine(val => /[A-Z]/.test(val), { message: "Password must contain at least one uppercase letter" })
    .refine(val => /[0-9]/.test(val), { message: "Password must contain at least one number" }),
  expertise: z.array(z.string()).optional(),
  bio: z.string().optional()
});

const contributorProfileUpdateSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }).optional(),
  expertise: z.array(z.string()).optional(),
  bio: z.string().optional(),
  profilePicture: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string()
    .min(8, { message: "Password must be at least 8 characters" })
    .refine(val => !val || /[A-Z]/.test(val), { message: "Password must contain at least one uppercase letter" })
    .refine(val => !val || /[0-9]/.test(val), { message: "Password must contain at least one number" })
    .optional()
});

// Admin validation schemas
const adminLoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address format" }),
  password: z.string().min(1, { message: "Password is required" })
});

const adminProfileUpdateSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string()
    .min(10, { message: "Admin password must be at least 10 characters" })
    .refine(val => !val || /[A-Z]/.test(val), { message: "Password must contain at least one uppercase letter" })
    .refine(val => !val || /[0-9]/.test(val), { message: "Password must contain at least one number" })
    .refine(val => !val || /[^A-Za-z0-9]/.test(val), { message: "Password must contain at least one special character" })
    .optional()
});

// Website and monitor validation schemas
const websiteSchema = z.object({
  name: z.string().min(2, { message: "Website name must be at least 2 characters" }),
  url: z.string().url({ message: "Invalid URL format. Example: https://example.com" }),
  description: z.string().optional()
});

const monitorSchema = z.object({
  websiteId: z.string(),
  checkFrequency: z.number().int().min(1, { message: "Check frequency must be at least 1 minute" }).max(60, { message: "Check frequency cannot exceed 60 minutes" }),
  path: z.string().optional(),
  expectedStatusCode: z.number().int().optional(),
  contentCheck: z.string().optional()
});

// OTP verification schema
const otpVerificationSchema = z.object({
  email: z.string().email({ message: "Invalid email address format" }),
  otp: z.string().length(6, { message: "OTP must be 6 digits" })
    .refine(val => /^\d+$/.test(val), { message: "OTP must contain only digits" })
});

// Validation middleware
const validate = (schema) => (req, res, next) => {
  try {
    console.log("Validating request body:", JSON.stringify(req.body));
    schema.parse(req.body);
    console.log("Validation successful");
    next();
  } catch (error) {
    // Formatting Zod errors to be more user-friendly
    console.error("Validation failed:", JSON.stringify(error.errors));
    const formattedErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: formattedErrors
    });
  }
};

module.exports = {
  userRegistrationSchema,
  userLoginSchema,
  userProfileUpdateSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  contributorRegistrationSchema,
  contributorProfileUpdateSchema,
  adminLoginSchema,
  adminProfileUpdateSchema,
  websiteSchema,
  monitorSchema,
  otpVerificationSchema,
  validate
}; 