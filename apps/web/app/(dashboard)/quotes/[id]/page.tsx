import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { QuoteAcceptClient } from "./QuoteAcceptClient";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; role?: string; orgId?: string };
  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      rfq: {
        select: {
          id: true,
          commodity: true,
          volume: true,
          unit: true,
          destination: true,
          incoterm: true,
          timeline: true,
          notes: true,
          buyerOrganizationId: true,
          buyerOrganization: { select: { name: true } },
        },
      },
      createdBy: { select: { name: true, email: true } },
      tradeCase: { select: { id: true, referenceCode: true, status: true } },
    },
  });

  if (!quote) {
    return (
      <main className="p-8">
        <div className="rounded-xl border border-white/10 bg-surface-container p-12 text-center">
          <span className="material-symbols-outlined mb-4 text-5xl text-slate-500">
            search_off
          </span>
          <h2 className="text-lg font-semibold text-on-surface">
            Quote Not Found
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            This quote may have been removed or you don&apos;t have access.
          </p>
        </div>
      </main>
    );
  }

  // Org scoping: buyer can only see quotes for their org's RFQs
  if (
    user.role === "BUYER" &&
    quote.rfq.buyerOrganizationId !== user.orgId
  ) {
    redirect("/quotes");
  }

  const isExpired = new Date() > quote.expiresAt;
  const canAccept =
    user.role === "BUYER" && quote.status === "SENT" && !isExpired;
  const daysUntilExpiry = Math.max(
    0,
    Math.ceil(
      (quote.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );

  const statusColors: Record<string, string> = {
    DRAFT: "bg-slate-500/20 text-slate-400",
    SENT: "bg-blue-500/20 text-blue-400",
    ACCEPTED: "bg-emerald-500/20 text-emerald-400",
    EXPIRED: "bg-amber-500/20 text-amber-400",
    REJECTED: "bg-red-500/20 text-red-400",
  };

  return (
    <main className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link
            href="/quotes"
            className="mb-2 inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            Back to Quotes
          </Link>
          <h1 className="text-2xl font-semibold text-on-surface">
            Quote for {quote.rfq.commodity}
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {quote.rfq.volume} {quote.rfq.unit} &middot;{" "}
            {quote.rfq.destination}
            {quote.rfq.incoterm ? ` (${quote.rfq.incoterm})` : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[quote.status] ?? statusColors.DRAFT}`}
        >
          {quote.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content — 2 cols */}
        <div className="space-y-6 lg:col-span-2">
          {/* Pricing */}
          <section className="rounded-xl border border-white/10 bg-surface-container p-6">
            <h2 className="mb-4 text-base font-semibold text-on-surface">
              Pricing
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-surface-container-high p-4">
                <p className="text-xs text-on-surface-variant">Service Fee</p>
                <p className="mt-1 text-2xl font-bold text-on-surface">
                  {quote.currency}{" "}
                  {quote.serviceFeeAmount.toLocaleString("en-GB", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              {quote.brokerCommissionAmount != null && (
                <div className="rounded-lg bg-surface-container-high p-4">
                  <p className="text-xs text-on-surface-variant">
                    Broker Commission
                  </p>
                  <p className="mt-1 text-2xl font-bold text-on-surface">
                    {quote.currency}{" "}
                    {quote.brokerCommissionAmount.toLocaleString("en-GB", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              )}
              <div className="rounded-lg bg-surface-container-high p-4">
                <p className="text-xs text-on-surface-variant">Lead Time</p>
                <p className="mt-1 text-2xl font-bold text-on-surface">
                  {quote.leadTimeDays} days
                </p>
              </div>
              <div className="rounded-lg bg-surface-container-high p-4">
                <p className="text-xs text-on-surface-variant">Valid Until</p>
                <p
                  className={`mt-1 text-2xl font-bold ${isExpired ? "text-red-400" : "text-on-surface"}`}
                >
                  {quote.expiresAt.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                {!isExpired && quote.status === "SENT" && (
                  <p className="text-xs text-on-surface-variant">
                    {daysUntilExpiry} days remaining
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Terms */}
          <section className="rounded-xl border border-white/10 bg-surface-container p-6">
            <h2 className="mb-4 text-base font-semibold text-on-surface">
              Terms & Conditions
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface-variant">
              {quote.terms}
            </p>
          </section>

          {/* QC & Document Plans */}
          <div className="grid gap-6 sm:grid-cols-2">
            <section className="rounded-xl border border-white/10 bg-surface-container p-6">
              <h2 className="mb-3 text-base font-semibold text-on-surface">
                QC Plan
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface-variant">
                {quote.qcPlan}
              </p>
            </section>
            <section className="rounded-xl border border-white/10 bg-surface-container p-6">
              <h2 className="mb-3 text-base font-semibold text-on-surface">
                Document Plan
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface-variant">
                {quote.docPlan}
              </p>
            </section>
          </div>
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-6">
          {/* RFQ Summary */}
          <section className="rounded-xl border border-white/10 bg-surface-container p-6">
            <h2 className="mb-3 text-base font-semibold text-on-surface">
              RFQ Summary
            </h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-on-surface-variant">Commodity</dt>
                <dd className="font-medium text-on-surface">
                  {quote.rfq.commodity}
                </dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Volume</dt>
                <dd className="font-medium text-on-surface">
                  {quote.rfq.volume} {quote.rfq.unit}
                </dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Destination</dt>
                <dd className="font-medium text-on-surface">
                  {quote.rfq.destination}
                </dd>
              </div>
              {quote.rfq.timeline && (
                <div>
                  <dt className="text-on-surface-variant">Timeline</dt>
                  <dd className="font-medium text-on-surface">
                    {quote.rfq.timeline}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-on-surface-variant">Created By</dt>
                <dd className="font-medium text-on-surface">
                  {quote.createdBy.name ?? quote.createdBy.email}
                </dd>
              </div>
            </dl>
          </section>

          {/* Trade Case link (if accepted) */}
          {quote.tradeCase && (
            <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
              <h2 className="mb-2 text-base font-semibold text-emerald-400">
                Trade Case Created
              </h2>
              <p className="text-sm text-on-surface-variant">
                Reference: {quote.tradeCase.referenceCode}
              </p>
              <a
                href={`/cases/${quote.tradeCase.id}`}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300"
              >
                View Trade Case
                <span className="material-symbols-outlined text-[16px]">
                  arrow_forward
                </span>
              </a>
            </section>
          )}

          {/* Accept / Expire notice */}
          {canAccept && <QuoteAcceptClient quoteId={quote.id} />}

          {isExpired && quote.status === "SENT" && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
              <span className="material-symbols-outlined mb-2 text-3xl text-amber-400">
                schedule
              </span>
              <p className="text-sm font-medium text-amber-400">
                This quote has expired
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Contact your Ops representative for a new quote.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
