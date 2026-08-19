import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import UserRow from "./UserRow";
import AddUserForm from "./AddUserForm";

export default async function UsersPage() {
  const session = await requireSuperAdmin();

  const users = await prisma.user.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      name: true,
      email: true,
      role: true,
      status: true,
      mustChangePassword: true,
      avatarUrl: true,
      createdAt: true,
      _count: { select: { assignedRenewals: true } },
    },
  });

  const pending = users.filter((u) => u.status === "PENDING");
  const others = users.filter((u) => u.status !== "PENDING");

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Users</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Approve, add, edit, and manage access.</p>
          </div>
          <AddUserForm />
        </div>

        {pending.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-medium text-slate-900 dark:text-slate-100">Pending approval ({pending.length})</h2>
            <div className="card divide-y divide-slate-100 dark:divide-slate-700">
              {pending.map((u) => (
                <UserRow key={u.id} user={u} currentUserId={session.user.id} />
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="font-medium text-slate-900 dark:text-slate-100">All users</h2>
          <div className="card divide-y divide-slate-100 dark:divide-slate-700">
            {others.map((u) => (
              <UserRow key={u.id} user={u} currentUserId={session.user.id} />
            ))}
          </div>
        </section>
      </main>
  );
}
