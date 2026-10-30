type HistoryEntry = {
  id: string;
  message: string;
  actorName: string;
  createdAt: string;
};

export default function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  return (
    <section aria-labelledby="history-h">
      <h2 id="history-h" className="section-title mb-3">History</h2>
      {entries.length === 0 ? (
        <p className="text-[0.875rem] text-slate-500">No history yet.</p>
      ) : (
        <ol className="relative max-h-80 space-y-3 overflow-y-auto pl-5">
          <span aria-hidden="true" className="absolute bottom-1 left-[3px] top-1.5 w-px bg-slate-200 dark:bg-slate-800" />
          {entries.map((h) => (
            <li key={h.id} className="relative text-[0.8125rem]">
              <span aria-hidden="true" className="absolute -left-5 top-[5px] h-[7px] w-[7px] rounded-full bg-slate-300 ring-[3px] ring-[color:var(--paper)] dark:bg-slate-600" />
              <p className="text-slate-700 dark:text-slate-300">{h.message}</p>
              <p className="mt-0.5 text-[0.75rem] text-slate-500">
                {new Date(h.createdAt).toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Pacific/Auckland" })}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
