import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { UploadButton } from "./UploadButton";

type MilestoneStatus = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "OVERDUE";
type DocumentStatus = "REQUIRED" | "UPLOADED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

function MilestoneIcon({ status }: { status: MilestoneStatus }) {
  switch (status) {
    case "DONE":
      return (
        <span className="material-symbols-outlined text-green-400 text-xl">
          check_circle
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className="material-symbols-outlined text-blue-400 text-xl animate-pulse">
          radio_button_checked
        </span>
      );
    case "BLOCKED":
      return (
        <span className="material-symbols-outlined text-error text-xl">
          cancel
        </span>
      );
    case "OVERDUE":
      return (
        <span className="material-symbols-outlined text-amber-400 text-xl">
          warning
        </span>
      );
    default:
      return (
        <span className="material-symbols-outlined text-outline text-xl">
          radio_button_unchecked
        </span>
      );
  }
}

function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  switch (status) {
    case "APPROVED":
      return (
        <span className="inline-flex items-center gap-1.5 text-green-400 text-sm font-medium">
          <span className="material-symbols-outlined text-base">verified</span>
          Validated
        </span>
      );
    case "UNDER_REVIEW":
      return (
        <span className="inline-flex items-center gap-1.5 text-amber-400 text-sm font-medium">
          <span className="material-symbols-outlined text-base">schedule</span>
          Under Review
        </span>
      );
    case "UPLOADED":
      return (
        <span className="inline-flex items-center gap-1.5 text-blue-400 text-sm font-medium">
          <span className="material-symbols-outlined text-base">cloud_done</span>
          Uploaded — Awaiting Review
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1.5 text-error text-sm font-medium">
          <span className="material-symbols-outlined text-base">cancel</span>
          Rejected — Re-upload Required
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-outline text-sm font-medium">
          <span className="material-symbols-outlined text-base">upload_file</span>
          Upload Required
        </span>
      );
  }
}

function DocTypeBadge({ docType }: { docType: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-primary-container px-2 py-0.5 text-xs font-medium text-primary">
      {docType.replace(/_/g, " ")}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    OPEN: "bg-blue-500/20 text-blue-400",
    IN_PROGRESS: "bg-amber-500/20 text-amber-400",
    COMPLETED: "bg-green-500/20 text-green-400",
    CLOSED: "bg-surface-container-high text-outline",
    CANCELLED: "bg-red-500/20 text-error",
  };
  const colors = colorMap[status] ?? "bg-surface-container-high text-outline";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colors}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default async function SupplierCaseDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { orgId?: string }).orgId;

  const tradeCase = await prisma.tradeCase.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { sequence: "asc" } },
      documents: { orderBy: { createdAt: "desc" } },
      lotAllocations: { select: { supplierOrganizationId: true } },
    },
  });

  if (!tradeCase) notFound();
  // Supplier access: check via lot allocations
  const supplierOrgIds = tradeCase.lotAllocations.map((la) => la.supplierOrganizationId);
  if (!orgId || !supplierOrgIds.includes(orgId)) redirect("/supplier/dashboard");

  const milestones = tradeCase.milestones;

  const documents = tradeCase.documents;

  const doneMilestones = milestones.filter((m) => m.status === "DONE").length;
  const totalMilestones = milestones.length;
  const progressPercent = totalMilestones > 0 ? Math.round((doneMilestones / totalMilestones) * 100) : 0;

  return (
    <main className="min-h-screen bg-surface-dim p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/supplier/dashboard"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-4"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Dashboard
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-extrabold font-headline text-on-surface">
            Case: {tradeCase.referenceCode}
          </h1>

          <div className="flex items-center gap-3">
            <StatusBadge status={tradeCase.status} />
            <span className="text-sm text-on-surface-variant">
              {doneMilestones} of {totalMilestones} milestones done
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column — Case Progress */}
        <div className="col-span-12 lg:col-span-4">
          <div className="rounded-2xl bg-surface-container-low p-6">
            <h2 className="text-lg font-semibold font-headline text-on-surface mb-4">
              Case Progress
            </h2>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-on-surface-variant">Completion</span>
                <span className="font-medium text-on-surface">{progressPercent}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-surface-container-high">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Milestone Checklist */}
            {milestones.length === 0 ? (
              <p className="text-sm text-outline">No milestones defined yet.</p>
            ) : (
              <ul className="space-y-3">
                {milestones.map((milestone) => (
                  <li key={milestone.id} className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      <MilestoneIcon status={milestone.status} />
                    </div>
                    <span
                      className={`text-sm leading-relaxed ${
                        milestone.status === "DONE"
                          ? "line-through text-outline"
                          : milestone.status === "IN_PROGRESS"
                            ? "font-bold text-on-surface"
                            : milestone.status === "BLOCKED"
                              ? "text-error"
                              : milestone.status === "OVERDUE"
                                ? "text-amber-400"
                                : "text-outline"
                      }`}
                    >
                      {milestone.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column — Document Tasks */}
        <div className="col-span-12 lg:col-span-8">
          <div className="rounded-2xl bg-surface-container-low p-6">
            <h2 className="text-lg font-semibold font-headline text-on-surface mb-4">
              Required Documents
            </h2>

            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-outline mb-3">
                  description
                </span>
                <p className="text-sm text-outline">No documents required for this case yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-xl bg-surface-container p-4"
                  >
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-on-surface truncate">
                          {doc.originalName ?? doc.documentType.replace(/_/g, " ")}
                        </span>
                        <DocTypeBadge docType={doc.documentType} />
                      </div>
                      <DocumentStatusBadge status={doc.status} />
                    </div>

                    {(doc.status === "REQUIRED" || doc.status === "REJECTED") && (
                      <UploadButton docId={doc.id} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
