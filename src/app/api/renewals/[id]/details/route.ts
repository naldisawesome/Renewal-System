import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renewalUpdateSchema } from "@/lib/validation";
import { logRenewalHistory } from "@/lib/history";
import { Company, BookType } from "@prisma/client";

const FIELD_LABELS: Record<string, string> = {
  clientName: "Client",
  policyNumber: "Policy Number",
  company: "Portfolio",
  bookType: "Type",
  insurer: "Insurer",
  classOfRisk: "Class of Risk",
  policyDescription: "Policy Description",
  classification: "Classification",
  referenceCode: "Reference Code",
  serviceTeam: "Service Team",
  policyTeam: "Policy Team",
  authRepBroker: "Auth Rep / Producing Broker",
  paymentPlan: "Payment Plan",
  policyCategory1: "Policy Category",
  startDate: "Start Date",
  renewalDate: "Renewal Date",
  invoiceTotal: "Invoice Total",
};

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const renewal = await prisma.renewal.findUnique({ where: { id: params.id } });
  if (!renewal) {
    return NextResponse.json({ error: "Renewal not found." }, { status: 404 });
  }

  const body = await req.json();
  const parsed = renewalUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const renewalDate = data.renewalDate ? new Date(data.renewalDate) : new Date(0);
  const startDate = data.startDate ? new Date(data.startDate) : null;

  // If the identity fields changed, make sure it doesn't collide with another renewal.
  const identityChanged =
    data.policyNumber !== renewal.policyNumber ||
    renewalDate.getTime() !== (renewal.renewalDate?.getTime() ?? 0) ||
    data.company !== renewal.company ||
    data.bookType !== renewal.bookType;

  if (identityChanged) {
    const clash = await prisma.renewal.findUnique({
      where: {
        uniqueRenewalKey: {
          policyNumber: data.policyNumber,
          renewalDate,
          company: data.company as Company,
          bookType: data.bookType as BookType,
        },
      },
    });
    if (clash && clash.id !== renewal.id) {
      return NextResponse.json(
        { error: "Another renewal already has this policy number, renewal date, portfolio, and type." },
        { status: 409 }
      );
    }
  }

  const nextValues: Record<string, any> = {
    clientName: data.clientName,
    policyNumber: data.policyNumber,
    company: data.company,
    bookType: data.bookType,
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
  };

  const changedFields: string[] = [];
  for (const key of Object.keys(nextValues)) {
    const before = (renewal as any)[key];
    const after = nextValues[key];
    const beforeComparable = before instanceof Date ? before.getTime() : before ?? null;
    const afterComparable = after instanceof Date ? after.getTime() : after ?? null;
    if (beforeComparable !== afterComparable) {
      changedFields.push(FIELD_LABELS[key] || key);
    }
  }

  const updated = await prisma.renewal.update({
    where: { id: params.id },
    data: nextValues,
  });

  if (changedFields.length > 0) {
    await logRenewalHistory(
      params.id,
      session.user.id,
      `${session.user.name} updated: ${changedFields.join(", ")}.`
    );
  }

  return NextResponse.json({ ok: true, renewal: updated });
}
