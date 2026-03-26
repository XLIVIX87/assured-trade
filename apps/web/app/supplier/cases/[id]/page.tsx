export default function SupplierCaseDetail({ params: _params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Case Detail</h1>
      <p className="text-text-secondary mt-2">Upload documents and track case progress</p>
    </main>
  );
}
