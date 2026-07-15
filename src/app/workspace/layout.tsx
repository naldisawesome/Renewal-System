import { requireSession } from "@/lib/guards";
import NavBar from "@/components/NavBar";

export default async function AdviserLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div>
      <NavBar role={session.user.role} name={session.user.name} />
      {children}
    </div>
  );
}
