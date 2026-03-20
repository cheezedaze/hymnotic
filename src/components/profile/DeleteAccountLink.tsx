"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export function DeleteAccountLink() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");

    try {
      const res = await fetch("/api/user/account", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/" });
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete account");
        setDeleting(false);
      }
    } catch {
      setError("Something went wrong");
      setDeleting(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="text-center space-y-4 py-4">
        <p className="text-sm text-red-400">
          This will permanently delete your account and all your data. This
          action cannot be undone.
        </p>
        <p className="text-xs text-text-muted">
          Type <span className="font-bold text-red-400">DELETE</span> to
          confirm
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type DELETE"
          className="bg-white/5 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-red-500/60 w-48 text-center"
          disabled={deleting}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-center gap-4">
          <button
            onClick={handleDelete}
            disabled={confirmText !== "DELETE" || deleting}
            className="text-sm text-red-400 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? "Deleting..." : "Confirm Delete"}
          </button>
          <button
            onClick={() => {
              setShowConfirm(false);
              setConfirmText("");
              setError("");
            }}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center pb-8">
      <button
        onClick={() => setShowConfirm(true)}
        className="text-sm text-red-400/60 hover:text-red-400 transition-colors"
      >
        Delete account
      </button>
    </div>
  );
}
