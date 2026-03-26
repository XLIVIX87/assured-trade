import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";

export default async function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { name?: string | null; role?: string };

  return (
    <div className="flex min-h-screen bg-surface-dim">
      <Sidebar role="supplier" activePath="" />
      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        <TopNav userName={user.name ?? "Supplier"} userRole="Supplier Desk" />
        <main className="mt-16 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
