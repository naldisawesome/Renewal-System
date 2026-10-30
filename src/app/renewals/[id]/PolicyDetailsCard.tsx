"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

type RenewalFull = {
  id: string;
  clientName: string;
  policyNumber: string;
  company: string;
  bookType: string;
  insurer: string | null;
  classOfRisk: string | null;
  policyDescription: string | null;
  classification: string | null;
  referenceCode: string | null;
  serviceTeam: string | null;
  policyTeam: string | null;
  authRepBroker: string | null;
  paymentPlan: string | null;
  policyCategory1: string | null;
  sourceSalesTeam: string | null;
  startDate: string | null;
  renewalDate: string | null;
  invoiceTotal: number | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  clientAddress: string | null;
  manualFields: string[];
};

type Key = Exclude<keyof RenewalFull, "id" | "manualFields" | "sourceSalesTeam">;
type Field = { key: Key; label: string; type?: "text" | "date" | "money" | "email" | "tel"; required?: boolean; wide?: boolean };

const POLICY_FIELDS: Field[] = [
  { key: "clientName", label: "Client", required: true },
  { key: "policyNumber", label: "Policy number", required: true },
  { key: "insurer", label: "Insurer" },
  { key: "classOfRisk", label: "Class of risk" },
  { key: "policyDescription", label: "Description", wide: true },
  { key: "startDate", label: "Start date", type: "date" },
  { key: "renewalDate", label: "Renewal date", type: "date" },
  { key: "invoiceTotal", label: "Invoice total", type: "money" },
  { key: "paymentPlan", label: "Payment plan" },
  { key: "classification", label: "Classification" },
  { key: "referenceCode", label: "Reference code" },
  { key: "serviceTeam", label: "Service team" },
  { key: "policyTeam", label: "Policy team" },
  { key: "authRepBroker", label: "Auth rep / broker" },
  { key: "policyCategory1", label: "Category" },
];

const CONTACT_FIELDS: Field[] = [
  { key: "contactName", label: "Contact name" },
  { key: "contactPhone", label: "Phone", type: "tel" },
  { key: "contactEmail", label: "Email", type: "email", wide: true },
  { key: "clientAddress", label: "Address", wide: true },
];

function toDateInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime()) || d.getTime() === 0) return "";
  return d.toISOString().slice(0, 10);
}

function display(f: Field, v: unknown): string | null {
  if (v == null || v === "") return null;
  if (f.type === "date") {
    const d = new Date(v as string);
    return isNaN(d.getTime()) || d.getTime() === 0 ? null : d.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  }
  if (f.type === "money") return (v as number).toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
  return String(v);
}

function initialForm(r: RenewalFull) {
  const out: Record<string, string> = { company: r.company, bookType: r.bookType };
  for (const f of [...POLICY_FIELDS, ...CONTACT_FIELDS]) {
    const v = r[f.key];
    out[f.key] = f.type === "date" ? toDateInput(v as string | null) : v == null ? "" : String(v);
  }
  return out;
}

/**
 * Policy and client details. Super Admins and the people assigned to the renewal can fill in or correct them;
 * anything edited here is kept when a new file is uploaded.
 */
export default function PolicyDetailsCard({
  renewal,
  canEdit,
  isAdmin,
}: {
  renewal: RenewalFull;
  canEdit: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [form, setForm] = useState(() => initialForm(renewal));

  const manual = new Set(renewal.manualFields);
  const missing = [...POLICY_FIELDS, ...CONTACT_FIELDS].filter((f) => display(f, renewal[f.key]) == null);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function open() {
    setForm(initialForm(renewal));
    setError(null);
    setSaved(null);
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/renewals/${renewal.id}/details`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Couldn't save the changes.");
      return;
    }
    const n = (data.changed ?? []).length;
    setSaved(n === 0 ? "Nothing had changed." : `Saved ${n} ${n === 1 ? "change" : "changes"}.`);
    setEditing(false);
    router.refresh();
  }

  const view = (title: string, id: string, fields: Field[]) => (
    <div>
      <h3 id={id} className="mb-2 text-[0.8125rem] font-medium text-slate-700 dark:text-slate-300">{title}</h3>
      <dl aria-labelledby={id} className="grid grid-cols-1 border-t border-slate-200 text-[0.875rem] dark:border-slate-800 sm:grid-cols-2 sm:gap-x-8">
        {fields.map((f) => {
          const v = display(f, renewal[f.key]);
          return (
            <div key={f.key} className={`flex justify-between gap-4 border-b border-slate-100 py-2.5 dark:border-slate-800/70 ${f.wide ? "sm:col-span-2" : ""}`}>
              <dt className="shrink-0 text-slate-500">
                {f.label}
                {manual.has(f.key) && (
                  <span className="ml-1.5 text-[0.6875rem] text-brand-700 dark:text-brand-300" title="Edited by hand. Uploads won't overwrite it.">
                    edited
                  </span>
                )}
              </dt>
              <dd className={`num min-w-0 break-words text-right ${v ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}`}>
                {v && f.type === "email" ? <a className="underline-offset-4 hover:underline" href={`mailto:${v}`}>{v}</a> : v && f.type === "tel" ? <a className="underline-offset-4 hover:underline" href={`tel:${v.replace(/[^\d+]/g, "")}`}>{v}</a> : v || "—"}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );

  if (!editing) {
    return (
      <section aria-labelledby="policy-h" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="policy-h" className="section-title">Policy and client details</h2>
            {canEdit && missing.length > 0 && (
              <p className="mt-1 text-[0.8125rem] text-slate-500">
                {missing.length} {missing.length === 1 ? "detail is" : "details are"} blank. Fill in what the upload didn&apos;t include.
              </p>
            )}
          </div>
          {canEdit && (
            <button onClick={open} className="btn-secondary min-h-[36px] px-3 py-1.5 text-[0.8125rem]">
              Edit details
            </button>
          )}
        </div>
        {saved && <p className="alert-ok" role="status">{saved} Fields you edit here are kept when a new file is uploaded.</p>}
        {view("Client contact", "contact-h", CONTACT_FIELDS)}
        {view("Policy", "policyfields-h", POLICY_FIELDS)}
        {renewal.sourceSalesTeam && (
          <p className="text-[0.8125rem] text-slate-500">Sales team in the uploaded file: {renewal.sourceSalesTeam}</p>
        )}
      </section>
    );
  }

  const input = (f: Field) => {
    const id = `f-${f.key}`;
    return (
      <div key={f.key} className={f.wide ? "sm:col-span-2" : ""}>
        <label htmlFor={id} className="label">
          {f.label}
          {f.required ? " (required)" : ""}
        </label>
        <input
          id={id}
          name={f.key}
          required={f.required}
          className="input"
          type={f.type === "money" ? "number" : f.type === "date" ? "date" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"}
          step={f.type === "money" ? "0.01" : undefined}
          min={f.type === "money" ? "0" : undefined}
          inputMode={f.type === "money" ? "decimal" : undefined}
          autoComplete="off"
          spellCheck={f.type === "email" || f.type === "tel" ? false : undefined}
          value={form[f.key] ?? ""}
          onChange={(e) => set(f.key, e.target.value)}
        />
      </div>
    );
  };

  return (
    <form onSubmit={save} className="card space-y-6 p-5" aria-labelledby="edit-h">
      <div className="flex items-center justify-between">
        <h2 id="edit-h" className="section-title">Edit policy and client details</h2>
        <button type="button" onClick={() => setEditing(false)} className="btn-ghost min-h-[32px] px-3 py-1.5 text-[0.8125rem]">
          Cancel
        </button>
      </div>

      {error && <div className="alert-error" role="alert">{error}</div>}

      <fieldset>
        <legend className="mb-3 text-[0.8125rem] font-medium text-slate-700 dark:text-slate-300">Client contact</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{CONTACT_FIELDS.map(input)}</div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-[0.8125rem] font-medium text-slate-700 dark:text-slate-300">Policy</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="f-company" className="label">Portfolio</label>
            <select id="f-company" className="input" value={form.company} onChange={(e) => set("company", e.target.value)} disabled={!isAdmin}>
              <option value="CACTUS">Cactus</option>
              <option value="BLANKET">Blanket</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-bookType" className="label">Type</label>
            <select id="f-bookType" className="input" value={form.bookType} onChange={(e) => set("bookType", e.target.value)} disabled={!isAdmin}>
              <option value="RENEWALS">Renewals</option>
              <option value="CONTRACT_WORKS">Contract Works</option>
            </select>
          </div>
          {!isAdmin && (
            <p className="-mt-2 text-[0.75rem] text-slate-500 sm:col-span-2">Only a Super Admin can change the portfolio or type.</p>
          )}
          {POLICY_FIELDS.map(input)}
        </div>
      </fieldset>

      <p className="text-[0.8125rem] text-slate-500">Anything you change here is kept when a new renewal file is uploaded.</p>

      <div className="flex gap-2">
        <button type="submit" disabled={loading} aria-busy={loading} className="btn-primary">
          {loading && <Spinner />}
          {loading ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}
