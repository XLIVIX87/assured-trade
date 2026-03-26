import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    const role = (session.user as { role?: string }).role;
    if (role === "OPS") redirect("/ops/dashboard");
    if (role === "SUPPLIER") redirect("/supplier/dashboard");
    redirect("/dashboard");
  }

  redirect("/login");
}
