"use client";

import { useEffect } from "react";

export default function Toast({
  message,
  kind = "success",
  onClose,
}: {
  message: string;
  kind?: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles =
    kind === "success"
      ? "bg-green-600 border-green-700"
      : "bg-red-600 border-red-700";

  return (
    <div className="fixed top-4 right-4 z-50 toast-enter">
      <div className={`${styles} text-white rounded-lg shadow-lg border px-4 py-3 max-w-sm flex items-start gap-3`}>
        <span className="text-lg leading-none">{kind === "success" ? "✓" : "✕"}</span>
        <p className="text-sm flex-1">{message}</p>
        <button onClick={onClose} className="text-white/80 hover:text-white text-sm leading-none">
          ✕
        </button>
      </div>
    </div>
  );
}
