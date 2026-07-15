"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

const emptyForm = {
  clientName: "",
  policyNumber: "",
  company: "CACTUS",
  bookType: "RENEWALS",
  insurer: "",
  classOfRisk: "",
  policyDescription: "",
  classification: "",
  referenceCode: "",
  serviceTeam: "",
  policyTeam: "",
  authRepBroker: "",
  paymentPlan: "",
  policyCategory1: "",
  startDate: "",
  renewalDate: "",
  invoiceTotal: "",
};

export default function AddRenewalForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openModal() {
    setForm(emptyForm);
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/renewals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not create this renewal.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button onClick={openModal} className="btn-primary text-sm">
        + Add renewal
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-slate-900">Add a renewal manually</h2>
                <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-400">
                  Cancel
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Use this when a policy wasn't included in the uploaded file. It's added as
                Unassigned like any other renewal.
              </p>

              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
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
                  <select
                    className="input"
                    value={form.company}
                    onChange={(e) => set("company", e.target.value)}
                  >
                    <option value="CACTUS">Cactus</option>
                    <option value="BLANKET">Blanket</option>
                  </select>
                </div>
                <div>
                  <label className="label">Type *</label>
                  <select
                    className="input"
                    value={form.bookType}
                    onChange={(e) => set("bookType", e.target.value)}
                  >
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
                  <input
                    className="input"
                    value={form.classOfRisk}
                    onChange={(e) => set("classOfRisk", e.target.value)}
                  />
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
                  <input
                    className="input"
                    value={form.serviceTeam}
                    onChange={(e) => set("serviceTeam", e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Policy Team</label>
                  <input
                    className="input"
                    value={form.policyTeam}
                    onChange={(e) => set("policyTeam", e.target.value)}
                  />
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
                  <input
                    className="input"
                    value={form.paymentPlan}
                    onChange={(e) => set("paymentPlan", e.target.value)}
                  />
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
                {loading ? "Creating..." : "Create renewal"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
