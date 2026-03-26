import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  FileText,
  MessageSquareQuote,
  Briefcase,
  ShieldCheck,
  Plus,
} from "lucide-react";

export default async function BuyerDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;

  // Run all KPI queries in parallel
  const [openRfqs, pendingQuotes, activeCases, pendingDocs, recentRfqs] =
    await Promise.all([
      prisma.rfq.count({
        where: {
          buyerOrganizationId: orgId,
          status: { in: ["DRAFT", "SUBMITTED", "IN_REVIEW"] },
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
      prisma.document.count({
        where: {
          tradeCase: { buyerOrganizationId: orgId },
          status: { in: ["REQUIRED", "REJECTED"] },
        },
      }),
      prisma.rfq.findMany({
        where: { buyerOrganizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          commodity: true,
          volume: true,
          unit: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

  const kpis = [
    {
      label: "Open RFQs",
      value: openRfqs,
      icon: FileText,
      color: "text-primary",
    },
    {
      label: "Pending Quotes",
      value: pendingQuotes,
      icon: MessageSquareQuote,
      color: "text-warning",
    },
    {
      label: "Active Cases",
      value: activeCases,
      icon: Briefcase,
      color: "text-success",
    },
    {
      label: "Pending Docs",
      value: pendingDocs,
      icon: ShieldCheck,
      color: "text-danger",
    },
  ];

  function statusToVariant(
    status: string
  ): "pending" | "active" | "approved" | "rejected" {
    switch (status) {
      case "DRAFT":
        return "pending";
      case "SUBMITTED":
      case "IN_REVIEW":
        return "active";
      case "QUOTED":
        return "approved";
      case "CANCELLED":
        return "rejected";
      default:
        return "pending";
    }
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-8">
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Welcome back, {session.user.name || "Buyer"}
          </p>
        </div>
        <Link
          href="/rfqs/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New RFQ
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
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
        ))}
      </div>

      {/* Recent RFQs Table */}
      <Card padding="none">
        <div className="px-6 pt-6 pb-4">
          <CardHeader
            title="Recent RFQs"
            description="Your latest requests for quotation"
            action={
              <Link
                href="/dashboard/rfqs"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                View all
              </Link>
            }
          />
        </div>

        {recentRfqs.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <div className="rounded-full bg-bg-surface-raised p-4">
              <FileText className="h-8 w-8 text-text-muted" />
            </div>
            <p className="mt-4 text-sm font-medium text-text-primary">
              No RFQs yet
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Create your first request for quotation to get started.
            </p>
            <Link
              href="/rfqs/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New RFQ
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-surface-raised">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Commodity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Volume
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {recentRfqs.map((rfq) => (
                  <tr
                    key={rfq.id}
                    className="transition-colors hover:bg-bg-surface-raised/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                      {rfq.commodity}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                      {rfq.volume.toLocaleString()} {rfq.unit}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusPill
                        status={statusToVariant(rfq.status)}
                        label={rfq.status.replace("_", " ")}
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-text-muted">
                      {new Date(rfq.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}
