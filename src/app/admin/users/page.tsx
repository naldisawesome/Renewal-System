import { requireSuperAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import UserRow from "./UserRow";
import AddUserForm from "./AddUserForm";
import SignInSettings from "./SignInSettings";
import RestoreButton from "./RestoreButton";
import { DELETE_UNDO_MS, purgeExpiredDeletedUsers } from "@/lib/userPurge";
import { allowedDomains, googleConfigured, passwordLoginEnabled } from "@/lib/signInMethods";

export default async function UsersPage() {
  const session = await requireSuperAdmin();

  // Accounts past their undo window are removed for good whenever this page opens (no scheduled job).
  await purgeExpiredDeletedUsers();
  const recentlyDeleted = await prisma.user.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    select: { id: true, name: true, email: true, deletedAt: true },
  });

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
      showExtras: true,
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

      {recentlyDeleted.length > 0 && (
        <section className="mt-10" aria-labelledby="deleted-h">
          <h2 id="deleted-h" className="section-title mb-3">
            Recently deleted <span className="font-normal text-slate-500">{recentlyDeleted.length}</span>
          </h2>
          <ul className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {recentlyDeleted.map((u) => {
              const msLeft = u.deletedAt!.getTime() + DELETE_UNDO_MS - Date.now();
              const hoursLeft = Math.max(1, Math.ceil(msLeft / 3_600_000));
              return (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-[0.875rem]">
                  <span>
                    <span className="text-slate-900 dark:text-slate-100">{u.name}</span>
                    <span className="ml-2 text-[0.8125rem] text-slate-500">{u.email}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-[0.8125rem] text-slate-500">Removed for good in about {hoursLeft} {hoursLeft === 1 ? "hour" : "hours"}</span>
                    <RestoreButton id={u.id} />
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[0.8125rem] text-slate-500">
            Deleted people can&apos;t sign in. Restoring brings the account back, but renewals that were assigned to them stay Unassigned.
          </p>
        </section>
      )}
    </main>
  );
}
