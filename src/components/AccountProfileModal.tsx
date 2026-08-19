"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Spinner from "./Spinner";

const MAX_SOURCE_FILE_BYTES = 8 * 1024 * 1024; // 8MB - the actual upload is resized/compressed client-side first
const AVATAR_DIMENSION = 256; // px, square

function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That doesn't look like a valid image."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_DIMENSION;
        canvas.height = AVATAR_DIMENSION;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not process that image."));
          return;
        }
        // Center-crop to a square before scaling down, so portraits/landscapes
        // don't come out stretched.
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_DIMENSION, AVATAR_DIMENSION);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function AccountProfileModal({
  name,
  email,
  roleLabel,
  onClose,
}: {
  name: string;
  email: string;
  roleLabel: string;
  onClose: () => void;
}) {
  const { data: session, update } = useSession();
  const avatarUrl = session?.user?.avatarUrl ?? null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    setAvatarError(null);

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_SOURCE_FILE_BYTES) {
      setAvatarError("That image is too large (max 8MB).");
      return;
    }

    setAvatarLoading(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      const res = await fetch("/api/account/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAvatarError(data.error || "Could not upload that photo.");
        return;
      }
      await update({ avatarUrl: dataUrl });
    } catch (err: any) {
      setAvatarError(err?.message || "Could not upload that photo.");
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleRemovePhoto() {
    setAvatarError(null);
    setAvatarLoading(true);
    try {
      const res = await fetch("/api/account/avatar", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAvatarError(data.error || "Could not remove your photo.");
        return;
      }
      await update({ avatarUrl: null });
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/account/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not change your password.");
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  const initial = name?.trim()?.[0]?.toUpperCase() || "?";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative card w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-slate-900 dark:text-slate-100">Account Profile</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <span className="w-12 h-12 rounded-full bg-brand-600 text-white text-lg font-semibold flex items-center justify-center">
                {initial}
              </span>
            )}
            {avatarLoading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Spinner className="text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{name}</p>
            <p className="text-sm text-slate-500 truncate">{email}</p>
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50"
              >
                {avatarUrl ? "Change photo" : "Upload photo"}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={avatarLoading}
                  className="text-xs font-medium text-slate-400 hover:text-red-600 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
        </div>
        {avatarError && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {avatarError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-slate-50 dark:bg-slate-800 px-3 py-2">
            <p className="text-xs text-slate-400 mb-0.5">Role</p>
            <p className="text-slate-800 dark:text-slate-200 font-medium">{roleLabel}</p>
          </div>
          <div className="rounded-md bg-slate-50 dark:bg-slate-800 px-3 py-2">
            <p className="text-xs text-slate-400 mb-0.5">Email</p>
            <p className="text-slate-800 dark:text-slate-200 font-medium truncate">{email}</p>
          </div>
        </div>

        {!showChangePassword ? (
          <button onClick={() => setShowChangePassword(true)} className="btn-secondary w-full text-sm">
            Change password
          </button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                Password updated.
              </div>
            )}

            <div>
              <label className="label">Current password</label>
              <input
                type="password"
                required
                className="input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="label">New password</label>
              <input
                type="password"
                required
                minLength={8}
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input
                type="password"
                required
                minLength={8}
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="btn-primary text-sm flex-1">
                {loading && <Spinner className="mr-1.5" />}
                {loading ? "Saving..." : "Save new password"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowChangePassword(false);
                  setError(null);
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
