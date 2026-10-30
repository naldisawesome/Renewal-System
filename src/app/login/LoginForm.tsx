"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Spinner from "@/components/Spinner";
import AuthShell from "@/components/AuthShell";
import { AlertIcon, EyeIcon, EyeOffIcon } from "@/components/icons";

const REMEMBER_KEY = "rs-remember-email";

const GOOGLE_ERRORS: Record<string, string> = {
  NotCompany: "", // filled in with the company domains below
  OtherGoogleAccount: "A different Google account is linked to this person. Sign in with that one, or ask a Super Admin.",
  Suspended: "Your account has been suspended. Contact a manager.",
  AccessDenied: "Google sign-in was cancelled or refused.",
  OAuthSignin: "Couldn't start Google sign-in. Please try again.",
  OAuthCallback: "Google sign-in didn't complete. Please try again.",
  Callback: "Google sign-in didn't complete. Please try again.",
};

export default function LoginForm({
  google,
  password: passwordOn,
  domains,
  errorCode,
}: {
  google: boolean;
  password: boolean;
  domains: string[];
  errorCode?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const domainText = domains.map((d) => "@" + d).join(" or ");
  const [error, setError] = useState<string | null>(() => {
    if (!errorCode) return null;
    if (errorCode === "NotCompany") return `Use your company Google account (${domainText}). Personal Gmail and other organisations' accounts can't sign in.`;
    return GOOGLE_ERRORS[errorCode] ?? "Sign-in didn't work. Please try again.";
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function continueWithGoogle() {
    setError(null);
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/" });
  }

  // "Remember me" remembers the email address on this device so it's already
  // filled in next time. It deliberately does not lengthen the session - the
  // 8 hour sign-in limit in lib/auth.ts is a security setting and is untouched.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      // storage unavailable (private mode etc.) - just skip it
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      if (res.error === "PENDING_APPROVAL") {
        router.push("/pending");
        return;
      }
      setError(res.error);
      return;
    }

    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, email.trim());
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {
      // ignore
    }

    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell>
      <h1 className="font-serif text-[2rem] font-normal leading-tight tracking-[-0.015em] text-slate-900 dark:text-slate-50">Welcome back</h1>
      <p className="mt-2 text-[0.9375rem] text-slate-500 dark:text-slate-400">
        {google ? `Sign in with your company account (${domainText}).` : "Please sign in to continue."}
      </p>

      {error && (
        <div role="alert" className="alert-error mt-6 flex items-start gap-2.5">
          <AlertIcon size={18} className="mt-px shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {google && (
        <div className="mt-8">
          <button type="button" onClick={continueWithGoogle} disabled={googleLoading} aria-busy={googleLoading} className="btn-primary min-h-[44px] w-full">
            {googleLoading && <Spinner />}
            Continue with Google
          </button>
          <p className="mt-2 text-center text-[0.8125rem] text-slate-500">
            First time? Your account is created when you sign in, then a manager approves it.
          </p>
        </div>
      )}

      {google && passwordOn && (
        <div className="mt-8 flex items-center gap-3 text-[0.8125rem] text-slate-500" aria-hidden="true">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          or use your password
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>
      )}

      {passwordOn && (
      <form onSubmit={handleSubmit} className={`${google ? "mt-6" : "mt-8"} space-y-5`} aria-label="Sign in with email and password">

        <div>
          <label htmlFor="email" className="label">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            placeholder="you@company.co.nz"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              className="input pr-28"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-pressed={showPassword}
              className="absolute inset-y-1 right-1 flex items-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <label className="flex cursor-pointer select-none items-center gap-2.5 whitespace-nowrap py-2 text-[0.875rem] text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded accent-brand-600"
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="whitespace-nowrap rounded-md py-2 text-[0.875rem] font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
          >
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={loading} className={`${google ? "btn-secondary" : "btn-primary"} min-h-[44px] w-full`}>
          {loading && <Spinner />}
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      )}

      {passwordOn && !google && (
        <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-700">
          <p className="mb-3 text-center text-[0.875rem] text-slate-500">New to the team?</p>
          <Link href="/register" className="btn-secondary min-h-[44px] w-full">
            Create an account
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
