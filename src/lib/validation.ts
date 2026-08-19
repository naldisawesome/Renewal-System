import { z } from "zod";

// Shared password complexity rule: at least 8 characters, one uppercase,
// one lowercase, one number. Applied everywhere a password is set
// (register, admin-created accounts, change-password) rather than only
// checking length.
const passwordComplexity = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().email("Enter a valid email"),
  password: passwordComplexity,
});

export const uploadMetaSchema = z.object({
  company: z.enum(["CACTUS", "BLANKET"]),
});

export const allocateSchema = z.object({
  renewalIds: z.array(z.string().cuid()).min(1, "Select at least one renewal"),
  assignAs: z.enum(["ADVISER", "UNDERWRITER"]).default("ADVISER"),
  userId: z.string().cuid().nullable(),
});

export const bulkDeleteSchema = z.object({
  renewalIds: z.array(z.string().cuid()).min(1, "Select at least one renewal"),
});

export const statusUpdateSchema = z.object({
  status: z.enum([
    "UNASSIGNED",
    "ASSIGNED",
    "IN_PROGRESS",
    "QUOTED",
    "CONTACTED",
    "RENEWED",
    "CANCELLED",
    "LAPSED",
  ]),
});

export const commentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(4000),
  mentionedUserIds: z.array(z.string().cuid()).optional().default([]),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: passwordComplexity,
});

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["SUPER_ADMIN", "ADVISER", "POLICY_SERVICE_ASSOCIATE", "UNDERWRITER"]),
  password: passwordComplexity,
});

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["SUPER_ADMIN", "ADVISER", "POLICY_SERVICE_ASSOCIATE", "UNDERWRITER"]),
});

export const avatarUploadSchema = z.object({
  // A base64 data URL, e.g. "data:image/jpeg;base64,....". Capped well below
  // the 5MB Postgres-friendly range since the client resizes/compresses the
  // image before sending it.
  image: z
    .string()
    .refine((v) => /^data:image\/(png|jpeg|jpg|webp);base64,/.test(v), "Unsupported image format")
    .refine((v) => v.length <= 2_000_000, "Image is too large"),
});

const optionalString = z
  .string()
  .max(500)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

const optionalDateString = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const renewalCreateSchema = z.object({
  clientName: z.string().min(1, "Client name is required").max(300),
  policyNumber: z.string().min(1, "Policy number is required").max(200),
  company: z.enum(["CACTUS", "BLANKET"]),
  bookType: z.enum(["RENEWALS", "CONTRACT_WORKS"]),
  insurer: optionalString,
  classOfRisk: optionalString,
  policyDescription: optionalString,
  classification: optionalString,
  referenceCode: optionalString,
  serviceTeam: optionalString,
  policyTeam: optionalString,
  authRepBroker: optionalString,
  paymentPlan: optionalString,
  policyCategory1: optionalString,
  startDate: optionalDateString,
  renewalDate: optionalDateString,
  invoiceTotal: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : Number(v))),
});

export const renewalUpdateSchema = renewalCreateSchema;
