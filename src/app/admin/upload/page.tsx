import { requireFeature } from "@/lib/featureFlags";
import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import UploadForm from "./UploadForm";
import RecentUploads from "./RecentUploads";

export default async function UploadPage() {
  await requireFeature("upload");
  await requireSuperAdmin();
  const batches = await prisma.uploadBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { uploadedBy: { select: { name: true } } },
  });
  const latestOpen = batches.find((b) => !b.undoneAt);

  return (
    <main className="page-narrow">
      <header className="page-head">
        <div>
          <h1 className="page-title">Upload renewals</h1>
          <p className="page-sub">
            Upload the .xlsx or .csv export exactly as it comes out of your source system. Only rows that aren&apos;t in the system yet are added, and you see them before anything is saved.
          </p>
        </div>
      </header>
      <UploadForm />
      <RecentUploads
        batches={batches.map((b) => ({
          id: b.id,
          fileName: b.fileName,
          company: b.company,
          createdAt: b.createdAt.toISOString(),
          by: b.uploadedBy?.name ?? null,
          newCount: b.newCount,
          updatedCount: b.updatedCount,
          undoneAt: b.undoneAt ? b.undoneAt.toISOString() : null,
          canUndo: !!latestOpen && latestOpen.id === b.id,
          contractWorksOnly: b.bookType === "CONTRACT_WORKS",
        }))}
      />
    </main>
  );
}
