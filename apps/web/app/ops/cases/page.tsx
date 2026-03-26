import { Briefcase } from "lucide-react";

export default function OpsCaseList() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">All Cases</h1>
      <p className="text-text-secondary mt-2">Manage trade cases across all organizations</p>
      <div className="mt-8 rounded-xl border border-border bg-surface-1">
        <div className="grid grid-cols-8 gap-4 border-b border-border bg-surface-2 px-4 py-3">
          {["Case ID", "Commodity", "Buyer", "Supplier", "Value", "Docs", "Status", "Updated"].map((h) => (
            <span key={h} className="text-xs font-medium uppercase tracking-wider text-text-tertiary">{h}</span>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center py-16">
          <Briefcase className="mb-3 h-10 w-10 text-text-tertiary" />
          <p className="mb-1 text-sm font-medium text-text-secondary">No trade cases</p>
          <p className="text-xs text-text-tertiary">Cases are created when buyers accept quotes</p>
        </div>
      </div>
    </main>
  );
}
