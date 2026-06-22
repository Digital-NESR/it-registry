import { redirect } from "next/navigation";
import { ensureSchema } from "@/lib/db";
import { requireAdmin } from "@/server/identity";
import AdminConsole from "@/components/AdminConsole";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await ensureSchema();
  const { ok } = await requireAdmin();
  if (!ok) redirect("/");
  return <AdminConsole />;
}
