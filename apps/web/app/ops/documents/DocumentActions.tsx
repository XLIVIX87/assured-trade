"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DocumentActions({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message ?? "Failed to approve");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) {
      setError("Rejection reason is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message ?? "Failed to reject");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  if (showReject) {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection (required)"
          rows={2}
          className="rounded-lg border border-white/10 bg-surface-container-high px-3 py-2 text-sm text-on-surface placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-red-500/50"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleReject}
            disabled={loading}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
          >
            {loading ? "Rejecting..." : "Confirm Reject"}
          </button>
          <button
            onClick={() => {
              setShowReject(false);
              setError(null);
            }}
            disabled={loading}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? "..." : "Approve"}
        </button>
        <button
          onClick={() => setShowReject(true)}
          disabled={loading}
          className="rounded-lg border border-red-500/30 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
