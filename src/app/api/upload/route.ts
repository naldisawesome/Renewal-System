import { featureOff } from "@/lib/featureFlags";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadMetaSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rateLimit";
import { planUpload, type UploadScope } from "@/lib/uploadPlan";
import { recordProblem } from "@/lib/problems";
import { Company } from "@prisma/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB

/**
 * Upload a renewal export. Send mode=preview first to see what would be added (nothing is saved), then mode=apply
 * with the same file to save it. An upload only adds renewals and contract works that are not in the system yet;
 * it never changes or removes existing records (details, status, allocation, notes). The latest upload can be
 * undone, which removes what it added.
 */
export async function POST(req: Request) {
  const off = await featureOff("upload");
  if (off) return off;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const company = formData.get("company") as string | null;
  const mode = formData.get("mode") === "preview" ? "preview" : "apply";
  const scope: UploadScope = formData.get("scope") === "NEW_CONTRACT_WORKS" ? "NEW_CONTRACT_WORKS" : "ALL";

  const meta = uploadMetaSchema.safeParse({ company });
  if (!meta.success) return NextResponse.json({ error: "Select a Portfolio." }, { status: 400 });
  if (!file) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    return NextResponse.json({ error: "Upload an .xlsx, .xls or .csv file." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "That file is too large (max 20MB). Split it into smaller batches and try again." }, { status: 413 });
  }

  // Previews are cheap and don't count; saving does.
  const { allowed } = await checkRateLimit(`upload:${mode}:${session.user.id}`, mode === "apply" ? 30 : 120, 60 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: "Too many uploads in the last hour. Please try again later." }, { status: 429 });

  const buffer = Buffer.from(await file.arrayBuffer());
  if (/\.xlsx$/i.test(file.name) && !(buffer[0] === 0x50 && buffer[1] === 0x4b)) {
    return NextResponse.json({ error: "That doesn't look like a real .xlsx file." }, { status: 400 });
  }

  const company_ = meta.data.company as Company;
  let plan;
  try {
    plan = await planUpload(buffer, company_, scope);
  } catch (e) {
    return NextResponse.json({ error: "Could not read that file. Make sure it's a valid .xlsx or .csv export." }, { status: 400 });
  }
  if (plan.updates.length > 0) {
    // Belt and braces: an upload must never change anything already stored.
    return NextResponse.json({ error: "This upload would change existing records, so it was stopped. Nothing was saved." }, { status: 500 });
  }
  if (plan.parsed.rows.length === 0) {
    return NextResponse.json({ error: "No usable rows found in the file (check it isn't empty and has Client Name and Policy Number columns)." }, { status: 400 });
  }

  if (mode === "preview") return NextResponse.json({ ok: true, preview: true, ...plan.summary });

  try {
    const { toCreate, summary } = plan;
    const batch = await prisma.uploadBatch.create({
      data: {
        fileName: file.name.slice(0, 200),
        company: company_,
        // A contract-works-only upload is marked by its book type, so Recent uploads can say what kind it was.
        bookType: scope === "NEW_CONTRACT_WORKS" ? "CONTRACT_WORKS" : null,
        uploadedById: session.user.id,
        rowCount: plan.parsed.rows.length,
        contractWorksCount: summary.contractWorksCount,
        renewalsCount: summary.renewalsCount,
        ignoredColumns: summary.ignoredColumns,
      },
    });

    // Only inserts. createMany with skipDuplicates also guarantees a row whose key appeared in the meantime is
    // skipped, never overwritten.
    for (let i = 0; i < toCreate.length; i += 1000) {
      await prisma.renewal.createMany({ data: toCreate.slice(i, i + 1000).map((r) => ({ ...r, uploadBatchId: batch.id })), skipDuplicates: true });
    }
    const created = toCreate.length ? await prisma.renewal.findMany({ where: { uploadBatchId: batch.id }, select: { id: true } }) : [];

    // What this upload added, for Undo.
    const changes = created.map((r) => ({ batchId: batch.id, renewalId: r.id, kind: "CREATED" }));
    for (let i = 0; i < changes.length; i += 1000) {
      await prisma.uploadChange.createMany({ data: changes.slice(i, i + 1000) });
    }

    await prisma.uploadBatch.update({ where: { id: batch.id }, data: { newCount: created.length, updatedCount: 0 } });
    await logAudit(session.user.id, "UPLOAD_COMPLETED", null, {
      fileName: file.name.slice(0, 200),
      company: company_,
      newCount: created.length,
      rows: plan.parsed.rows.length,
      scope,
      alreadyOnFile: summary.alreadyOnFileCount,
    });

    return NextResponse.json({ ok: true, batchId: batch.id, ...summary, newCount: created.length });
  } catch (e) {
    await recordProblem({ source: "server", message: `Upload failed: ${(e as Error).message}`, detail: (e as Error).stack, url: "/api/upload", userId: session.user.id });
    return NextResponse.json({ error: "The upload couldn't be saved. It has been reported; please try again." }, { status: 500 });
  }
}
