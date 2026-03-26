"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function QuoteAcceptClient({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleAccept() {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/accept`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? "Failed to accept quote");
        setAccepting(false);
        return;
      }
      // Redirect to the new trade case
      router.push(`/cases/${json.data.tradeCase.id}`);
    } catch {
      setError("Network error. Please try again.");
      setAccepting(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-6">
        <p className="mb-4 text-sm text-on-surface">
          Are you sure you want to accept this quote? This will create a trade
          case and begin the execution process.
        </p>
        {error && (
          <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {accepting ? "Accepting..." : "Confirm Accept"}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={accepting}
            className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-500 hover:to-blue-400"
      >
        Accept Quote
      </button>
    </div>
  );
}
