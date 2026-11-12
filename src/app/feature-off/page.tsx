import Link from "next/link";
import { requireSession } from "@/lib/guards";
import { getFlags } from "@/lib/featureFlags";
import { featureByKey } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function FeatureOffPage({ searchParams }: { searchParams: { f?: string } }) {
  const session = await requireSession();
  const key = searchParams.f ?? "";
  const def = featureByKey(key);
  const message = (await getFlags()).get(key)?.message;
  const home = session.user.role === "SUPER_ADMIN" ? "/admin/renewals" : "/workspace";
  return (
    <main className="page" style={{ maxWidth: 560 }}>
      <div className="card p-8 text-center">
        <h1 className="page-title">{def ? `${def.label} is switched off for now` : "This is switched off for now"}</h1>
        <p className="page-sub mt-2">{message || "It's being worked on or paused. Please check back later."}</p>
        <Link href={home} className="btn btn-primary mt-4 inline-block">Back to renewals</Link>
      </div>
    </main>
  );
}
