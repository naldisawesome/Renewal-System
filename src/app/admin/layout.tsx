import { requireAdminOrPSA } from "@/lib/guards";
import NavBar from "@/components/NavBar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminOrPSA();

  return (
    <div>
      <NavBar role={session.user.role} name={session.user.name} />
      {children}
    </div>
  );
}
