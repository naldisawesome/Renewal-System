import { requireSession } from "@/lib/guards";
import AppShell from "@/components/AppShell";

export default async function AdviserLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <AppShell role={session.user.role} name={session.user.name} email={session.user.email}>
      {children}
    </AppShell>
  );
}
