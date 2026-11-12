import { redirect } from "next/navigation";

// The calendar view was removed; the Board and the deadline filter cover it.
export default function Moved() {
  redirect("/workspace/board");
}
