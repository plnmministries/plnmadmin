import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-guard";
import Preview from "@/components/admin/Preview";

export const dynamic = "force-dynamic";

// The editor's canvas. Renders the real site components, fed by postMessage from /admin.
export default async function PreviewPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  return <Preview />;
}
