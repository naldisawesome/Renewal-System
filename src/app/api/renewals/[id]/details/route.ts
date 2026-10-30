import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renewalUpdateSchema } from "@/lib/validation";
import { logRenewalHistory } from "@/lib/history";
import { logAudit } from "@/lib/audit";
import { Company, BookType } from "@prisma/client";

const FIELD_LABELS: Record<string, string> = {
  clientName: "Client",
  policyNumber: "Policy number",
  company: "Portfolio",
  bookType: "Type",
  insurer: "Insurer",
  classOfRisk: "Class of risk",
  policyDescription: "Description",
  classification: "Classification",
  referenceCode: "Reference code",
  serviceTeam: "Service team",
  policyTeam: "Policy team",
  authRepBroker: "Auth rep / broker",
  paymentPlan: "Payment plan",
  policyCategory1: "Category",
  startDate: "Start date",
  renewalDate: "Renewal date",
  invoiceTotal: "Invoice total",
  contactName: "Contact name",
  contactEmail: "Contact email",
  contactPhone: "Contact phone",
  clientAddress: "Address",
};

/** Portfolio and type decide which book a renewal belongs to, so only a Super Admin can change them. */
const ADMIN_ONLY = ["company", "bookType"];

function show(v: unknown): string {
  if (v == null || v === "") return "blank";
  if (v instanceof Date) return v.getTime() === 0 ? "blank" : v.toLocaleDateString("en-NZ", { timeZone: "UTC" });
  if (typeof v === "number") return v.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 57)}...` : s;
}

/**
 * Edit a renewal's policy and client details. Allowed for Super Admins and for the people assigned to it (its
 * adviser, or its underwriter), because uploads don't always carry every detail. Fields edited here are
 * remembered, so a later upload never overwrites them.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const renewal = await prisma.renewal.findUnique({ where: { id: params.id } });
  if (!renewal) return NextResponse.json({ error: "Renewal not found." }, { status: 404 });

  const role = session.user.role;
  const isAdmin = role === "SUPER_ADMIN";
  const isOwner =
    (role === "ADVISER" && renewal.assignedAdviserId === session.user.id) ||
    (role === "UNDERWRITER" && renewal.assignedUnderwriterId === session.user.id);
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Only the adviser or underwriter assigned to this renewal can edit it." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  // Any field not sent keeps its current value, so a partial request never blanks the rest.
  const current: Record<string, unknown> = {};
  for (const k of Object.keys(FIELD_LABELS)) {
    const v = (renewal as any)[k];
    current[k] = v instanceof Date ? (v.getTime() === 0 ? "" : v.toISOString().slice(0, 10)) : v ?? "";
  }
  const sent = body && typeof body === "object" ? Object.fromEntries(Object.entries(body).filter(([k]) => k in FIELD_LABELS)) : {};
  const parsed = renewalUpdateSchema.safeParse({ ...current, ...sent });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });
  }

  const data = parsed.data;
  const renewalDate = data.renewalDate ? new Date(data.renewalDate) : new Date(0);
  const startDate = data.startDate ? new Date(data.startDate) : null;
  if (isNaN(renewalDate.getTime()) || (startDate && isNaN(startDate.getTime()))) {
    return NextResponse.json({ error: "Enter dates as day, month and year." }, { status: 400 });
  }

  const nextValues: Record<string, any> = {
    clientName: data.clientName.trim(),
    policyNumber: data.policyNumber.trim(),
    company: isAdmin ? data.company : renewal.company,
    bookType: isAdmin ? data.bookType : renewal.bookType,
    insurer: data.insurer ?? null,
    classOfRisk: data.classOfRisk ?? null,
    policyDescription: data.policyDescription ?? null,
    classification: data.classification ?? null,
    referenceCode: data.referenceCode ?? null,
    serviceTeam: data.serviceTeam ?? null,
    policyTeam: data.policyTeam ?? null,
    authRepBroker: data.authRepBroker ?? null,
    paymentPlan: data.paymentPlan ?? null,
    policyCategory1: data.policyCategory1 ?? null,
    startDate,
    renewalDate,
    invoiceTotal: data.invoiceTotal ?? null,
    contactName: data.contactName ?? null,
    contactEmail: data.contactEmail ?? null,
    contactPhone: data.contactPhone ?? null,
    clientAddress: data.clientAddress ?? null,
  };

  const changed: string[] = [];
  for (const key of Object.keys(nextValues)) {
    const before = (renewal as any)[key];
    const after = nextValues[key];
    const a = before instanceof Date ? before.getTime() : before ?? null;
    const b = after instanceof Date ? after.getTime() : after ?? null;
    if (a !== b) changed.push(key);
  }
  if (changed.length === 0) return NextResponse.json({ ok: true, renewal, changed: [] });

  // If the identity fields changed, make sure it doesn't collide with another renewal.
  if (changed.some((k) => ["policyNumber", "renewalDate", "company", "bookType"].includes(k))) {
    const clash = await prisma.renewal.findFirst({
      where: {
        policyNumber: nextValues.policyNumber,
        renewalDate,
        company: nextValues.company as Company,
        bookType: nextValues.bookType as BookType,
        NOT: { id: renewal.id },
        // Lines of the same policy are told apart by their description, as in the upload.
        policyDescription: nextValues.policyDescription,
      },
      select: { id: true },
    });
    if (clash) {
      return NextResponse.json(
        { error: "Another renewal already has this policy number, renewal date, description, portfolio and type." },
        { status: 409 }
      );
    }
  }

  const manualFields = Array.from(new Set([...(renewal.manualFields ?? []), ...changed.filter((k) => !ADMIN_ONLY.includes(k))]));

  const updated = await prisma.renewal.update({
    where: { id: params.id },
    // A new renewal date starts its deadline reminders again.
    data: { ...nextValues, manualFields, ...(changed.includes("renewalDate") ? { lastDueAlert: null } : {}) },
  });

  const details = changed.map((k) => `${FIELD_LABELS[k] || k} (${show((renewal as any)[k])} to ${show(nextValues[k])})`);
  await Promise.all([
    logRenewalHistory(params.id, session.user.id, `${session.user.name} updated ${details.join("; ")}.`),
    logAudit(session.user.id, "RENEWAL_DETAILS_UPDATED", null, {
      renewalId: renewal.id,
      clientName: updated.clientName,
      policyNumber: updated.policyNumber,
      fields: changed.map((k) => FIELD_LABELS[k] || k),
    }),
  ]);

  return NextResponse.json({ ok: true, renewal: updated, changed });
}
