import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

/* ---------- Status / Severity colour maps ---------- */

const caseStatusStyle: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-400 border-green-500/20",
  ON_HOLD: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  COMPLETED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
};

const docStatusStyle: Record<string, string> = {
  APPROVED: "bg-green-500/10 text-green-400",
  REJECTED: "bg-red-500/10 text-red-400",
  UNDER_REVIEW: "bg-amber-500/10 text-amber-400",
  UPLOADED: "bg-blue-500/10 text-blue-400",
  REQUIRED: "bg-slate-500/10 text-slate-400",
};

const severityStyle: Record<string, string> = {
  LOW: "bg-slate-500/10 text-slate-400",
  MEDIUM: "bg-amber-500/10 text-amber-400",
  HIGH: "bg-orange-500/10 text-orange-400",
  CRITICAL: "bg-red-500/10 text-red-400",
};

/* ---------- Helpers ---------- */

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function actionIcon(action: string): string {
  if (action.toLowerCase().includes("create")) return "add_circle";
  if (action.toLowerCase().includes("upload")) return "upload_file";
  if (action.toLowerCase().includes("approve")) return "check_circle";
  if (action.toLowerCase().includes("reject")) return "cancel";
  if (action.toLowerCase().includes("update")) return "edit";
  if (action.toLowerCase().includes("comment")) return "comment";
  return "info";
}

/* ---------- Page ---------- */

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id || !session?.user?.orgId) {
    redirect("/login");
  }

  const tradeCase = await prisma.tradeCase.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { sequence: "asc" } },
      documents: { orderBy: { createdAt: "desc" } },
      auditEvents: { orderBy: { createdAt: "desc" }, take: 10 },
      issues: { orderBy: { createdAt: "desc" } },
      rfq: { select: { commodity: true, volume: true, unit: true } },
    },
  });

  if (!tradeCase) notFound();

  if (tradeCase.buyerOrganizationId !== session.user.orgId) {
    redirect("/cases");
  }

  const openIssues = tradeCase.issues.filter(
    (i) => i.status === "OPEN" || i.status === "IN_PROGRESS"
  );

  return (
    <main className="min-h-screen p-6 lg:p-8">
      {/* ---- Header ---- */}
      <div className="mb-8">
        <Link
          href="/cases"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors mb-4"
        >
          <span className="material-symbols-outlined text-[20px]">
            arrow_back
          </span>
          Back to Cases
        </Link>

        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-3xl font-extrabold font-headline text-text-primary">
            {tradeCase.referenceCode}
          </h1>

          <span
            className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold ${caseStatusStyle[tradeCase.status] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}
          >
            {tradeCase.status.replace("_", " ")}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-text-secondary">
          <span>Created {formatDate(tradeCase.createdAt)}</span>
          {tradeCase.rfq && (
            <span className="text-text-tertiary">
              {tradeCase.rfq.commodity} &middot; {tradeCase.rfq.volume}{" "}
              {tradeCase.rfq.unit}
            </span>
          )}
        </div>
      </div>

      {/* ---- 3-Column Grid ---- */}
      <div className="grid grid-cols-12 gap-6">
        {/* ---- Left: Milestone Timeline ---- */}
        <section className="col-span-12 lg:col-span-3">
          <div className="rounded-xl border border-outline-variant bg-surface-container p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">
                timeline
              </span>
              Milestones
            </h2>

            {tradeCase.milestones.length === 0 ? (
              <p className="text-sm text-text-secondary">
                No milestones yet.
              </p>
            ) : (
              <ol className="relative border-l-2 border-outline-variant ml-3">
                {tradeCase.milestones.map((ms) => {
                  let icon: string;
                  let iconColor: string;
                  let dotClasses: string;
                  let nameClasses = "text-sm text-text-primary";

                  switch (ms.status) {
                    case "DONE":
                      icon = "check_circle";
                      iconColor = "text-green-400";
                      dotClasses = "bg-green-400";
                      nameClasses =
                        "text-sm text-text-secondary line-through";
                      break;
                    case "IN_PROGRESS":
                      icon = "radio_button_checked";
                      iconColor = "text-blue-400";
                      dotClasses = "bg-blue-400 animate-pulse";
                      break;
                    case "BLOCKED":
                      icon = "warning";
                      iconColor = "text-red-400";
                      dotClasses = "bg-red-400";
                      break;
                    case "OVERDUE":
                      icon = "schedule";
                      iconColor = "text-amber-400";
                      dotClasses = "bg-amber-400";
                      break;
                    default:
                      icon = "circle";
                      iconColor = "text-text-tertiary";
                      dotClasses =
                        "border-2 border-outline-variant bg-surface-container";
                      break;
                  }

                  return (
                    <li key={ms.id} className="mb-6 ml-6 last:mb-0">
                      <span
                        className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full ${dotClasses}`}
                      />
                      <div className="flex items-start gap-2">
                        <span
                          className={`material-symbols-outlined text-[18px] ${iconColor}`}
                        >
                          {icon}
                        </span>
                        <div>
                          <p className={nameClasses}>{ms.name}</p>
                          {ms.dueDate && (
                            <p className="text-xs text-text-tertiary mt-0.5">
                              Due {formatDate(ms.dueDate)}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>

        {/* ---- Center: Documents ---- */}
        <section className="col-span-12 lg:col-span-5">
          <div className="rounded-xl border border-outline-variant bg-surface-container p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">
                  description
                </span>
                Document Compliance
              </h2>
              <span className="text-xs text-text-secondary rounded-full bg-surface-container-high px-2 py-0.5">
                {tradeCase.documents.length} document
                {tradeCase.documents.length !== 1 ? "s" : ""}
              </span>
            </div>

            {tradeCase.documents.length === 0 ? (
              <p className="text-sm text-text-secondary">
                No documents yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-left text-xs text-text-secondary">
                      <th className="pb-2 pr-3 font-medium">Name</th>
                      <th className="pb-2 pr-3 font-medium">Type</th>
                      <th className="pb-2 pr-3 font-medium">Status</th>
                      <th className="pb-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tradeCase.documents.map((doc) => (
                      <tr
                        key={doc.id}
                        className="border-b border-outline-variant/50 last:border-0"
                      >
                        <td className="py-2.5 pr-3 text-text-primary">
                          {doc.originalName ?? doc.documentType.replace(/_/g, " ")}
                        </td>
                        <td className="py-2.5 pr-3 text-text-secondary">
                          {doc.documentType.replace(/_/g, " ")}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${docStatusStyle[doc.status] ?? "bg-slate-500/10 text-slate-400"}`}
                          >
                            {doc.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-2.5 text-text-secondary text-xs">
                          {formatDate(doc.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ---- Right: Activity + Issues ---- */}
        <section className="col-span-12 lg:col-span-4 space-y-6">
          {/* Activity Feed */}
          <div className="rounded-xl border border-outline-variant bg-surface-container p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">
                history
              </span>
              Recent Activity
            </h2>

            {tradeCase.auditEvents.length === 0 ? (
              <p className="text-sm text-text-secondary">
                No activity yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {tradeCase.auditEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <span className="material-symbols-outlined text-[18px] text-text-tertiary mt-0.5">
                      {actionIcon(event.action)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary truncate">
                        {event.action}
                      </p>
                      {event.afterJson && (
                        <p className="text-xs text-on-surface-variant truncate mt-0.5">
                          {typeof event.afterJson === "string" ? event.afterJson : JSON.stringify(event.afterJson)}
                        </p>
                      )}
                      <p className="text-xs text-outline mt-0.5">
                        {event.actorUserId ?? "System"} &middot;{" "}
                        {relativeTime(event.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Open Issues */}
          <div className="rounded-xl border border-outline-variant bg-surface-container p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">
                  bug_report
                </span>
                Open Issues
              </h2>
              <span className="text-xs text-text-secondary rounded-full bg-surface-container-high px-2 py-0.5">
                {openIssues.length}
              </span>
            </div>

            {openIssues.length === 0 ? (
              <p className="text-sm text-text-secondary">
                No open issues.
              </p>
            ) : (
              <ul className="space-y-3">
                {openIssues.map((issue) => (
                  <li key={issue.id} className="flex items-start gap-3">
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${severityStyle[issue.severity] ?? "bg-slate-500/10 text-slate-400"}`}
                    >
                      {issue.severity}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-on-surface truncate">
                        {issue.type.replace(/_/g, " ")}: {issue.description}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {formatDate(issue.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
