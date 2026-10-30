"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

/**
 * Sign-in options for Super Admins: whether Google is set up, who has linked their Google account, and the switch
 * that turns password sign-in off once everyone has.
 */
export default function SignInSettings({
  google,
  passwordOn,
  forcedOn,
  domains,
  linked,
  total,
  notLinked,
  meLinked,
}: {
  google: boolean;
  passwordOn: boolean;
  forcedOn: boolean;
  domains: string[];
  linked: number;
  total: number;
  notLinked: { id: string; name: string; email: string }[];
  meLinked: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);

  async function set(on: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/sign-in-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passwordLogin: on }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setConfirming(false);
    if (!res.ok) {
      setError(data.error || "Couldn't change the setting.");
      return;
    }
    router.refresh();
  }

  const domainText = domains.map((d) => "@" + d).join(" and ");
  const everyone = total > 0 && linked === total;

  return (
    <section aria-labelledby="signin-h" className="mb-10">
      <h2 id="signin-h" className="section-title mb-3">Sign-in</h2>
      <div className="grid border-y border-slate-200 dark:border-slate-800 md:grid-cols-2">
        <div className="py-4 pr-6">
          <p className="text-[0.8125rem] text-slate-500">Google sign-in</p>
          {google ? (
            <>
              <p className="mt-1 text-[0.9375rem] text-slate-900 dark:text-slate-100">
                On for {domainText} accounts
              </p>
              <p className="mt-1 text-[0.8125rem] text-slate-500">
                <span className="num">{linked}</span> of <span className="num">{total}</span> active {total === 1 ? "person has" : "people have"} signed in with Google.
                {notLinked.length > 0 && (
                  <>
                    {" "}
                    <button type="button" onClick={() => setShowList((s) => !s)} aria-expanded={showList} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
                      {showList ? "Hide" : "Show"} who hasn&apos;t
                    </button>
                  </>
                )}
              </p>
              {showList && (
                <ul className="mt-2 space-y-0.5 text-[0.8125rem] text-slate-600 dark:text-slate-300">
                  {notLinked.map((u) => (
                    <li key={u.id}>
                      {u.name} <span className="text-slate-500">{u.email}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="mt-1 text-[0.875rem] text-slate-600 dark:text-slate-300">
              Not set up yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel to turn it on.
            </p>
          )}
        </div>

        <div className="border-t border-slate-200 py-4 dark:border-slate-800 md:border-l md:border-t-0 md:pl-6">
          <p className="text-[0.8125rem] text-slate-500">Email and password sign-in</p>
          <p className="mt-1 text-[0.9375rem] text-slate-900 dark:text-slate-100">{passwordOn ? "On" : "Off"}</p>
          {forcedOn && (
            <p className="mt-1 text-[0.8125rem] text-[#80600f] dark:text-[#e2c47c]">Kept on by the PASSWORD_LOGIN_FORCE_ON setting in Vercel.</p>
          )}

          {google && !forcedOn && passwordOn && !confirming && (
            <div className="mt-2">
              <button type="button" className="btn-secondary min-h-[36px] text-[0.8125rem]" onClick={() => setConfirming(true)} disabled={!meLinked}>
                Turn off password sign-in
              </button>
              <p className="mt-1.5 text-[0.75rem] text-slate-500">
                {!meLinked
                  ? "Sign in with Google yourself first, so you can still get in afterwards."
                  : everyone
                    ? "Everyone has signed in with Google, so it's safe to turn passwords off."
                    : `${notLinked.length} ${notLinked.length === 1 ? "person hasn't" : "people haven't"} used Google yet. They'll need it to get in.`}
              </p>
            </div>
          )}

          {confirming && (
            <div className="rs-pop mt-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700" role="group" aria-label="Confirm">
              <p className="text-[0.8125rem] text-slate-700 dark:text-slate-200">
                Everyone signed in with a password is signed out within a minute, and from then on only Google works.
              </p>
              <div className="mt-2 flex gap-2">
                <button type="button" className="btn-danger min-h-[34px] text-[0.8125rem]" onClick={() => set(false)} disabled={busy} aria-busy={busy}>
                  {busy && <Spinner />}
                  Turn off
                </button>
                <button type="button" className="btn-ghost min-h-[34px] text-[0.8125rem]" onClick={() => setConfirming(false)} disabled={busy}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {google && !forcedOn && !passwordOn && (
            <button type="button" className="btn-ghost mt-2 min-h-[34px] px-0 text-[0.8125rem]" onClick={() => set(true)} disabled={busy}>
              {busy && <Spinner />}
              Turn password sign-in back on
            </button>
          )}
          {error && <p className="alert-error mt-2" role="alert">{error}</p>}
        </div>
      </div>
    </section>
  );
}
