import { z } from "zod";
import type { CountryCode, CurrencyCode } from "@/lib/types";
import { COUNTRIES, CURRENCIES } from "@/lib/constants";

/**
 * Validation shared by the auth forms (client) and the server actions (server).
 * The server always re-validates; client validation is only for fast feedback.
 */

const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [CountryCode, ...CountryCode[]];
const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [CurrencyCode, ...CurrencyCode[]];

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt limit used by Supabase Auth

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters`)
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address").max(254, "That email is too long"));

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80, "Keep it under 80 characters"),
    email: emailSchema,
    country: z.enum(COUNTRY_CODES, { message: "Choose your country" }),
    password: passwordSchema,
    confirm: z.string(),
    terms: z.literal(true, { message: "Please accept the terms to continue" }),
    next: z.string().optional(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(PASSWORD_MAX, "That password is too long"),
  remember: z.boolean().default(true),
  next: z.string().optional(),
});
export type LoginInput = z.input<typeof loginSchema>;

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const modeSchema = z.enum(["donor", "requester"]);

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80, "Keep it under 80 characters"),
  bio: z.string().trim().max(500, "Keep your bio under 500 characters"),
  country: z.enum(COUNTRY_CODES).nullable(),
  preferredCurrency: z.enum(CURRENCY_CODES).nullable(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const onboardingSchema = z.object({
  mode: modeSchema,
  name: z.string().trim().min(2, "Enter your name").max(80, "Keep it under 80 characters"),
  country: z.enum(COUNTRY_CODES),
  bio: z.string().trim().max(500, "Keep your bio under 500 characters"),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

/** Avatar objects must live in the user's own folder of the public avatars bucket. */
export function isValidAvatarPath(path: string, userId: string) {
  return new RegExp(`^${userId}/avatar-[0-9]{10,16}\\.(png|jpe?g|webp)$`).test(path);
}
