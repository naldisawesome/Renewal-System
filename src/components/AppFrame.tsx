import AppShell from "@/components/AppShell";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { FeatureProvider } from "@/components/FeatureProvider";
import { isOwner, offKeys } from "@/lib/featureFlags";

/** The signed-in frame shared by every area: the top bar, the notices, and the feature switches applied. */
export default async function AppFrame({
  user,
  children,
}: {
  user: { id: string; role: any; name: string; email: string };
  children: React.ReactNode;
}) {
  const [off, owner] = await Promise.all([offKeys(), isOwner(user.id)]);
  return (
    <FeatureProvider off={owner ? [] : off}>
      <AppShell role={user.role} name={user.name} email={user.email} off={off} owner={owner}>
        {!off.includes("announcements") && <AnnouncementBanner />}
        {children}
      </AppShell>
    </FeatureProvider>
  );
}
