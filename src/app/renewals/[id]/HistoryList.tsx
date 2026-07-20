type HistoryEntry = {
  id: string;
  message: string;
  actorName: string;
  createdAt: string;
};

export default function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  return (
    <div className="card p-5 space-y-3">
      <h2 className="font-medium text-slate-900 dark:text-slate-100">History</h2>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {entries.map((h) => (
          <div key={h.id} className="flex items-start gap-3 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
            <div>
              <p className="text-slate-700 dark:text-slate-300">{h.message}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {h.actorName} · {new Date(h.createdAt).toLocaleString("en-NZ")}
              </p>
            </div>
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">No history yet.</p>}
      </div>
    </div>
  );
}
