import z from 'zod';
import zxcvbn from 'zxcvbn';

export const registerSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .min(8)
    .max(72)
    .refine(
      (p) => zxcvbn(p).score >= 3, // 0-4 scale; require 3+ (strong)
      'Password is too weak — avoid common words and patterns',
    ),

  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  avatarUrl: z.url().optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type LoginDto = z.infer<typeof loginSchema>;

export const verifyMailSchema = z.object({
  token: z.string(),
});

export type VerifyMailDto = z.infer<typeof verifyMailSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email(),
});
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
