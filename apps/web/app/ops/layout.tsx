import { Sidebar } from "@/components/layout/Sidebar";

export default function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar role="ops" />
      <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
