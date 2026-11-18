"use client";

import { useState } from "react";
import Spinner from "@/components/Spinner";

export default function AgentTestButton({ disabled }: { disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function send() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/ai-agent/test", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      setMsg(res.ok ? { ok: true, text: "Test sent. The agent answered." } : { ok: false, text: d.error || "The test didn't go through." });
    } catch {
      setMsg({ ok: false, text: "Couldn't reach the server. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button type="button" className="btn-secondary" onClick={send} disabled={disabled || busy} aria-busy={busy} title={disabled ? "Set up the agent's address first" : undefined}>
        {busy && <Spinner />}
        Send a test
      </button>
      {msg && (
        <span role="status" className={`text-[0.8125rem] ${msg.ok ? "text-brand-700 dark:text-brand-300" : "text-[color:var(--late)]"}`}>
          {msg.text}
        </span>
      )}
    </>
  );
}
