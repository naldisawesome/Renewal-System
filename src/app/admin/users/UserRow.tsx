"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

type UserRowData = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADVISER" | "POLICY_SERVICE_ASSOCIATE" | "UNDERWRITER";
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  mustChangePassword: boolean;
  avatarUrl: string | null;
  createdAt: string | Date;
  _count: { assignedRenewals: number };
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

export default function UserRow({
  user,
  currentUserId,
}: {
  user: UserRowData;
  currentUserId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);

  const canChangeStatus =
    user.role !== "SUPER_ADMIN" && user.status !== "PENDING" && user.id !== currentUserId;
  const canDelete = user.id !== currentUserId;

  function openEdit() {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
    setRole(user.role);
    setError(null);
    setEditOpen(true);
  }

  function closeEdit() {
    if (loading) return;
    setEditOpen(false);
  }

  async function approve() {
    setLoading(true);
    await fetch(`/api/users/${user.id}/approve`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  async function toggleStatus() {
    const nextStatus = user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    if (
      nextStatus === "SUSPENDED" &&
      !confirm(`Suspend ${user.name}? They won't be able to sign in until reactivated.`)
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/users/${user.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not update status.");
      return;
    }
    router.refresh();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, role }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not save changes.");
      return;
    }

    setEditOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    if (
      !confirm(
        `Delete ${user.name}? Any renewals assigned to them will become Unassigned. This can't be undone.`
      )
    ) {
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      alert(data.error || "Could not delete this user.");
      return;
    }
    router.refresh();
  }

  const initial = user.name?.trim()?.[0]?.toUpperCase() || "?";

  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-3">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-9 h-9 rounded-full object-cover shrink-0"
          />
        ) : (
          <span className="w-9 h-9 rounded-full bg-brand-600 text-white text-sm font-semibold flex items-center justify-center shrink-0">
            {initial}
          </span>
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 dark:text-slate-100">{user.name}</span>
            <span className={`badge ${STATUS_STYLES[user.status]}`}>{user.status}</span>
            {user.role === "SUPER_ADMIN" && (
              <span className="badge bg-slate-800 text-white">Super Admin</span>
            )}
            {user.role === "POLICY_SERVICE_ASSOCIATE" && (
              <span className="badge bg-indigo-100 text-indigo-700">Policy Service Associate</span>
            )}
            {user.role === "UNDERWRITER" && (
              <span className="badge bg-purple-100 text-purple-700">Underwriter</span>
            )}
            {user.mustChangePassword && (
              <span className="badge bg-amber-50 text-amber-600">Awaiting first login</span>
            )}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {user.email} · {user._count.assignedRenewals} assigned renewal
            {user._count.assignedRenewals === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {user.status === "PENDING" && (
          <button onClick={approve} disabled={loading} className="btn-primary text-xs">
            {loading && <Spinner className="mr-1.5" />}
            Approve
          </button>
        )}
        <button onClick={openEdit} disabled={loading} className="btn-secondary text-xs">
          Edit
        </button>
      </div>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
          <div className="relative card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-slate-900 dark:text-slate-100">Edit user</h2>
              <button
                type="button"
                onClick={closeEdit}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">First name</label>
                  <input
                    required
                    className="input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Last name</label>
                  <input
                    required
                    className="input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Role</label>
                <select className="input" value={role} onChange={(e) => setRole(e.target.value as any)}>
                  <option value="ADVISER">Adviser</option>
                  <option value="UNDERWRITER">Underwriter</option>
                  <option value="POLICY_SERVICE_ASSOCIATE">Policy Service Associate</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="btn-primary text-sm flex-1">
                  {loading && <Spinner className="mr-1.5" />}
                  Save changes
                </button>
                <button type="button" onClick={closeEdit} disabled={loading} className="btn-secondary text-sm">
                  Cancel
                </button>
              </div>
            </form>

            {/* Suspend/reactivate and delete both live inside the modal
                (rather than as row buttons) specifically so neither can be
                misclicked from the users list - each now takes an extra
                click to even reach, plus a confirmation before acting. */}
            {(canChangeStatus || canDelete) && (
              <div className="border-t border-slate-100 dark:border-slate-700 pt-4 space-y-2">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Danger zone</p>
                {canChangeStatus && (
                  <button
                    type="button"
                    onClick={toggleStatus}
                    disabled={loading}
                    className={`w-full text-sm ${user.status === "SUSPENDED" ? "btn-secondary" : "btn-danger"}`}
                  >
                    {loading && <Spinner className="mr-1.5" />}
                    {user.status === "SUSPENDED" ? "Reactivate account" : "Suspend account"}
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="w-full btn-danger text-sm"
                  >
                    {loading && <Spinner className="mr-1.5" />}
                    Delete user
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
