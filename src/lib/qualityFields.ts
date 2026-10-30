import type { Prisma } from "@prisma/client";

/** Fields the data-quality report checks, and how "missing" is defined for each. */
export const QUALITY_FIELDS: { key: string; label: string; where: Prisma.RenewalWhereInput }[] = [
  { key: "renewalDate", label: "Renewal date", where: { OR: [{ renewalDate: null }, { renewalDate: new Date(0) }] } },
  { key: "insurer", label: "Insurer", where: { OR: [{ insurer: null }, { insurer: "" }] } },
  { key: "invoiceTotal", label: "Invoice total", where: { invoiceTotal: null } },
  { key: "classOfRisk", label: "Class of risk", where: { OR: [{ classOfRisk: null }, { classOfRisk: "" }] } },
  { key: "contactName", label: "Contact name", where: { OR: [{ contactName: null }, { contactName: "" }] } },
  { key: "contactEmail", label: "Contact email", where: { OR: [{ contactEmail: null }, { contactEmail: "" }] } },
  { key: "contactPhone", label: "Contact phone", where: { OR: [{ contactPhone: null }, { contactPhone: "" }] } },
  { key: "underwriter", label: "Underwriter", where: { assignedUnderwriterId: null, status: { notIn: ["UNASSIGNED"] as any } } },
];

