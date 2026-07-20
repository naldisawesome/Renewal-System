import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renewalCreateSchema } from "@/lib/validation";
import { logRenewalHistory } from "@/lib/history";
import { Company, BookType } from "@prisma/client";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = renewalCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const renewalDate = data.renewalDate ? new Date(data.renewalDate) : new Date(0);
  const startDate = data.startDate ? new Date(data.startDate) : null;

  const existing = await prisma.renewal.findFirst({
    where: {
      policyNumber: data.policyNumber,
      renewalDate,
      company: data.company as Company,
      bookType: data.bookType as BookType,
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "A renewal with this policy number, renewal date, portfolio, and type already exists." },
      { status: 409 }
    );
  }

  const renewal = await prisma.renewal.create({
    data: {
      clientName: data.clientName,
      policyNumber: data.policyNumber,
      company: data.company as Company,
      bookType: data.bookType as BookType,
      insurer: data.insurer,
      classOfRisk: data.classOfRisk,
      policyDescription: data.policyDescription,
      classification: data.classification,
      referenceCode: data.referenceCode,
      serviceTeam: data.serviceTeam,
      policyTeam: data.policyTeam,
      authRepBroker: data.authRepBroker,
      paymentPlan: data.paymentPlan,
      policyCategory1: data.policyCategory1,
      startDate,
      renewalDate,
      invoiceTotal: data.invoiceTotal ?? null,
      status: "UNASSIGNED",
    },
  });

  await logRenewalHistory(renewal.id, session.user.id, `${session.user.name} added this renewal manually.`);

  return NextResponse.json({ ok: true, renewal });
}
