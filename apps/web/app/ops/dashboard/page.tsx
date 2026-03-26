import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  FileText,
  ShieldCheck,
  Briefcase,
  ArrowRight,
  Inbox,
} from "lucide-react";

export default async function OpsDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [pendingRfqs, docsToReview, activeCases, overdueItems] =
    await Promise.all([
      prisma.rfq.count({
        where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } },
      }),
      prisma.document.count({
        where: { status: { in: ["UPLOADED", "UNDER_REVIEW"] } },
      }),
      prisma.tradeCase.count({
        where: { status: "ACTIVE" },
      }),
      prisma.milestone.count({
        where: { status: "OVERDUE" },
      }),
    ]);

  const kpis = [
    {
      label: "Pending RFQs",
      value: pendingRfqs,
      icon: FileText,
      color: "text-warning",
      href: "/ops/rfqs",
    },
    {
      label: "Docs to Review",
      value: docsToReview,
      icon: ShieldCheck,
      color: "text-primary",
      href: "/ops/documents",
    },
    {
      label: "Active Cases",
      value: activeCases,
      icon: Briefcase,
      color: "text-success",
      href: "/ops/cases",
    },
    {
      label: "Overdue Items",
      value: overdueItems,
      icon: Inbox,
      color: "text-danger",
      href: "/ops/cases",
    },
  ];

  const quickActions = [
    {
      label: "Review RFQ Queue",
      description: "Process submitted buyer requests",
      href: "/ops/rfqs",
      icon: FileText,
    },
    {
      label: "Document Review",
      description: "Verify uploaded trade documents",
      href: "/ops/documents",
      icon: ShieldCheck,
    },
    {
      label: "Manage Cases",
      description: "Track and manage active trade cases",
      href: "/ops/cases",
      icon: Briefcase,
    },
  ];

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">
          Ops Dashboard
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Queue and workflow management
        </p>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href}>
            <Card className="transition-colors hover:border-border-focus">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">
                    {kpi.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-text-primary">
                    {kpi.value}
                  </p>
                </div>
                <div
                  className={`rounded-lg bg-bg-surface-raised p-2.5 ${kpi.color}`}
                >
                  <kpi.icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card padding="none">
        <div className="px-6 pt-6 pb-4">
          <CardHeader
            title="Quick Actions"
            description="Jump to the most common ops workflows"
          />
        </div>

        <div className="divide-y divide-border-default">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-bg-surface-raised/50"
            >
              <div className="rounded-lg bg-bg-surface-raised p-2.5 text-primary">
                <action.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {action.label}
                </p>
                <p className="text-sm text-text-muted">
                  {action.description}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-text-muted" />
            </Link>
          ))}
        </div>
      </Card>
    </main>
  );
}
