import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { defaultRouteFor } from "@/lib/guards";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  if (session.user.mustChangePassword) redirect("/change-password");
  redirect(defaultRouteFor(session.user.role));
}
