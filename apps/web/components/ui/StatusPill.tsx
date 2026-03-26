import { cn } from "@/lib/utils";

type Status = "approved" | "rejected" | "pending" | "active";

interface StatusPillProps {
  status: Status;
  label?: string;
  className?: string;
}

const statusConfig: Record<Status, { bg: string; text: string; defaultLabel: string }> = {
  approved: {
    bg: "bg-status-approved-bg",
    text: "text-status-approved-text",
    defaultLabel: "Approved",
  },
  rejected: {
    bg: "bg-status-rejected-bg",
    text: "text-status-rejected-text",
    defaultLabel: "Rejected",
  },
  pending: {
    bg: "bg-status-pending-bg",
    text: "text-status-pending-text",
    defaultLabel: "Pending",
  },
  active: {
    bg: "bg-status-active-bg",
    text: "text-status-active-text",
    defaultLabel: "Active",
  },
};

export function StatusPill({ status, label, className }: StatusPillProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.bg,
        config.text,
        className
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", config.text, "bg-current")}
        aria-hidden="true"
      />
      {label || config.defaultLabel}
    </span>
  );
}
