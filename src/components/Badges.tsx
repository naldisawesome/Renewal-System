const STATUS_STYLES: Record<string, string> = {
  UNASSIGNED: "bg-slate-100 text-slate-600",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  CONTACTED: "bg-purple-100 text-purple-700",
  RENEWED: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
  LAPSED: "bg-orange-100 text-orange-700",
};

const STATUS_LABELS: Record<string, string> = {
  UNASSIGNED: "Unassigned",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  CONTACTED: "Contacted",
  RENEWED: "Renewed",
  LOST: "Lost",
  LAPSED: "Lapsed",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_STYLES[status] || "bg-slate-100 text-slate-600"}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

const COMPANY_STYLES: Record<string, string> = {
  CACTUS: "bg-emerald-100 text-emerald-700",
  BLANKET: "bg-indigo-100 text-indigo-700",
};

const COMPANY_LABELS: Record<string, string> = {
  CACTUS: "Cactus",
  BLANKET: "Blanket",
};

export function CompanyBadge({ company }: { company: string }) {
  return (
    <span className={`badge ${COMPANY_STYLES[company] || "bg-slate-100 text-slate-600"}`}>
      {COMPANY_LABELS[company] || company}
    </span>
  );
}

export function BookTypeBadge({ bookType }: { bookType: string }) {
  return (
    <span className="badge bg-slate-100 text-slate-600">
      {bookType === "CONTRACT_WORKS" ? "Contract Works" : "Renewals"}
    </span>
  );
}
