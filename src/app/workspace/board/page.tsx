import { requireSession } from "@/lib/guards";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import PipelineViewSwitch, { VIEW_COOKIE } from "@/components/PipelineViewSwitch";
import { loadBoard } from "@/lib/board";
import { ownWhere } from "@/lib/renewalFilters";
import PipelineBoard from "@/components/PipelineBoard";

export const dynamic = "force-dynamic";

export default async function WorkspaceBoardPage({ searchParams }: { searchParams: { view?: string } }) {
  const session = await requireSession();
  if (session.user.role !== "ADVISER" && session.user.role !== "UNDERWRITER") redirect("/workspace");
  // Open on the view this person used last (the switch adds ?view=board when they pick the board on purpose).
  if (searchParams.view !== "board" && cookies().get(VIEW_COOKIE)?.value === "calendar") redirect("/workspace/calendar");
  const data = await loadBoard(ownWhere(session.user), session.user);
  return (
    <main className="page" style={{ maxWidth: 1500 }}>
      <header className="page-head">
        <div>
          <h1 className="page-title">My board</h1>
          <p className="page-sub">Your renewals due soonest at each stage. Drag a card to the next column, or open it to record a quote or an outcome.</p>
        </div>
        <PipelineViewSwitch active="board" />
      </header>
      <PipelineBoard data={data} listBase="/workspace" />
    </main>
  );
}
