import { requireAdminOrPSA } from "@/lib/guards";
import AppFrame from "@/components/AppFrame";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminOrPSA();
  return <AppFrame user={session.user as any}>{children}</AppFrame>;
}
