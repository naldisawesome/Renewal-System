import { prisma } from "@/lib/prisma";
import AnnouncementBannerClient from "./AnnouncementBannerClient";

/** The newest active announcement, if there is one. Never breaks a page: no announcement is shown if the lookup fails. */
export default async function AnnouncementBanner() {
  try {
    const a = await prisma.announcement.findFirst({ where: { active: true }, orderBy: { createdAt: "desc" } });
    if (!a) return null;
    return <AnnouncementBannerClient id={a.id} message={a.message} tone={a.tone === "warning" ? "warning" : "info"} />;
  } catch {
    return null;
  }
}
