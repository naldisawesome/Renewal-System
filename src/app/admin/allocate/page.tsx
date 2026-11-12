import { redirect } from "next/navigation";

// Allocation moved into the Renewals list: select rows and Assign, share evenly, or "Move someone's renewals".
export default function Moved() {
  redirect("/admin/renewals");
}
