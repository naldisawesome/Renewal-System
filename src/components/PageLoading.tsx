import Spinner from "./Spinner";

export default function PageLoading({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-24 text-slate-400">
      <Spinner className="mr-2 text-brand-500" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
