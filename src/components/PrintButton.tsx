"use client";

import { PrinterIcon } from "./icons";

export default function PrintButton({ label = "Print", title }: { label?: string; title?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-secondary no-print" title={title}>
      <PrinterIcon size={16} />
      {label}
    </button>
  );
}
