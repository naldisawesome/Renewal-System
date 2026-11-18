/** The shape of a renewal as the agent sees it: plain values, no internal ids beyond the renewal's own. */
export function agentRenewal(r: any) {
  const day = (d: Date | null | undefined) => (d && d.getTime() !== 0 ? d.toISOString().slice(0, 10) : null);
  return {
    id: r.id,
    clientName: r.clientName,
    policyNumber: r.policyNumber,
    portfolio: r.company === "BLANKET" ? "Blanket" : "Cactus",
    type: r.bookType === "CONTRACT_WORKS" ? "Contract Works" : "Renewals",
    insurer: r.insurer ?? null,
    renewalDate: day(r.renewalDate),
    status: r.status,
    invoiceTotal: r.invoiceTotal ?? null,
    quotedPremium: r.quotedPremium ?? null,
    adviser: r.assignedAdviser ? { name: r.assignedAdviser.name, email: r.assignedAdviser.email } : null,
    underwriter: r.assignedUnderwriter ? { name: r.assignedUnderwriter.name, email: r.assignedUnderwriter.email } : null,
    followUpAt: day(r.followUpAt),
    followUpNote: r.followUpNote ?? null,
    link: `${(process.env.NEXTAUTH_URL || "").replace(/\/$/, "")}/renewals/${r.id}`,
  };
}

export const AGENT_RENEWAL_INCLUDE = {
  assignedAdviser: { select: { name: true, email: true } },
  assignedUnderwriter: { select: { name: true, email: true } },
} as const;
