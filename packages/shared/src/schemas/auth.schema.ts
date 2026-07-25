import { z } from 'zod';

// Shared, bounded password rule — capping length prevents a cheap
// CPU-exhaustion vector (bcrypt cost scales with input size) and matches
// the de-facto 72-byte limit bcrypt itself enforces.
const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Emails are normalized (trimmed + lowercased) at the schema boundary so
// "User@Foo.com" and "user@foo.com" are always treated as the same account
// on both register and login, instead of silently creating duplicates.
const emailRule = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address');

// ─── Register ────────────────────────────────────────
export const registerSchema = z.object({
  email: emailRule,
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: passwordRule,
  displayName: z.string().trim().min(1).max(50).optional(),
  branch: z.string().trim().max(50).optional(),
  year: z.number().int().min(1).max(6).optional(),
});

// ─── Login ───────────────────────────────────────────
export const loginSchema = z.object({
  email: emailRule,
  password: z.string().min(1, 'Password is required'),
});

// ─── Forgot Password ────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: emailRule,
});

// ─── Reset Password ─────────────────────────────────
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordRule,
});

// ─── Update Profile ─────────────────────────────────
export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(50).optional(),
  bio: z.string().trim().max(500).optional(),
  branch: z.string().trim().max(50).optional(),
  year: z.number().int().min(1).max(6).optional(),
  avatarUrl: z.string().url().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
