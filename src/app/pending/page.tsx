import Link from "next/link";
import AuthShell from "@/components/AuthShell";

export default function PendingPage() {
  return (
    <AuthShell>
      <h1 className="font-serif text-[2rem] font-normal leading-tight tracking-[-0.015em] text-slate-900 dark:text-slate-50">Waiting for approval</h1>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-slate-600 dark:text-slate-300">
        Your account has been created. A manager needs to approve it before you can sign in, and you can sign in as soon as they do.
      </p>
      <Link href="/login" className="btn-secondary mt-8 min-h-[44px] w-full">
        Back to sign in
      </Link>
    </AuthShell>
  );
}
