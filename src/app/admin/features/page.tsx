import { requireOwner } from "@/lib/featureFlags";
import { prisma } from "@/lib/prisma";
import { FEATURES, FEATURE_GROUPS } from "@/lib/features";
import FeatureSwitches from "./FeatureSwitches";

export const dynamic = "force-dynamic";

export default async function FeaturesPage() {
  await requireOwner();
  const rows = await prisma.featureFlag.findMany().catch(() => []);
  const byKey = new Map(rows.map((r: any) => [r.key, r]));
  const items = FEATURES.map((f) => {
    const r: any = byKey.get(f.key);
    return { ...f, enabled: f.locked ? true : r ? r.enabled : true, message: r?.message ?? "", by: r && !r.enabled ? r.updatedByName ?? null : null };
  });
  return (
    <main className="page" style={{ maxWidth: 1100 }}>
      <header className="page-head">
        <div>
          <h1 className="page-title">Feature switches</h1>
          <p className="page-sub">Only you can see this page. Switch a feature off while it is being fixed or isn&apos;t needed. Everyone else stops seeing it; you still do, marked &quot;off&quot;.</p>
        </div>
      </header>
      <FeatureSwitches items={items} groups={[...FEATURE_GROUPS]} />
    </main>
  );
}
