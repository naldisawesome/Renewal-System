/**
 * Loading placeholders shaped like the page that is coming, so the layout doesn't jump when it arrives.
 * `variant` picks the shape; the shimmer stops when "Reduce motion" is on.
 */
type Variant = "table" | "overview" | "dashboard" | "detail" | "form" | "list";

const Bar = ({ className = "" }: { className?: string }) => <div className={`skel ${className}`} />;

function Head() {
  return (
    <div className="mb-8 space-y-3">
      <Bar className="h-9 w-64" />
      <Bar className="h-4 w-96 max-w-full" />
    </div>
  );
}

function Figures({ n = 4 }: { n?: number }) {
  return (
    <div className={`mb-8 grid border-y border-slate-200 dark:border-slate-800 ${n === 3 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="space-y-2.5 px-1 py-5 sm:px-5">
          <Bar className="h-3.5 w-24" />
          <Bar className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

function Rows({ n = 9 }: { n?: number }) {
  return (
    <div className="tbl-wrap">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
        <Bar className="h-3 w-1/2" />
      </div>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-slate-100 px-3 py-3.5 last:border-0 dark:border-slate-800/70">
          <Bar className="h-3.5 w-44" />
          <Bar className="h-3.5 w-24" />
          <Bar className="hidden h-3.5 w-20 sm:block" />
          <Bar className="hidden h-3.5 w-24 md:block" />
          <Bar className="ml-auto h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function PageLoading({ variant = "table", label = "Loading" }: { variant?: Variant; label?: string }) {
  return (
    <main className={variant === "form" || variant === "detail" ? "page-narrow" : "page"} aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}…</span>
      <Head />
      {variant === "overview" && (
        <>
          <Figures />
          <Bar className="mb-10 h-44 w-full rounded-xl" />
          <div className="grid gap-10 lg:grid-cols-2">
            <Bar className="h-40" />
            <Bar className="h-40" />
          </div>
        </>
      )}
      {variant === "table" && (
        <>
          <Figures />
          <Bar className="mb-4 h-9 w-full" />
          <Rows />
        </>
      )}
      {variant === "list" && <Rows n={7} />}
      {variant === "dashboard" && (
        <>
          <Bar className="mb-6 h-9 w-96 max-w-full" />
          <Figures />
          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <Bar className="h-72 rounded-xl" />
            <Bar className="h-72 rounded-xl" />
          </div>
        </>
      )}
      {variant === "detail" && (
        <>
          <Bar className="mb-10 h-1.5 w-full" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Bar key={i} className="h-4 w-full" />
            ))}
          </div>
        </>
      )}
      {variant === "form" && (
        <div className="space-y-4">
          <Bar className="h-14 w-full rounded-xl" />
          <Bar className="h-36 w-full rounded-xl" />
          <Bar className="h-10 w-40" />
        </div>
      )}
    </main>
  );
}
