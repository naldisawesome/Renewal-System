import { requireSession } from "@/lib/guards";
import AppShell from "@/components/AppShell";
import AnnouncementBanner from "@/components/AnnouncementBanner";

export default async function RenewalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <AppShell role={session.user.role} name={session.user.name} email={session.user.email}>
      <AnnouncementBanner />
      {children}
    </AppShell>
  );
}
