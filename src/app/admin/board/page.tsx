import { requireSuperAdmin } from "@/lib/guards";
import { loadBoard } from "@/lib/board";
import PipelineBoard from "@/components/PipelineBoard";

export const dynamic = "force-dynamic";

export default async function AdminBoardPage() {
  const session = await requireSuperAdmin();
  const data = await loadBoard({}, session.user);
  return (
    <main className="page" style={{ maxWidth: 1500 }}>
      <header className="page-head">
        <div>
          <h1 className="page-title">Board</h1>
          <p className="page-sub">The renewals due soonest at each stage. Drag a card one step forward, or open it to record a quote or an outcome.</p>
        </div>
      </header>
      <PipelineBoard data={data} listBase="/admin/renewals" />
    </main>
  );
}
