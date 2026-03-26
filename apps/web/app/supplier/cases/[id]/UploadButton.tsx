"use client";

export function UploadButton({ docId }: { docId: string }) {
  return (
    <button
      type="button"
      className="ml-4 shrink-0 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary/90 transition-colors"
      onClick={() => alert(`Upload placeholder for document ${docId}`)}
    >
      <span className="material-symbols-outlined text-base">upload</span>
      Upload
    </button>
  );
}
