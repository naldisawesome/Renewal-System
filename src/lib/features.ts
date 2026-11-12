/**
 * Every feature the owner can switch on or off. Pure data (no database), so pages, menus and the Feature
 * switches screen all read the same list. Add a feature here, then guard its page and API routes with the key.
 *
 * `locked` features are the core of the system: they are shown on the screen but can't be switched off.
 */
export type FeatureDef = { key: string; label: string; description: string; group: string; locked?: boolean };

export const FEATURE_GROUPS = ["Renewals", "Working a renewal", "Insights", "Admin", "Core (always on)"] as const;

export const FEATURES: FeatureDef[] = [
  { key: "board", group: "Renewals", label: "Board", description: "The pipeline board for admins, advisers and underwriters." },
  { key: "allocate", group: "Renewals", label: "Allocation tools", description: "Assigning people to renewals: the Allocate page, bulk Assign, distribute evenly and reassign." },
  { key: "upload", group: "Renewals", label: "Excel upload", description: "Uploading the renewal spreadsheet, and undoing an upload." },
  { key: "export", group: "Renewals", label: "Export to Excel", description: "The Export buttons on the renewal lists." },
  { key: "bulk_actions", group: "Renewals", label: "Bulk actions", description: "Selecting several renewals to set follow-ups or delete them." },
  { key: "my_day", group: "Renewals", label: "Today line", description: "The one-line summary of overdue, follow-up and stuck renewals on an adviser's list." },

  { key: "notes", group: "Working a renewal", label: "Notes and mentions", description: "Writing notes on a renewal, quick notes and @mentions." },
  { key: "follow_ups", group: "Working a renewal", label: "Follow-up dates", description: "Setting the next follow-up date on a renewal." },
  { key: "notifications", group: "Working a renewal", label: "Notifications", description: "The bell and its list of mentions and reminders." },

  { key: "dashboard", group: "Insights", label: "Dashboards", description: "Insights for managers (forecast) and the adviser's My dashboard." },
  { key: "reports", group: "Insights", label: "Reports", description: "Time at each step and Outcomes." },

  { key: "audit_log", group: "Admin", label: "Audit log", description: "The record of who did what, and sign-ins." },
  { key: "announcements", group: "Admin", label: "Announcements", description: "Writing announcements, and the banner everyone sees." },
  { key: "system_health", group: "Admin", label: "System health", description: "The System page with its checks and problem reports." },
  { key: "backup", group: "Admin", label: "Backup download", description: "Downloading a full backup to Excel." },

  { key: "renewals", group: "Core (always on)", locked: true, label: "Renewals and renewal pages", description: "The lists, a renewal's details, status changes and outcomes." },
  { key: "users", group: "Core (always on)", locked: true, label: "Users and sign-in", description: "Accounts, sign-in, passwords and approvals." },
  { key: "feature_switches", group: "Core (always on)", locked: true, label: "Feature switches", description: "This screen. Only the owner can open it." },
];

export type FeatureKey = string;

export const FEATURE_KEYS = FEATURES.map((f) => f.key);
export const SWITCHABLE = FEATURES.filter((f) => !f.locked);
export const featureByKey = (key: string) => FEATURES.find((f) => f.key === key);

/** Who becomes the owner automatically the first time they sign in (when nobody is the owner yet). */
export const OWNER_NAME = "Reynald Arro";
