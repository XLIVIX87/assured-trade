import { Sidebar } from "@/components/layout/Sidebar";

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar role="supplier" />
      <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
