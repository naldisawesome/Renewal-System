import Link from "next/link";

export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 max-w-md text-center space-y-3">
        <div className="text-3xl">⏳</div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Waiting on approval</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Your account has been created but a manager still needs to approve it before you can
          sign in. You'll be able to log in as soon as that happens.
        </p>
        <Link href="/login" className="btn-secondary inline-flex mt-2">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
