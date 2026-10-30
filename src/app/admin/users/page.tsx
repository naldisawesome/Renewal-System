import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import UserRow from "./UserRow";
import AddUserForm from "./AddUserForm";
import SignInSettings from "./SignInSettings";
import { allowedDomains, googleConfigured, passwordLoginEnabled } from "@/lib/signInMethods";

export default async function UsersPage() {
  const session = await requireSuperAdmin();

  const users = await prisma.user.findMany({
    // Deleted accounts are kept for history but no longer listed here.
    where: { deletedAt: null },
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
      googleLinkedAt: true,
      createdAt: true,
      _count: { select: { assignedRenewals: true, underwrittenRenewals: true } },
    },
  });

  const passwordOn = await passwordLoginEnabled();
  const active = users.filter((u) => u.status === "ACTIVE");
  const notLinked = active.filter((u) => !u.googleLinkedAt).map((u) => ({ id: u.id, name: u.name, email: u.email }));

  const pending = users.filter((u) => u.status === "PENDING");
  const others = users.filter((u) => u.status !== "PENDING");

  const head = (
    <thead>
      <tr>
        <th>Name</th>
        <th>Role</th>
        <th>Status</th>
        <th className="text-right">Assigned</th>
        <th className="w-40"><span className="sr-only">Actions</span></th>
      </tr>
    </thead>
  );

  return (
    <main className="page" style={{ maxWidth: 1100 }}>
      <header className="page-head">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-sub">Approve new sign-ups, add people, and manage roles and access.</p>
        </div>
        <AddUserForm />
      </header>

      <SignInSettings
        google={googleConfigured()}
        passwordOn={passwordOn}
        forcedOn={process.env.PASSWORD_LOGIN_FORCE_ON === "true"}
        domains={allowedDomains()}
        linked={active.length - notLinked.length}
        total={active.length}
        notLinked={notLinked}
        meLinked={!!users.find((u) => u.id === session.user.id)?.googleLinkedAt}
      />

      {pending.length > 0 && (
        <section className="mb-10" aria-labelledby="pending-h">
          <h2 id="pending-h" className="section-title mb-3">
            Waiting for approval <span className="font-normal text-slate-500">{pending.length}</span>
          </h2>
          <div className="tbl-wrap">
            <table className="tbl">
              {head}
              <tbody>
                {pending.map((u) => (
                  <UserRow key={u.id} user={u} currentUserId={session.user.id} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="team-h">
        <h2 id="team-h" className="section-title mb-3">
          Team <span className="font-normal text-slate-500">{others.length}</span>
        </h2>
        <div className="tbl-wrap">
          <table className="tbl">
            {head}
            <tbody>
              {others.map((u) => (
                <UserRow key={u.id} user={u} currentUserId={session.user.id} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
