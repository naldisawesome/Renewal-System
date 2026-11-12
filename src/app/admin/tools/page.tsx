import { redirect } from "next/navigation";

// The pages this linked to are now in the sidebar under Settings.
export default function Moved() {
  redirect("/admin/renewals");
}
