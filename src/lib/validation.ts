import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name is too short").max(100),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const uploadMetaSchema = z.object({
  company: z.enum(["CACTUS", "BLANKET"]),
  bookType: z.enum(["RENEWALS", "CONTRACT_WORKS"]),
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
    "CONTACTED",
    "RENEWED",
    "LOST",
    "LAPSED",
  ]),
});

export const commentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(4000),
  mentionedUserIds: z.array(z.string().cuid()).optional().default([]),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const createUserSchema = z.object({
  name: z.string().min(2, "Name is too short").max(100),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["SUPER_ADMIN", "ADVISER", "POLICY_SERVICE_ASSOCIATE", "UNDERWRITER"]),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, "Name is too short").max(100),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["SUPER_ADMIN", "ADVISER", "POLICY_SERVICE_ASSOCIATE", "UNDERWRITER"]),
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
