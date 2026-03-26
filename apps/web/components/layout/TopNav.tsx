"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface TopNavProps {
  userName: string;
  userRole: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  tradeCase?: { id: string; referenceCode: string } | null;
  rfq?: { id: string; commodity: string } | null;
}

export function TopNav({ userName, userRole }: TopNavProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications?pageSize=10");
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data.notifications ?? []);
        setUnreadCount(json.data.unreadCount ?? 0);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount + poll every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function markAsRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silently fail
    }
  }

  function timeAgo(dateStr: string) {
    const seconds = Math.floor(
      (Date.now() - new Date(dateStr).getTime()) / 1000
    );
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  const typeIcons: Record<string, string> = {
    RFQ_SUBMITTED: "description",
    QUOTE_SENT: "request_quote",
    QUOTE_ACCEPTED: "handshake",
    DOCUMENT_APPROVED: "check_circle",
    DOCUMENT_REJECTED: "cancel",
    CLOSEOUT_READY: "inventory_2",
  };

  return (
    <header className="fixed left-64 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-white/5 bg-slate-950/60 px-6 shadow-[0_24px_48px_rgba(0,3,24,0.5)] backdrop-blur-xl">
      {/* Left: Search */}
      <div className="relative max-w-md flex-1">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-500">
          search
        </span>
        <input
          type="text"
          placeholder="Search deals, RFQs, cases..."
          className="w-full rounded-lg bg-slate-900/50 py-2 pl-10 pr-4 text-sm text-on-surface placeholder:text-slate-500 outline-none transition-colors focus:bg-slate-900/80 focus:ring-1 focus:ring-white/10"
        />
      </div>

      {/* Right: Notification + User */}
      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setOpen(!open);
              if (!open) fetchNotifications();
            }}
            className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-[22px]">
              notifications
            </span>
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-full mt-2 w-96 overflow-hidden rounded-xl border border-white/10 bg-surface-container shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <h3 className="text-sm font-semibold text-on-surface">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {loading && notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-on-surface-variant">
                    Loading...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <span className="material-symbols-outlined mb-2 text-3xl text-slate-500">
                      notifications_off
                    </span>
                    <p className="text-sm text-on-surface-variant">
                      No notifications yet
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (!n.readAt) markAsRead(n.id);
                        if (n.tradeCase) {
                          window.location.href = `/cases/${n.tradeCase.id}`;
                        } else if (n.rfq) {
                          window.location.href = `/rfqs`;
                        }
                        setOpen(false);
                      }}
                      className={`flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] ${
                        !n.readAt ? "bg-blue-500/[0.03]" : ""
                      }`}
                    >
                      <span className="material-symbols-outlined mt-0.5 text-[20px] text-slate-400">
                        {typeIcons[n.type] ?? "notifications"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-on-surface">
                            {n.title}
                          </p>
                          {!n.readAt && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-on-surface-variant">
                          {n.body}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-on-surface">{userName}</p>
            <p className="text-[11px] font-medium text-blue-400">{userRole}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-high text-xs font-bold text-on-surface">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
