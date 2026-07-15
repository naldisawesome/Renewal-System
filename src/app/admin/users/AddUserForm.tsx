"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

function generatePassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AddUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADVISER" | "SUPER_ADMIN" | "POLICY_SERVICE_ASSOCIATE" | "UNDERWRITER">("ADVISER");
  const [password, setPassword] = useState(generatePassword());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  function reset() {
    setName("");
    setEmail("");
    setRole("ADVISER");
    setPassword(generatePassword());
    setError(null);
    setCreated(null);
  }

  function openModal() {
    reset();
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    reset();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not create the account.");
      return;
    }

    setCreated({ email: data.user.email, password });
    router.refresh();
  }

  return (
    <>
      <button onClick={openModal} className="btn-primary text-sm">
        + Add user
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative card w-full max-w-md p-6">
            {created ? (
              <div className="space-y-3">
                <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                  <p className="font-medium mb-1">Account created.</p>
                  <p>
                    Give these to {created.email} - they'll be prompted to set their own password
                    the first time they log in:
                  </p>
                  <p className="mt-2 font-mono text-xs bg-white/60 rounded px-2 py-1 inline-block break-all">
                    {created.email} / {created.password}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={closeModal} className="btn-secondary text-sm">
                    Done
                  </button>
                  <button onClick={reset} className="btn-secondary text-sm">
                    Add another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-slate-900">Add a user</h2>
                  <button type="button" onClick={closeModal} className="text-sm text-slate-400">
                    Cancel
                  </button>
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <label className="label">Full name</label>
                  <input
                    required
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
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

                <div>
                  <label className="label">Temporary password</label>
                  <div className="flex gap-2">
                    <input
                      required
                      minLength={8}
                      className="input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setPassword(generatePassword())}
                      className="btn-secondary text-xs whitespace-nowrap"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  This account is created active immediately (no approval needed) since you're
                  creating it directly. They'll be forced to set their own password on first login.
                </p>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading && <Spinner className="mr-2" />}
                  {loading ? "Creating..." : "Create account"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
