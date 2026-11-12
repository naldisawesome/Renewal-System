import { requireSession } from "@/lib/guards";
import AppFrame from "@/components/AppFrame";

export default async function FeatureOffLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return <AppFrame user={session.user as any}>{children}</AppFrame>;
}
