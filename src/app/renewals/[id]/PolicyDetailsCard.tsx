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
};

function toDateInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime()) || d.getTime() === 0) return "";
  return d.toISOString().slice(0, 10);
}

export default function PolicyDetailsCard({
  renewal,
  canEdit,
}: {
  renewal: RenewalFull;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    clientName: renewal.clientName,
    policyNumber: renewal.policyNumber,
    company: renewal.company,
    bookType: renewal.bookType,
    insurer: renewal.insurer || "",
    classOfRisk: renewal.classOfRisk || "",
    policyDescription: renewal.policyDescription || "",
    classification: renewal.classification || "",
    referenceCode: renewal.referenceCode || "",
    serviceTeam: renewal.serviceTeam || "",
    policyTeam: renewal.policyTeam || "",
    authRepBroker: renewal.authRepBroker || "",
    paymentPlan: renewal.paymentPlan || "",
    policyCategory1: renewal.policyCategory1 || "",
    startDate: toDateInput(renewal.startDate),
    renewalDate: toDateInput(renewal.renewalDate),
    invoiceTotal: renewal.invoiceTotal != null ? String(renewal.invoiceTotal) : "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
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
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not save changes.");
      return;
    }

    setEditing(false);
    router.refresh();
  }

  const fields: [string, string | null | undefined][] = [
    ["Client", renewal.clientName],
    ["Policy Number", renewal.policyNumber],
    ["Insurer", renewal.insurer],
    ["Class of Risk", renewal.classOfRisk],
    ["Policy Description", renewal.policyDescription],
    ["Classification", renewal.classification],
    ["Reference Code", renewal.referenceCode],
    ["Service Team", renewal.serviceTeam],
    ["Policy Team", renewal.policyTeam],
    ["Auth Rep / Producing Broker", renewal.authRepBroker],
    ["Payment Plan", renewal.paymentPlan],
    ["Policy Category", renewal.policyCategory1],
    ["File's Sales Team (reference only)", renewal.sourceSalesTeam],
  ];

  if (!editing) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-slate-900">Policy details</h2>
          {canEdit && (
            <button onClick={() => setEditing(true)} className="btn-secondary text-xs">
              Edit
            </button>
          )}
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-slate-400">{label}</dt>
              <dd className="text-slate-800">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-slate-900">Edit policy details</h2>
        <button type="button" onClick={() => setEditing(false)} className="text-sm text-slate-400">
          Cancel
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Client *</label>
          <input
            required
            className="input"
            value={form.clientName}
            onChange={(e) => set("clientName", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Policy Number *</label>
          <input
            required
            className="input"
            value={form.policyNumber}
            onChange={(e) => set("policyNumber", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Portfolio *</label>
          <select className="input" value={form.company} onChange={(e) => set("company", e.target.value)}>
            <option value="CACTUS">Cactus</option>
            <option value="BLANKET">Blanket</option>
          </select>
        </div>
        <div>
          <label className="label">Type *</label>
          <select className="input" value={form.bookType} onChange={(e) => set("bookType", e.target.value)}>
            <option value="RENEWALS">Renewals</option>
            <option value="CONTRACT_WORKS">Contract Works</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Insurer</label>
          <input className="input" value={form.insurer} onChange={(e) => set("insurer", e.target.value)} />
        </div>
        <div>
          <label className="label">Class of Risk</label>
          <input className="input" value={form.classOfRisk} onChange={(e) => set("classOfRisk", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Policy Description</label>
        <input
          className="input"
          value={form.policyDescription}
          onChange={(e) => set("policyDescription", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Classification</label>
          <input
            className="input"
            value={form.classification}
            onChange={(e) => set("classification", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Reference Code</label>
          <input
            className="input"
            value={form.referenceCode}
            onChange={(e) => set("referenceCode", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Service Team</label>
          <input className="input" value={form.serviceTeam} onChange={(e) => set("serviceTeam", e.target.value)} />
        </div>
        <div>
          <label className="label">Policy Team</label>
          <input className="input" value={form.policyTeam} onChange={(e) => set("policyTeam", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Auth Rep / Producing Broker</label>
          <input
            className="input"
            value={form.authRepBroker}
            onChange={(e) => set("authRepBroker", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Payment Plan</label>
          <input className="input" value={form.paymentPlan} onChange={(e) => set("paymentPlan", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Start Date</label>
          <input
            type="date"
            className="input"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Renewal Date</label>
          <input
            type="date"
            className="input"
            value={form.renewalDate}
            onChange={(e) => set("renewalDate", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Invoice Total</label>
          <input
            type="number"
            step="0.01"
            className="input"
            value={form.invoiceTotal}
            onChange={(e) => set("invoiceTotal", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Policy Category</label>
          <input
            className="input"
            value={form.policyCategory1}
            onChange={(e) => set("policyCategory1", e.target.value)}
          />
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading && <Spinner className="mr-2" />}
        {loading ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
