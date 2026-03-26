import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { DocumentActions } from "./DocumentActions";

export default async function OpsDocumentReview() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { role?: string };
  if (user.role !== "OPS") redirect("/");

  const documents = await prisma.document.findMany({
    where: {
      status: { in: ["UPLOADED", "APPROVED", "REJECTED"] },
      fileKey: { not: null },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      tradeCase: {
        select: { id: true, referenceCode: true, commodity: true },
      },
      uploadedBy: { select: { id: true, name: true, email: true } },
      uploadedByOrganization: { select: { name: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          reviewedBy: { select: { name: true } },
        },
      },
    },
  });

  const pending = documents.filter((d) => d.status === "UPLOADED");
  const reviewed = documents.filter((d) => d.status !== "UPLOADED");

  const statusColors: Record<string, string> = {
    UPLOADED: "bg-amber-500/20 text-amber-400",
    APPROVED: "bg-emerald-500/20 text-emerald-400",
    REJECTED: "bg-red-500/20 text-red-400",
    REQUIRED: "bg-slate-500/20 text-slate-400",
  };

  const docTypeLabels: Record<string, string> = {
    COO: "Certificate of Origin",
    COA: "Certificate of Analysis",
    PHYTO: "Phytosanitary Certificate",
    PACKING_LIST: "Packing List",
    BILL_OF_LADING: "Bill of Lading",
    FUMIGATION_CERT: "Fumigation Certificate",
    WEIGHT_CERT: "Weight Certificate",
    QUALITY_CERT: "Quality Certificate",
    INSURANCE_CERT: "Insurance Certificate",
    COMMERCIAL_INVOICE: "Commercial Invoice",
    OTHER: "Other",
  };

  return (
    <main className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-on-surface">
          Document Review
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Review, approve, or reject uploaded trade documents
        </p>
      </div>

      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/10 bg-surface-container p-4">
          <p className="text-xs text-on-surface-variant">Pending Review</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">
            {pending.length}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-container p-4">
          <p className="text-xs text-on-surface-variant">Approved</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {reviewed.filter((d) => d.status === "APPROVED").length}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-surface-container p-4">
          <p className="text-xs text-on-surface-variant">Rejected</p>
          <p className="mt-1 text-2xl font-bold text-red-400">
            {reviewed.filter((d) => d.status === "REJECTED").length}
          </p>
        </div>
      </div>

      {/* Pending Documents */}
      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-amber-400">
            <span className="material-symbols-outlined mr-2 align-middle text-[20px]">
              pending_actions
            </span>
            Awaiting Review ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((doc) => (
              <div
                key={doc.id}
                className="rounded-xl border border-amber-500/20 bg-surface-container p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[20px] text-amber-400">
                        description
                      </span>
                      <div>
                        <p className="font-medium text-on-surface">
                          {doc.originalName ?? doc.documentType}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {docTypeLabels[doc.documentType] ?? doc.documentType}
                        </p>
                      </div>
                    </div>
                    <div className="ml-8 mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-on-surface-variant">
                      <span>
                        Case:{" "}
                        <Link
                          href={`/ops/cases/${doc.tradeCase.id}`}
                          className="text-blue-400 hover:underline"
                        >
                          {doc.tradeCase.referenceCode}
                        </Link>
                      </span>
                      <span>Commodity: {doc.tradeCase.commodity}</span>
                      {doc.uploadedByOrganization && (
                        <span>
                          Uploaded by: {doc.uploadedByOrganization.name}
                        </span>
                      )}
                      {doc.sizeBytes && (
                        <span>
                          Size: {(doc.sizeBytes / 1024).toFixed(0)} KB
                        </span>
                      )}
                      <span>
                        Uploaded:{" "}
                        {doc.updatedAt.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <DocumentActions documentId={doc.id} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && (
        <div className="mb-8 rounded-xl border border-white/10 bg-surface-container p-12 text-center">
          <span className="material-symbols-outlined mb-3 text-4xl text-emerald-400">
            task_alt
          </span>
          <h3 className="text-base font-semibold text-on-surface">
            All caught up
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            No documents pending review.
          </p>
        </div>
      )}

      {/* Reviewed Documents */}
      {reviewed.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-on-surface">
            Recently Reviewed
          </h2>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-surface-container-high">
                  <th className="px-4 py-3 text-left font-medium text-on-surface-variant">
                    Document
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-on-surface-variant">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-on-surface-variant">
                    Case
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-on-surface-variant">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-on-surface-variant">
                    Reviewed By
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-on-surface-variant">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviewed.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 text-on-surface">
                      {doc.originalName ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {docTypeLabels[doc.documentType] ?? doc.documentType}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/ops/cases/${doc.tradeCase.id}`}
                        className="text-blue-400 hover:underline"
                      >
                        {doc.tradeCase.referenceCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[doc.status]}`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {doc.reviews[0]?.reviewedBy?.name ?? "-"}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-on-surface-variant">
                      {doc.reviews[0]?.reason ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
