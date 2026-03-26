"use client";

interface TopNavProps {
  userName: string;
  userRole: string;
}

export function TopNav({ userName, userRole }: TopNavProps) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-[22px]">
            notifications
          </span>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-400" />
        </button>

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
