"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import Spinner from "@/components/Spinner";
import AuthShell from "@/components/AuthShell";

export default function RegisterForm({ google, password: passwordOn, domains }: { google: boolean; password: boolean; domains: string[] }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const domainText = domains.map((d) => "@" + d).join(" or ");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong.");
      return;
    }

    router.push("/pending");
  }

  if (google) {
    return (
      <AuthShell>
        <h1 className="font-serif text-[2rem] font-normal leading-tight tracking-[-0.015em] text-slate-900 dark:text-slate-50">Create your account</h1>
        <p className="mt-2 text-[0.9375rem] text-slate-500 dark:text-slate-400">
          Sign in with your company Google account ({domainText}). Your account is created then, and a manager approves it before you can use the system.
        </p>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="btn-primary mt-8 min-h-[44px] w-full"
        >
          Continue with Google
        </button>
        <Link href="/login" className="btn-ghost mt-3 min-h-[44px] w-full">
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  if (!passwordOn) {
    return (
      <AuthShell>
        <h1 className="font-serif text-[2rem] font-normal leading-tight text-slate-900 dark:text-slate-50">Create your account</h1>
        <p className="mt-2 text-[0.9375rem] text-slate-500">New accounts can&apos;t be created right now. Ask a manager.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
        <h1 className="font-serif text-[2rem] font-normal leading-tight tracking-[-0.015em] text-slate-900 dark:text-slate-50">Create your account</h1>
        <p className="mt-2 text-[0.9375rem] text-slate-500 dark:text-slate-400">A manager approves new accounts before you can sign in.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="alert-error" role="alert">
              {error}
            </div>
          )}

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
            <label htmlFor="reg-email" className="label">Company email</label>
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              className="input"
              placeholder={domains[0] ? `you@${domains[0]}` : undefined}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="mt-1 text-[0.75rem] text-slate-500">Must end in {domainText}.</p>
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1.5 text-[0.75rem] text-slate-500">At least 8 characters, with upper and lower case letters and a number.</p>
          </div>

          <button type="submit" disabled={loading} className="btn-primary min-h-[44px] w-full">
            {loading && <Spinner />}
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="pt-2 text-center text-[0.875rem] text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-300">
              Sign in
            </Link>
          </p>
        </form>
    </AuthShell>
  );
}
