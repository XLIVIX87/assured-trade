import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function OpsDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [newRfqs, draftQuotes, docsToReview, casesAtRisk] = await Promise.all([
    prisma.rfq.count({ where: { status: "SUBMITTED" } }),
    prisma.quote.count({ where: { status: "DRAFT" } }),
    prisma.document.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.tradeCase.count({
      where: {
        status: "ACTIVE",
        milestones: { some: { status: { in: ["BLOCKED", "OVERDUE"] } } },
      },
    }),
  ]);

  const recentRfqs = await prisma.rfq.findMany({
    where: { status: "SUBMITTED" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, commodity: true, createdAt: true, status: true },
  });

  const recentQuotes = await prisma.quote.findMany({
    where: { status: "DRAFT" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, rfqId: true, createdAt: true, status: true },
  });

  const recentDocs = await prisma.document.findMany({
    where: { status: "UNDER_REVIEW" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      originalName: true,
      documentType: true,
      createdAt: true,
      status: true,
      tradeCaseId: true,
    },
  });

  // Combine and sort worklist items
  const worklistItems = [
    ...recentRfqs.map((rfq) => ({
      type: "RFQ" as const,
      reference: rfq.commodity,
      date: rfq.createdAt,
      status: rfq.status,
      href: `/ops/rfqs/${rfq.id}`,
    })),
    ...recentQuotes.map((quote) => ({
      type: "Quote" as const,
      reference: `Quote for RFQ #${quote.rfqId.slice(0, 8)}`,
      date: quote.createdAt,
      status: quote.status,
      href: `/ops/quotes/${quote.id}`,
    })),
    ...recentDocs.map((doc) => ({
      type: "Doc" as const,
      reference: doc.originalName ?? doc.documentType.replace(/_/g, " "),
      date: doc.createdAt,
      status: doc.status,
      href: `/ops/cases/${doc.tradeCaseId}/documents`,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  const kpis = [
    {
      label: "New RFQs",
      value: newRfqs,
      icon: "request_quote",
      borderColor: "border-l-blue-400",
    },
    {
      label: "Quotes to Send",
      value: draftQuotes,
      icon: "send",
      borderColor: "border-l-primary",
    },
    {
      label: "Docs to Review",
      value: docsToReview,
      icon: "task",
      borderColor: "border-l-tertiary",
    },
    {
      label: "Cases At Risk",
      value: casesAtRisk,
      icon: "warning",
      borderColor: "border-l-error",
    },
  ];

  function statusPill(status: string) {
    switch (status) {
      case "SUBMITTED":
        return "bg-blue-500/10 text-blue-400";
      case "DRAFT":
        return "bg-slate-500/10 text-slate-400";
      case "UNDER_REVIEW":
        return "bg-amber-500/10 text-amber-400";
      default:
        return "bg-slate-500/10 text-slate-400";
    }
  }

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  return (
    <main className="flex-1 overflow-y-auto bg-surface-dim p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold font-headline text-on-surface">
          Operations Centre
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Case management and compliance oversight
        </p>
      </div>

      {/* KPI Bento Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-xl bg-surface-container-low p-5 border-l-4 ${kpi.borderColor}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-on-surface-variant font-body">
                  {kpi.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-on-surface font-headline">
                  {kpi.value}
                </p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-2xl">
                {kpi.icon}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main content grid: Worklist + Sidebar */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Pending Worklist */}
        <div className="xl:col-span-8">
          <div className="rounded-xl bg-surface-container-low">
            <div className="flex items-center justify-between border-b border-outline/10 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary">
                  pending_actions
                </span>
                <h2 className="text-lg font-semibold font-headline text-on-surface">
                  Pending Worklist
                </h2>
              </div>
              <span className="text-xs text-on-surface-variant font-body">
                {worklistItems.length} items
              </span>
            </div>

            {worklistItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-2">
                  check_circle
                </span>
                <p className="text-sm font-body">All caught up. No pending items.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-outline/10 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                      <th className="px-6 py-3 font-body">Type</th>
                      <th className="px-6 py-3 font-body">Reference</th>
                      <th className="px-6 py-3 font-body">Submitted</th>
                      <th className="px-6 py-3 font-body">Status</th>
                      <th className="px-6 py-3 font-body">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline/5">
                    {worklistItems.map((item, idx) => (
                      <tr
                        key={`${item.type}-${idx}`}
                        className="transition-colors hover:bg-surface-container/50"
                      >
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant font-body">
                            <span className="material-symbols-outlined text-sm">
                              {item.type === "RFQ"
                                ? "request_quote"
                                : item.type === "Quote"
                                  ? "send"
                                  : "description"}
                            </span>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-on-surface font-body max-w-[200px] truncate">
                          {item.reference}
                        </td>
                        <td className="px-6 py-3 text-xs text-on-surface-variant font-body">
                          {formatDate(item.date)}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusPill(item.status)}`}
                          >
                            {item.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <Link
                            href={item.href}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            Review
                            <span className="material-symbols-outlined text-sm">
                              arrow_forward
                            </span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* Operational Insights */}
          <div className="rounded-xl bg-surface-container-low p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-sm text-primary">
                insights
              </span>
              <h3 className="text-sm font-semibold font-headline text-on-surface">
                Operational Insights
              </h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant font-body">
                  Avg. Turnaround
                </span>
                <span className="text-sm font-semibold text-on-surface font-headline">
                  2.3 days
                </span>
              </div>
              <div className="h-px bg-outline/10" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant font-body">
                  Compliance Rate
                </span>
                <span className="text-sm font-semibold text-primary font-headline">
                  98.5%
                </span>
              </div>
            </div>
          </div>

          {/* Your Tasks */}
          <div className="rounded-xl bg-surface-container-low p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-sm text-tertiary">
                task_alt
              </span>
              <h3 className="text-sm font-semibold font-headline text-on-surface">
                Your Tasks
              </h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-sm text-on-surface-variant mt-0.5">
                  radio_button_unchecked
                </span>
                <div>
                  <p className="text-xs font-medium text-on-surface font-body">
                    Review cocoa shipment documents
                  </p>
                  <p className="text-xs text-on-surface-variant font-body">
                    Due today
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-sm text-on-surface-variant mt-0.5">
                  radio_button_unchecked
                </span>
                <div>
                  <p className="text-xs font-medium text-on-surface font-body">
                    Send quote for cashew RFQ
                  </p>
                  <p className="text-xs text-on-surface-variant font-body">
                    Due tomorrow
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-sm text-on-surface-variant mt-0.5">
                  radio_button_unchecked
                </span>
                <div>
                  <p className="text-xs font-medium text-on-surface font-body">
                    Approve shea butter compliance cert
                  </p>
                  <p className="text-xs text-on-surface-variant font-body">
                    Due in 2 days
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
