import { requireFeature } from "@/lib/featureFlags";
import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import AnnouncementManager from "./AnnouncementManager";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  await requireFeature("announcements");
  await requireSuperAdmin();
  const rows = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  return (
    <main className="page" style={{ maxWidth: 800 }}>
      <header className="page-head">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-sub">Post a short message that shows at the top of the app for everyone.</p>
        </div>
      </header>
      <AnnouncementManager items={rows.map((r: any) => ({ id: r.id, message: r.message, tone: r.tone, active: r.active, createdAt: r.createdAt.toISOString(), createdBy: r.createdBy }))} />
    </main>
  );
}
