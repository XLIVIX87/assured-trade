import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Map the membership role to the Sidebar's expected role type.
  // Default to "buyer" for the (dashboard) route group.
  const roleMap: Record<string, "buyer" | "supplier" | "ops"> = {
    BUYER: "buyer",
    SUPPLIER: "supplier",
    OPS: "ops",
  };

  const role = roleMap[session.user.role ?? ""] ?? "buyer";

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
