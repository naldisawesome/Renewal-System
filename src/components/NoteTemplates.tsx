"use client";

/** The notes people write most, one tap each. Tapping adds the text to the note box (they can still edit it). */
export const NOTE_TEMPLATES = [
  "Left voicemail",
  "Spoke to client",
  "Waiting on client documents",
  "Quote sent",
  "Client will confirm by",
  "Referred to underwriter",
];

export default function NoteTemplates({ value, onPick }: { value: string; onPick: (next: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick notes">
      {NOTE_TEMPLATES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(value.trim() ? `${value.replace(/\s+$/, "")}. ${t}` : t)}
          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[0.75rem] text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {t}
        </button>
      ))}
    </div>
  );
}
