import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRenewalFile, isContractWorksRow, computeDedupeKey } from "@/lib/excelParser";
import { uploadMetaSchema } from "@/lib/validation";
import { Company, BookType, Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const company = formData.get("company") as string | null;

  // There is no Type/Book Type input anymore - it's not something the admin
  // picks. Every row is classified automatically below, based on what the
  // row itself says (Policy Description / Class of Risk / Category).
  const meta = uploadMetaSchema.safeParse({ company });
  if (!meta.success) {
    return NextResponse.json({ error: "Select a Portfolio." }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let parsed;
  try {
    parsed = parseRenewalFile(buffer);
  } catch (err) {
    return NextResponse.json(
      { error: "Could not read that file. Make sure it's a valid .xlsx or .csv export." },
      { status: 400 }
    );
  }

  if (parsed.rows.length === 0) {
    return NextResponse.json(
      { error: "No usable rows found in the file (check the file isn't empty)." },
      { status: 400 }
    );
  }

  const company_ = meta.data.company as Company;

  // Every row is classified on its own merits: if its Policy Description /
  // Class of Risk / Category / Classification text says "Contract Works",
  // it's tagged CONTRACT_WORKS. Everything else is tagged RENEWALS. This
  // runs unconditionally on every upload, so a file can freely contain a mix
  // of both and each row still lands in the right place in All Renewals.
  //
  // Each row also gets a precise dedupeKey (see computeDedupeKey) instead of
  // relying on Policy Number + Renewal Date + Book Type alone, because a
  // single policy commonly has several distinct coverage lines that share
  // all three - which used to make the database silently drop every line
  // after the first, showing far fewer records in All Renewals than the
  // source file actually contains.
  let rows = parsed.rows.map((row) => {
    const bookType = (isContractWorksRow(row) ? "CONTRACT_WORKS" : "RENEWALS") as BookType;
    return { row, bookType, dedupeKey: computeDedupeKey(row, bookType, company_) };
  });

  // Guard against two brand-new rows in the SAME file landing on an
  // identical dedupeKey (only possible via the Policy Description fallback,
  // when the source export has no Id column). Without this, the database's
  // unique constraint would silently drop the second one on insert.
  const seenInBatch = new Map<string, number>();
  rows = rows.map((r) => {
    const seenCount = seenInBatch.get(r.dedupeKey) ?? 0;
    seenInBatch.set(r.dedupeKey, seenCount + 1);
    if (seenCount === 0) return r;
    return { ...r, dedupeKey: `${r.dedupeKey}#${seenCount + 1}` };
  });

  const contractWorksCount = rows.filter((r) => r.bookType === "CONTRACT_WORKS").length;
  const renewalsCount = rows.length - contractWorksCount;

  const batch = await prisma.uploadBatch.create({
    data: {
      fileName: file.name,
      company: company_,
      uploadedById: session.user.id,
      rowCount: parsed.rows.length,
      contractWorksCount,
      renewalsCount,
    },
  });

  // --- Matching existing records -------------------------------------
  // Two ways a row can match something already in the database:
  //  1. By dedupeKey - rows that were previously uploaded under this same
  //     fix. This is the precise, preferred match.
  //  2. By the old Policy Number + Renewal Date + Book Type combination,
  //     but only for rows that don't have a dedupeKey yet (i.e. created
  //     before this fix, or added manually). This lets legacy records get
  //     migrated onto a dedupeKey the next time their file is uploaded,
  //     without creating a duplicate for them.
  const dedupeKeys = rows.map((r) => r.dedupeKey);
  const policyNumbers = Array.from(new Set(rows.map((r) => r.row.policyNumber)));
  const bookTypesInBatch = Array.from(new Set(rows.map((r) => r.bookType)));

  const existingRenewals = await prisma.renewal.findMany({
    where: {
      company: company_,
      OR: [
        { dedupeKey: { in: dedupeKeys } },
        {
          dedupeKey: null,
          bookType: { in: bookTypesInBatch },
          policyNumber: { in: policyNumbers },
        },
      ],
    },
    select: { id: true, dedupeKey: true, policyNumber: true, renewalDate: true, bookType: true },
  });

  const byDedupeKey = new Map<string, string>();
  const byLegacyKey = new Map<string, string>();
  for (const r of existingRenewals) {
    if (r.dedupeKey) {
      byDedupeKey.set(r.dedupeKey, r.id);
    } else {
      const legacyKey = `${r.policyNumber}|${(r.renewalDate ?? new Date(0)).toISOString()}|${r.bookType}`;
      // Only keep this as a candidate if it's the sole legacy row for that
      // key (it always should be, since the old code enforced uniqueness
      // on exactly this combination) - if somehow more than one exists,
      // skip auto-matching rather than guess.
      if (!byLegacyKey.has(legacyKey)) {
        byLegacyKey.set(legacyKey, r.id);
      }
    }
  }

  const claimedLegacyIds = new Set<string>();
  const toCreate: Prisma.RenewalCreateManyInput[] = [];
  const toUpdate: { id: string; data: Prisma.RenewalUpdateInput }[] = [];

  for (const { row, bookType, dedupeKey } of rows) {
    const renewalDate = row.renewalDate ?? new Date(0);

    let existingId = byDedupeKey.get(dedupeKey);
    if (!existingId) {
      const legacyKey = `${row.policyNumber}|${renewalDate.toISOString()}|${bookType}`;
      const legacyId = byLegacyKey.get(legacyKey);
      if (legacyId && !claimedLegacyIds.has(legacyId)) {
        existingId = legacyId;
        claimedLegacyIds.add(legacyId);
      }
    }

    const dataFields = {
      externalId: row.externalId,
      clientName: row.clientName,
      classification: row.classification,
      referenceCode: row.referenceCode,
      classOfRisk: row.classOfRisk,
      policyDescription: row.policyDescription,
      insurer: row.insurer,
      sourceSalesTeam: row.sourceSalesTeam,
      serviceTeam: row.serviceTeam,
      policyTeam: row.policyTeam,
      authRepBroker: row.authRepBroker,
      startDate: row.startDate ?? null,
      paymentPlan: row.paymentPlan,
      invoiceTotal: row.invoiceTotal ?? null,
      policyCategory1: row.policyCategory1,
      uploadBatchId: batch.id,
      dedupeKey,
    };

    if (existingId) {
      // Re-uploads refresh the source data but never touch assignment,
      // status, or comments a manager/adviser has already set.
      toUpdate.push({ id: existingId, data: dataFields });
    } else {
      toCreate.push({
        ...dataFields,
        policyNumber: row.policyNumber,
        renewalDate,
        company: company_,
        bookType,
        status: "UNASSIGNED",
      });
    }
  }

  if (toCreate.length > 0) {
    await prisma.renewal.createMany({ data: toCreate, skipDuplicates: true });
  }

  // Catches the most common remaining real-world cause of "duplicates":
  // someone re-uploading the same source file but picking a different
  // Portfolio than last time. (Type is no longer picked at all - it's
  // derived from each row's own content above - so it's no longer a
  // meaningful source of duplicate records and is excluded from this check.)
  // This doesn't block the upload (the two Portfolios are legitimately
  // different records), it just warns so it can be caught immediately
  // instead of noticed weeks later.
  let crossTypeDuplicateCount = 0;
  if (toCreate.length > 0) {
    const newPolicyNumbers = Array.from(new Set(toCreate.map((r) => r.policyNumber)));
    const crossMatches = await prisma.renewal.findMany({
      where: {
        policyNumber: { in: newPolicyNumbers },
        NOT: { company: company_ },
      },
      select: { policyNumber: true },
      distinct: ["policyNumber"],
    });
    crossTypeDuplicateCount = crossMatches.length;
  }

  // Updates still need one query each (createMany has no "update on conflict"
  // option), but batching them into chunked transactions pipelines the
  // queries over the same connection instead of paying a full round trip
  // for every single row.
  const CHUNK_SIZE = 50;
  for (let i = 0; i < toUpdate.length; i += CHUNK_SIZE) {
    const chunk = toUpdate.slice(i, i + CHUNK_SIZE);
    await prisma.$transaction(
      chunk.map((u) => prisma.renewal.update({ where: { id: u.id }, data: u.data }))
    );
  }

  const newCount = toCreate.length;
  const updatedCount = toUpdate.length;

  await prisma.uploadBatch.update({
    where: { id: batch.id },
    data: { newCount, updatedCount },
  });

  return NextResponse.json({
    ok: true,
    totalRows: parsed.totalRows,
    skipped: parsed.skipped,
    newCount,
    updatedCount,
    crossTypeDuplicateCount,
    contractWorksCount,
    renewalsCount,
  });
}
