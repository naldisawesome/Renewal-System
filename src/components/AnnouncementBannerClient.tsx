"use client";

import { useEffect, useState } from "react";
import { CloseIcon, AlertIcon } from "./icons";

const TONES = {
  info: "border-[#c9d8ee] bg-[#eef3fa] text-[#2f4a73] dark:border-[#2a3a55] dark:bg-[#18202e] dark:text-[#b9cdea]",
  warning: "border-[#ecd9a8] bg-[#fbf5e4] text-[#6b4f0c] dark:border-[#4a3d1a] dark:bg-[#241f12] dark:text-[#e8cf8a]",
};

/** A notice from the managers. Each person can dismiss it on their own screen; a new announcement shows again. */
export default function AnnouncementBannerClient({ id, message, tone }: { id: string; message: string; tone: "info" | "warning" }) {
  const key = `announcement-dismissed:${id}`;
  // Hidden until we've checked storage, so a dismissed notice doesn't flash on every page load.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(key) !== "1");
    } catch {
      setVisible(true);
    }
  }, [key]);

  if (!visible) return null;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pt-3 sm:px-6">
      <div role="status" className={`rs-enter flex items-start gap-3 rounded-xl border px-4 py-3 text-[0.875rem] ${TONES[tone]}`}>
        <AlertIcon size={18} className="mt-0.5 shrink-0" />
        <p className="min-w-0 flex-1 whitespace-pre-wrap">{message}</p>
        <button
          type="button"
          aria-label="Dismiss announcement"
          onClick={() => {
            try {
              localStorage.setItem(key, "1");
            } catch {
              // Private windows can block storage; it simply hides until the next page load.
            }
            setVisible(false);
          }}
          className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-70 hover:opacity-100"
        >
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  );
}
