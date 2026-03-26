import { ShieldCheck } from "lucide-react";

export default function VerificationQueue() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Document Verification</h1>
      <p className="text-text-secondary mt-2">Approve or reject supplier documents</p>
      <div className="mt-8 rounded-xl border border-border bg-surface-1">
        <div className="grid grid-cols-7 gap-4 border-b border-border bg-surface-2 px-4 py-3">
          {["Document", "Type", "Case", "Supplier", "Uploaded", "Status", "Actions"].map((h) => (
            <span key={h} className="text-xs font-medium uppercase tracking-wider text-text-tertiary">{h}</span>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center py-16">
          <ShieldCheck className="mb-3 h-10 w-10 text-text-tertiary" />
          <p className="mb-1 text-sm font-medium text-text-secondary">No documents pending verification</p>
          <p className="text-xs text-text-tertiary">Documents uploaded by suppliers will appear here</p>
        </div>
      </div>
    </main>
  );
}
