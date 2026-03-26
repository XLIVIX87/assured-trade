"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  MessageSquareQuote,
  Briefcase,
  ShieldCheck,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

type Role = "buyer" | "supplier" | "ops";

const navByRole: Record<Role, NavItem[]> = {
  buyer: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "RFQs", href: "/dashboard/rfqs", icon: FileText },
    { label: "Quotes", href: "/dashboard/quotes", icon: MessageSquareQuote },
    { label: "Trade Cases", href: "/dashboard/cases", icon: Briefcase },
  ],
  supplier: [
    { label: "Dashboard", href: "/supplier/dashboard", icon: LayoutDashboard },
    { label: "Trade Cases", href: "/supplier/cases", icon: Briefcase },
  ],
  ops: [
    { label: "Dashboard", href: "/ops/dashboard", icon: LayoutDashboard },
    { label: "RFQ Queue", href: "/ops/rfqs", icon: FileText },
    { label: "Verification", href: "/ops/verification", icon: ShieldCheck },
    { label: "All Cases", href: "/ops/cases", icon: Briefcase },
    { label: "Admin", href: "/ops/admin", icon: Users },
  ],
};

interface SidebarProps {
  role: Role;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const items = navByRole[role];

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface-1">
      {/* Logo */}
      <div className="flex h-16 items-center px-5 border-b border-border">
        <Logo />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                item.href !== "/supplier/dashboard" &&
                item.href !== "/ops/dashboard" &&
                pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-3 py-3">
        <Link
          href="#"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-primary"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
