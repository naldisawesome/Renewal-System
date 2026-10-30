import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import * as XLSX from "xlsx";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminRenewalsWhere, mineWhere } from "@/lib/renewalFilters";
import { STATUS_LABELS } from "@/lib/statusFlow";
import { daysUntil, nzToday, riskReason, dueWindow, DUE_WINDOWS } from "@/lib/deadlines";
import { premiumChange } from "@/lib/outcomes";
import { logAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_ROWS = 20_000;

/**
 * Excel download of a renewals list, with the same filters as the page it came from:
 *   scope=all  - All renewals (Super Admins and Policy Service Associates)
 *   scope=mine - My renewals (the signed-in adviser's or underwriter's own)
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const scope = params.scope === "mine" ? "mine" : "all";
  const role = session.user.role;

  if (scope === "all" && role !== "SUPER_ADMIN" && role !== "POLICY_SERVICE_ASSOCIATE") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  if (scope === "mine" && role !== "ADVISER" && role !== "UNDERWRITER") {
    return NextResponse.json({ error: "Only advisers and underwriters have a My renewals list." }, { status: 400 });
  }

  const { allowed } = await checkRateLimit(`export:${session.user.id}`, 60, 60 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: "Too many exports in the last hour. Please try again later." }, { status: 429 });

  const today = nzToday();
  const where = scope === "all" ? adminRenewalsWhere(params, today) : mineWhere(session.user, params, today);
  const multiplier = Number(params.multiplier);
  const withTarget = Number.isFinite(multiplier) && multiplier > 0 && multiplier !== 1;

  const renewals = await prisma.renewal.findMany({
    where,
    orderBy: { renewalDate: "asc" },
    take: MAX_ROWS,
    include: {
      assignedAdviser: { select: { name: true } },
      assignedUnderwriter: { select: { name: true } },
      outcomeBy: { select: { name: true } },
    },
  });

  const date = (d: Date | null | undefined) => (d && d.getTime() !== 0 ? d : null);
  const windowLabel = (key: string | null) => (key ? DUE_WINDOWS.find((w) => w.key === key)!.label : "");

  const header = [
    "Client",
    "Policy number",
    "Insurer",
    "Portfolio",
    "Type",
    "Class of risk",
    "Description",
    "Renewal date",
    "Days to renewal",
    "Deadline",
    "At risk",
    "Status",
    "Adviser",
    "Underwriter",
    "Invoice total",
    ...(withTarget ? [`Target GWP (${multiplier}x)`] : []),
    "Quoted premium",
    "Renewed premium",
    "Change",
    "Renewed with",
    "Lost reason",
    "Outcome note",
    "Outcome recorded",
    "Outcome recorded by",
    "Next follow-up",
    "Follow-up note",
    "Days at current step",
    "Contact name",
    "Contact email",
    "Contact phone",
    "Address",
    "Start date",
    "Payment plan",
    "Sales team (file)",
    "Service team",
    "Policy team",
    "Auth rep / broker",
    "Classification",
    "Reference code",
    "Policy category",
  ];

  const rows = renewals.map((r: any) => {
    const open = dueWindow(r.renewalDate, r.status, today);
    const days = daysUntil(r.renewalDate, today);
    const change = r.status === "RENEWED" ? premiumChange(r.invoiceTotal, r.outcomePremium) : null;
    return [
      r.clientName,
      r.policyNumber,
      r.insurer ?? "",
      r.company === "BLANKET" ? "Blanket" : "Cactus",
      r.bookType === "CONTRACT_WORKS" ? "Contract Works" : "Renewals",
      r.classOfRisk ?? "",
      r.policyDescription ?? "",
      date(r.renewalDate),
      ["RENEWED", "CANCELLED", "LAPSED"].includes(r.status) ? null : days,
      windowLabel(open),
      riskReason(r.renewalDate, r.status, today) ?? "",
      STATUS_LABELS[r.status] ?? r.status,
      r.assignedAdviser?.name ?? "",
      r.assignedUnderwriter?.name ?? "",
      r.invoiceTotal ?? null,
      ...(withTarget ? [r.invoiceTotal != null ? r.invoiceTotal * multiplier : null] : []),
      r.quotedPremium ?? null,
      r.outcomePremium ?? null,
      change != null ? change / 100 : null,
      r.outcomeInsurer ?? "",
      r.outcomeReason ?? "",
      r.outcomeNote ?? "",
      date(r.outcomeAt),
      r.outcomeBy?.name ?? "",
      date(r.followUpAt),
      r.followUpNote ?? "",
      r.statusChangedAt && !["RENEWED", "CANCELLED", "LAPSED"].includes(r.status) ? Math.floor((Date.now() - r.statusChangedAt.getTime()) / 86_400_000) : null,
      r.contactName ?? "",
      r.contactEmail ?? "",
      r.contactPhone ?? "",
      r.clientAddress ?? "",
      date(r.startDate),
      r.paymentPlan ?? "",
      r.sourceSalesTeam ?? "",
      r.serviceTeam ?? "",
      r.policyTeam ?? "",
      r.authRepBroker ?? "",
      r.classification ?? "",
      r.referenceCode ?? "",
      r.policyCategory1 ?? "",
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows], { cellDates: true });

  // Number formats: NZD for money, a plain date for dates, percent for the premium change.
  const fmt: Record<string, string> = {};
  header.forEach((h, i) => {
    if (/total|premium|GWP/i.test(h) && h !== "Renewed with") fmt[i] = '"$"#,##0.00';
    if (/date|recorded$|follow-up$/i.test(h)) fmt[i] = "dd/mm/yyyy";
    if (h === "Change") fmt[i] = "+0.0%;-0.0%;0.0%";
  });
  for (let r = 1; r <= rows.length; r++) {
    for (const [c, z] of Object.entries(fmt)) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: Number(c) })];
      if (cell && cell.v != null && cell.v !== "") cell.z = z;
    }
  }
  ws["!cols"] = header.map((h, i) => {
    const longest = Math.max(h.length, ...rows.slice(0, 500).map((row) => (row[i] instanceof Date ? 10 : String(row[i] ?? "").length)));
    return { wch: Math.min(Math.max(longest + 2, 8), 42) };
  });
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: header.length - 1 } }) };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Renewals");
  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true });

  const stamp = today.toISOString().slice(0, 10);
  const label = [scope === "mine" ? "my-renewals" : "renewals", params.due ? `due-${params.due}` : "", params.status ? params.status.toLowerCase() : "", params.month ?? ""]
    .filter(Boolean)
    .join("-");
  const fileName = `${label}-${stamp}.xlsx`;

  const filters = Object.fromEntries(Object.entries(params).filter(([k]) => k !== "scope").map(([k, v]) => [k, String(v).slice(0, 100)]));
  await logAudit(session.user.id, "RENEWALS_EXPORTED", null, { count: rows.length, scope, filters });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
