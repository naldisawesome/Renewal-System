import { redirect } from "next/navigation";

// The Renewals list is the home page; the old Overview was folded into it (the due-date stops) and Insights.
export default function Moved() {
  redirect("/admin/renewals");
}
