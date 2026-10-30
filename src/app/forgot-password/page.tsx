import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { ArrowLeftIcon } from "@/components/icons";

export const metadata = { title: "Forgot password | Renewal System" };

// There is no email service wired up yet, so passwords can't be reset by the
// user themselves. This page tells people what to do instead of leaving the
// "Forgot password?" link on the sign-in screen with nowhere to go.
export default function ForgotPasswordPage() {
  const steps = [
    "Contact your manager (a Super Admin).",
    "Tell them the email address you sign in with.",
    "Once they've helped you, come back and sign in.",
  ];

  return (
    <AuthShell>
      <h1 className="font-serif text-[2rem] font-normal leading-tight tracking-[-0.015em] text-slate-900 dark:text-slate-50">Forgot your password?</h1>
      <p className="mt-2 text-[0.9375rem] text-slate-500 dark:text-slate-400">
        For security, a manager resets it for you.
      </p>

      <ol className="mt-8 space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
        {steps.map((step, i) => (
          <li key={step} className="flex items-start gap-4">
            <span className="figure w-5 shrink-0 text-[1.25rem] leading-6 text-slate-400">{i + 1}</span>
            <p className="text-[0.9375rem] leading-6 text-slate-700 dark:text-slate-200">{step}</p>
          </li>
        ))}
      </ol>

      <Link href="/login" className="btn-secondary mt-10 min-h-[44px] w-full">
        <ArrowLeftIcon size={16} />
        Back to sign in
      </Link>
    </AuthShell>
  );
}
