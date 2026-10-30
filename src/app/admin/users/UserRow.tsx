"use client";

import { createPortal } from "react-dom";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import { CloseIcon } from "@/components/icons";

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
  googleLinkedAt?: Date | string | null;
  createdAt: string | Date;
  _count: { assignedRenewals: number; underwrittenRenewals?: number };
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-[#f7f0de] text-[#80600f] dark:bg-[#2d2615] dark:text-[#e2c47c]",
  ACTIVE: "bg-[#e6f2ee] text-[#16685a] dark:bg-[#132a25] dark:text-[#8fd3c2]",
  SUSPENDED: "bg-[#f8e9e6] text-[#a33a2c] dark:bg-[#311c19] dark:text-[#eda499]",
};
const STATUS_LABELS: Record<string, string> = { PENDING: "Waiting for approval", ACTIVE: "Active", SUSPENDED: "Suspended" };
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADVISER: "Adviser",
  UNDERWRITER: "Underwriter",
  POLICY_SERVICE_ASSOCIATE: "Policy Service Associate",
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
    <tr>
      <td>
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[0.8125rem] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {initial}
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate text-[0.875rem] font-medium text-slate-900 dark:text-slate-100">
              {user.name}
              {user.id === currentUserId && <span className="ml-1.5 font-normal text-slate-500">(you)</span>}
            </div>
            <div className="truncate text-[0.8125rem] text-slate-500">
              {user.email}
              {user.googleLinkedAt && <span className="ml-2 text-[0.75rem] text-brand-700 dark:text-brand-300" title="Has signed in with Google">Google</span>}
            </div>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap">{ROLE_LABELS[user.role]}</td>
      <td className="whitespace-nowrap">
        <span className={`badge badge-dot ${STATUS_STYLES[user.status]}`}>{STATUS_LABELS[user.status]}</span>
        {user.mustChangePassword && <span className="ml-2 text-[0.75rem] text-slate-500">Awaiting first sign-in</span>}
      </td>
      <td className="num text-right">{user._count.assignedRenewals + (user._count.underwrittenRenewals ?? 0)}</td>
      <td className="whitespace-nowrap text-right">
        <div className="flex justify-end gap-1.5">
          {user.status === "PENDING" && (
            <button onClick={approve} disabled={loading} aria-busy={loading} className="btn-primary min-h-[32px] px-3 py-1.5 text-[0.8125rem]">
              {loading && <Spinner />}
              Approve
            </button>
          )}
          <button onClick={openEdit} disabled={loading} className="btn-ghost min-h-[32px] px-3 py-1.5 text-[0.8125rem]">
            Edit
          </button>
        </div>
      {/* The dialog is rendered at the end of the page, not inside this table cell, so the cell's right
          alignment and no-wrap settings can't leak into it. */}
      {editOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center whitespace-normal px-4 text-left">
          <div className="rs-backdrop absolute inset-0 bg-slate-950/40" onClick={closeEdit} />
          <div className="rs-dialog relative w-full rounded-2xl border border-slate-200 bg-white shadow-pop dark:border-slate-800 dark:bg-slate-900 max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-[1.375rem] leading-tight text-slate-900 dark:text-slate-50">Edit user</h2>
              <button
                type="button"
                onClick={closeEdit}
                className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100" aria-label="Close">
            <CloseIcon size={18} />
          </button>
            </div>

            {error && (
              <div className="alert-error" role="alert">
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
                <p className="mb-2 text-[0.8125rem] font-medium text-slate-600 dark:text-slate-300">Account access</p>
                {canChangeStatus && (
                  <button
                    type="button"
                    onClick={toggleStatus}
                    disabled={loading}
                    className={`w-full ${user.status === "SUSPENDED" ? "btn-secondary" : "btn-secondary !text-[#a33a2c] dark:!text-[#eda499]"}`}
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
                    className="w-full btn-danger"
                  >
                    {loading && <Spinner className="mr-1.5" />}
                    Delete user
                  </button>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
      </td>
    </tr>
  );
}
