import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  Briefcase,
  ShieldCheck,
  Upload,
  ArrowRight,
} from "lucide-react";

export default async function SupplierDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;

  const [assignedCases, pendingUploads] = await Promise.all([
    prisma.tradeCase.count({
      where: {
        status: "ACTIVE",
        lotAllocations: {
          some: { supplierOrganizationId: orgId },
        },
      },
    }),
    prisma.document.count({
      where: {
        status: { in: ["REQUIRED", "REJECTED"] },
        tradeCase: {
          lotAllocations: {
            some: { supplierOrganizationId: orgId },
          },
        },
      },
    }),
  ]);

  const kpis = [
    {
      label: "Assigned Cases",
      value: assignedCases,
      icon: Briefcase,
      color: "text-success",
    },
    {
      label: "Pending Uploads",
      value: pendingUploads,
      icon: ShieldCheck,
      color: "text-warning",
    },
  ];

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">
          Supplier Dashboard
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Your assigned cases and required documents
        </p>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      {/* Quick Actions */}
      <Card padding="none">
        <div className="px-6 pt-6 pb-4">
          <CardHeader
            title="Quick Actions"
            description="Manage your trade documents and cases"
          />
        </div>

        <div className="divide-y divide-border-default">
          <Link
            href="/supplier/cases"
            className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-bg-surface-raised/50"
          >
            <div className="rounded-lg bg-bg-surface-raised p-2.5 text-success">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                View Trade Cases
              </p>
              <p className="text-sm text-text-muted">
                See all cases where your lots are allocated
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-text-muted" />
          </Link>

          <Link
            href="/supplier/cases"
            className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-bg-surface-raised/50"
          >
            <div className="rounded-lg bg-bg-surface-raised p-2.5 text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                Upload Documents
              </p>
              <p className="text-sm text-text-muted">
                Upload required certificates and trade documents
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-text-muted" />
          </Link>
        </div>
      </Card>

      {/* Empty state when no cases */}
      {assignedCases === 0 && (
        <Card className="mt-6">
          <div className="flex flex-col items-center justify-center py-10">
            <div className="rounded-full bg-bg-surface-raised p-4">
              <Briefcase className="h-8 w-8 text-text-muted" />
            </div>
            <p className="mt-4 text-sm font-medium text-text-primary">
              No assigned cases
            </p>
            <p className="mt-1 text-center text-sm text-text-secondary">
              You will see your trade cases here once lots are allocated to your
              organization.
            </p>
          </div>
        </Card>
      )}
    </main>
  );
}
