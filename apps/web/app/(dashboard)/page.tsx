import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function statusPill(status: string) {
  const map: Record<string, { className: string; label: string }> = {
    SUBMITTED: {
      className: "bg-primary-container/10 text-primary",
      label: "Submitted",
    },
    IN_REVIEW: {
      className: "bg-secondary-container/10 text-secondary",
      label: "In Review",
    },
    QUOTED: {
      className: "bg-primary-container/10 text-primary",
      label: "Quoted",
    },
    DRAFT: {
      className: "bg-surface-variant/30 text-outline",
      label: "Draft",
    },
  };
  const entry = map[status] ?? {
    className: "bg-surface-variant/30 text-outline",
    label: status.replace("_", " "),
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${entry.className}`}
    >
      {entry.label}
    </span>
  );
}

export default async function BuyerDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { orgId?: string; role?: string })?.orgId;

  // KPI counts
  const [openRfqs, pendingQuotes, activeCases] = await Promise.all([
    prisma.rfq.count({
      where: {
        buyerOrganizationId: orgId,
        status: { in: ["SUBMITTED", "IN_REVIEW"] },
      },
    }),
    prisma.quote.count({
      where: {
        rfq: { buyerOrganizationId: orgId },
        status: "SENT",
      },
    }),
    prisma.tradeCase.count({
      where: {
        buyerOrganizationId: orgId,
        status: "ACTIVE",
      },
    }),
  ]);

  // Recent RFQs
  const rfqs = await prisma.rfq.findMany({
    where: { buyerOrganizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Active cases with milestones
  const cases = await prisma.tradeCase.findMany({
    where: { buyerOrganizationId: orgId, status: "ACTIVE" },
    include: { milestones: { orderBy: { sequence: "asc" } } },
    take: 3,
  });

  const kpis = [
    {
      label: "Open RFQs",
      value: openRfqs,
      icon: "request_quote",
      accent: "border-blue-400",
      trend: "+3 this week",
    },
    {
      label: "Pending Quotes",
      value: pendingQuotes,
      icon: "receipt_long",
      accent: "border-primary",
      trend: "Awaiting response",
    },
    {
      label: "Active Cases",
      value: activeCases,
      icon: "handshake",
      accent: "border-tertiary",
      trend: "In progress",
    },
  ];

  return (
    <main className="flex-1 overflow-y-auto p-8">
      {/* Page Header */}
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="font-headline text-4xl font-extrabold text-on-surface">
            Buyer Dashboard
          </h1>
          <p className="mt-1 font-body text-sm text-on-surface-variant">
            Overview of your trading activity and open requests
          </p>
        </div>
        <Link
          href="/rfqs/new"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-400 hover:to-blue-500 hover:shadow-blue-500/40"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create New RFQ
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`relative rounded-xl border-l-4 ${kpi.accent} bg-surface-container-low p-6`}
          >
            <div className="absolute right-5 top-5">
              <span className="material-symbols-outlined text-[28px] text-outline">
                {kpi.icon}
              </span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
              {kpi.label}
            </p>
            <p className="mt-2 font-headline text-4xl font-extrabold text-on-surface">
              {kpi.value}
            </p>
            <div className="mt-3">
              <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-on-surface-variant">
                {kpi.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: RFQs table + Trade Cases */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left 8 cols: Recent RFQs Table */}
        <div className="col-span-12 lg:col-span-8">
          <div className="rounded-xl bg-surface-container-low">
            <div className="flex items-center justify-between px-6 py-5">
              <h2 className="font-headline text-lg font-bold text-on-surface">
                Recent RFQs
              </h2>
              <Link
                href="/rfqs"
                className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                View all
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-white/5">
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-outline">
                      Commodity
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-outline">
                      Volume
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-outline">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-outline">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rfqs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-sm text-on-surface-variant"
                      >
                        No RFQs yet. Create your first request to get started.
                      </td>
                    </tr>
                  ) : (
                    rfqs.map((rfq) => (
                      <tr
                        key={rfq.id}
                        className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-on-surface">
                          {rfq.commodity}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-on-surface-variant">
                          {rfq.volume?.toLocaleString()} {rfq.unit}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {statusPill(rfq.status)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-outline">
                          {new Date(rfq.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 4 cols: Active Trade Cases */}
        <div className="col-span-12 lg:col-span-4">
          <div className="rounded-xl bg-surface-container-low p-6">
            <h2 className="mb-5 font-headline text-lg font-bold text-on-surface">
              Active Trade Cases
            </h2>

            {cases.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                No active trade cases.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {cases.map((tc) => {
                  const total = tc.milestones?.length || 0;
                  const completed =
                    tc.milestones?.filter(
                      (m) => m.status === "DONE"
                    ).length || 0;
                  const progress = total > 0 ? (completed / total) * 100 : 0;
                  const nextMilestone = tc.milestones?.find(
                    (m) => m.status === "NOT_STARTED" || m.status === "IN_PROGRESS"
                  );

                  return (
                    <div
                      key={tc.id}
                      className="rounded-lg border border-white/5 bg-surface-container p-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-on-surface">
                          {tc.referenceCode || tc.id.slice(0, 8)}
                        </p>
                        <span className="material-symbols-outlined text-[18px] text-outline">
                          open_in_new
                        </span>
                      </div>
                      {nextMilestone && (
                        <p className="mt-1.5 text-xs text-on-surface-variant">
                          Next:{" "}
                          <span className="font-medium text-primary">
                            {nextMilestone.name}
                          </span>
                        </p>
                      )}
                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] text-outline">
                          <span>Progress</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
