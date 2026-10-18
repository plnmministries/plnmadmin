import { redirect } from "next/navigation";

// The admin portal opens on its dashboard; the website editor is one of its tabs (/admin/editor).
export default function AdminHome() {
  redirect("/admin/app");
}
