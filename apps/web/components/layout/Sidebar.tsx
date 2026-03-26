"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

type Role = "buyer" | "supplier" | "ops";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navByRole: Record<Role, NavItem[]> = {
  buyer: [
    { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
    { label: "RFQs", href: "/rfqs", icon: "request_quote" },
    { label: "Quotes", href: "/quotes", icon: "receipt_long" },
    { label: "Trade Cases", href: "/cases", icon: "handshake" },
    { label: "Documents", href: "/documents", icon: "description" },
  ],
  ops: [
    { label: "Dashboard", href: "/ops/dashboard", icon: "dashboard" },
    { label: "RFQs", href: "/ops/rfqs", icon: "request_quote" },
    { label: "Quotes", href: "/ops/quotes", icon: "receipt_long" },
    { label: "Trade Cases", href: "/ops/cases", icon: "handshake" },
    { label: "Documents", href: "/ops/documents", icon: "description" },
    { label: "Ops Queue", href: "/ops/queue", icon: "rule_folder" },
  ],
  supplier: [
    { label: "Dashboard", href: "/supplier/dashboard", icon: "dashboard" },
    { label: "Trade Cases", href: "/supplier/cases", icon: "handshake" },
    { label: "Documents", href: "/supplier/documents", icon: "description" },
  ],
};

interface SidebarProps {
  role: Role;
  activePath: string;
}

export function Sidebar({ role, activePath }: SidebarProps) {
  const items = navByRole[role];

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-surface-container-lowest">
      {/* Header */}
      <div className="px-6 py-6">
        <h1 className="text-lg font-bold text-white">Assured Trade</h1>
        <p className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-500">
          Deal Desk v1.0
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const isActive = activePath === item.href;

            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 font-headline text-[12px] uppercase tracking-widest transition-colors ${
                    isActive
                      ? "border-r-2 border-blue-400 bg-white/5 text-blue-400"
                      : "text-slate-500 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 px-3 py-3">
        <Link
          href="/support"
          className="flex items-center gap-3 rounded-md px-3 py-2.5 font-headline text-[12px] uppercase tracking-widest text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          <span className="material-symbols-outlined text-[20px]">
            help_outline
          </span>
          Support
        </Link>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 font-headline text-[12px] uppercase tracking-widest text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
