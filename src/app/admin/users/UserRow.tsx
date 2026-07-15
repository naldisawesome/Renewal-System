"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

type UserRowData = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADVISER" | "POLICY_SERVICE_ASSOCIATE" | "UNDERWRITER";
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  mustChangePassword: boolean;
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
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);

  async function approve() {
    setLoading(true);
    await fetch(`/api/users/${user.id}/approve`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  async function toggleStatus() {
    setLoading(true);
    const nextStatus = user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    await fetch(`/api/users/${user.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setLoading(false);
    router.refresh();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not save changes.");
      return;
    }

    setEditing(false);
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

  if (editing) {
    return (
      <form onSubmit={saveEdit} className="px-5 py-4 space-y-3 bg-slate-50">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="btn-primary text-xs">
            {loading && <Spinner className="mr-1.5" />}
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className="btn-secondary text-xs">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">{user.name}</span>
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
        <div className="text-sm text-slate-500">
          {user.email} · {user._count.assignedRenewals} assigned renewal
          {user._count.assignedRenewals === 1 ? "" : "s"}
        </div>
      </div>

      <div className="flex gap-2">
        {user.status === "PENDING" && (
          <button onClick={approve} disabled={loading} className="btn-primary text-xs">
            {loading && <Spinner className="mr-1.5" />}
            Approve
          </button>
        )}
        <button onClick={() => setEditing(true)} disabled={loading} className="btn-secondary text-xs">
          Edit
        </button>
        {user.role !== "SUPER_ADMIN" && user.status !== "PENDING" && user.id !== currentUserId && (
          <button
            onClick={toggleStatus}
            disabled={loading}
            className={user.status === "SUSPENDED" ? "btn-secondary text-xs" : "btn-danger text-xs"}
          >
            {loading && <Spinner className="mr-1.5" />}
            {user.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
          </button>
        )}
        {user.id !== currentUserId && (
          <button onClick={handleDelete} disabled={loading} className="btn-danger text-xs">
            {loading && <Spinner className="mr-1.5" />}
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
