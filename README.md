# Renewal System — Cactus &amp; Blanket

A web app that replaces the manual renewal spreadsheet workflow: upload the raw export, the
system sorts and stores every row, a manager allocates renewals to advisers, and advisers work
their list and leave notes — all with logins and role-based access.

Built with the same stack as your other projects: **Next.js 14, Prisma, PostgreSQL (Supabase),
NextAuth, Zod, Tailwind**, deployed on **Vercel**.

---

## What it does

- **Upload** the `.xlsx`/`.csv` renewal export exactly as it comes out of your source system
  (`Client Name`, `Policy Number`, `Insurer`, `Sales Team`, `Renewal Date`, `Invoice Total`, etc.)
  and pick which book it belongs to: **Cactus Renewals (CIL-CC)**, **Cactus Contract Works
  (CIL-CW)**, **Blanket Renewals (BAL)**, or **Blanket Contract Works (BAL-CW)**.
- Uploading a file again **only adds rows that aren't in the system yet**. Rows already in the system
  are never changed or removed, so assignments, statuses, notes and details stay exactly as they are.
- **Login / logout** with four roles (people sign in with their company Google account):
  - **Super Admin (manager)** — uploads files, approves new accounts, allocates renewals,
    sees everything across both books.
  - **Adviser** — sees only the renewals assigned to them, updates status, adds notes.
  - **Underwriter** — works the renewals assigned to them as underwriter and records the quote.
  - **Policy Service Associate** — read-only view of All renewals, can leave notes.
  Name and email come from the person's Google account and can't be edited in the app.
- **Self-registration with approval** — an adviser creates an account, but can't log in until a
  manager approves them from the Users page.
- **Allocation** — the file's original "Sales Team" column is kept and shown for reference only;
  a manager manually assigns every renewal to an adviser from a checklist-style table (bulk
  select + assign, or reassign later).
- **Comments** — a running notes thread on every renewal, visible to the assigned adviser and all
  managers.
- **Database-backed** — everything is stored in Postgres via Prisma, so nothing lives only in a
  spreadsheet again.
- **Full user management** — Super Admins can add, edit, and delete advisers/managers directly
  (not just approve self-registrations). Accounts created this way are active immediately with a
  temporary password, and the new user is forced to set their own password the first time they
  log in.
- **Sort and browse by Month/Year** — All Renewals can be filtered to a specific renewal month
  (e.g. "Jul 2026") and sorted earliest/latest first. The Overview page shows a "By Renewal Month"
  breakdown, and every renewals table shows a Month/Year column.
- **Notes right from the list** — advisers get a **Notes** button on every renewal in "My
  Renewals" that opens a quick popup to read and add notes without leaving the list (it also shows
  the current note count on the button). Managers get the same **Notes** button on the All
  Renewals and Allocate tables, so they can leave notes without opening the full renewal page.
- **Notification bell** — whenever someone leaves a note on a renewal, the assigned adviser and
  anyone else already in that note thread get a notification (a small red badge on the bell icon
  in the top nav). It refreshes in the background every so often (there is no always-open live
  connection any more). Clicking a notification jumps straight to that
  renewal and marks it read.
- **Back button** on the renewal detail page, so you can return to wherever you came from (All
  Renewals, Allocate, or My Renewals) without losing your filters.
- **"Portfolio" and "Type"** — renamed from "Company" and "Book" throughout the interface for
  clarity. The underlying data is unchanged, this is just clearer wording.
- **Full CRUD on renewals** — Super Admins can now **add** a renewal manually (for policies that
  weren't in the uploaded file), **edit** every field on the renewal detail page, and **delete** a
  renewal entirely, in addition to the existing read/allocate/status flows.
- **Audit trail / history log** — every renewal now has a **History** section showing who did
  what and when: created, status changes, assignment/reassignment, and edited fields are all
  logged with the acting user's name and a timestamp. Bulk file uploads are tracked separately at
  the batch level (visible via the upload result) rather than logged per-row, to keep uploads fast.
- **Loading states everywhere** — switching between admin tabs (Overview, All Renewals, Allocate,
  Upload, Users), changing a filter/dropdown, and opening a policy all show a loading spinner
  while the new data loads, instead of a blank pause. Every action button (adding a user, saving
  an edit, deleting, uploading, posting a note, changing status) shows a spinner while it's
  working, too.
- **Duplicate-upload warning** — if a file you upload adds new policies that share a policy
  number with an existing renewal under a *different* Portfolio or Type, you get a clear warning
  right after upload. This is almost always caused by re-uploading the same file with the wrong
  Portfolio/Type selected - the warning catches it immediately instead of weeks later.
- **Bulk delete** — Super Admins can select multiple renewals (checkboxes, same pattern as
  Allocate) on both the All Renewals and Allocate pages and delete them all at once - useful for
  cleaning up accidental duplicate uploads.
- **@mention in notes** — type `@` in any note field (the quick Notes popup or the full renewal
  page) to pull up a list of active users; picking one tags them and sends them a notification
  specifically saying they were mentioned, separate from the regular "someone left a note"
  notification.
- **Sales forecast dashboards** — a new **Dashboard** tab for both roles. Managers see forecasted
  sales (tallied from invoice totals) across everyone, filterable by Month, a custom date range,
  and by Adviser, plus a monthly trend chart and breakdowns by status and by adviser. Advisers get
  the same dashboard scoped to only their own assigned renewals, with Month/date filters (no
  adviser filter, since it's already just theirs).
- **New role: Policy Service Associate** — a third role alongside Super Admin and Adviser. They
  see only an **All Renewals** tab covering every policy across the whole system (not scoped to
  them), can open any policy and leave notes (including @mentions), but can't change a status,
  edit a policy's details, allocate, upload, delete, or manage users. These accounts can only be
  created by a Super Admin from the Users page (there's no public self-registration path for this
  role, the same way there isn't for Super Admin).
- **New role: Underwriter** — has the same access as an Adviser (My Renewals, Dashboard, can
  change status and leave notes on renewals assigned to them), but scoped to a separate
  **Underwriter** assignment rather than the Adviser one. A renewal can have an Adviser and an
  Underwriter assigned independently at the same time. On **Allocate**, a toggle lets a manager
  switch between "As Adviser" and "As Underwriter" before picking who to assign - both All
  Renewals and Allocate now show an **Underwriter** column right next to **Adviser**, and All
  Renewals can also filter by Underwriter.

## Status steps (current)

Not assigned → **Needs quote** → Quoted → Contacted → Renewed, Cancelled or Lapsed. Moves go forward one step at a
time; each step is set by the role that owns it; Super Admins can correct any renewal to any status. "Needs quote"
is the old "Assigned" and "In Progress" merged into one step: older renewals stored as In Progress are still valid
and are shown and treated exactly as Needs quote (no data was migrated).

## How the app is laid out (November 2026 redesign)

- **Top bar.** Renewals, Board, Upload, Insights, and a Settings menu: Users, Announcements, Audit log, System
  health and (owner only) Feature switches. Find a renewal (Ctrl+K) is on the right. Advisers and underwriters see My renewals, Board and
  (advisers) My dashboard.
- **Renewals list (home).** Due-date stops across the top filter the list. One Filters button holds Status, Deadline,
  Renewal month, Portfolio, Type, Adviser, Underwriter and Sales team. The list opens with the filters you used
  last. Select rows for the actions bar: Assign (one person, remove, or share evenly), hand-over note, Set
  follow-up, Delete. "Move someone's renewals" moves a whole list between people.
- **Renewal page.** Progress track, a Next step sentence for the person looking, key facts, then Activity and Policy
  details as tabs. Follow-up and the client's other policies are on the right.
- **Upload.** Uploads only add what is missing; nothing already in the system is changed or removed (details,
  status, allocation, notes). Choose "New renewals and contract works" or "New contract works only". Every upload
  is previewed before saving and the latest one can be undone. The heading row can be anywhere in the first 15
  rows of the file.
- **Insights.** Forecast, Time at each step, Outcomes.
- **Stuck tag, quick notes, Today line, bulk follow-up** work as before. Underwriters also see how many renewals
  are waiting for their quote.
- **Feature switches (owner only).** Every switchable feature with an on/off switch and an optional message. Off
  means hidden for everyone except the owner; pages show a "switched off for now" page and the matching APIs
  answer 503. Changes reach everyone within about 5 seconds. Every change is in the Audit log.
- **Removed in the redesign:** Calendar, the widget picker, Saved views, the What's new notice, and the separate
  Allocate, Admin tools and Overview pages. Their old addresses redirect. See `CHANGES.md`.
- **Design system.** Colours and type are defined once in `tailwind.config.ts` and `src/app/globals.css`
  (`slate` = neutral, `brand` = jade accent, `ink` = the actions bar and sign-in panel). Shared building blocks: `Runway` (due-date stops),
  `StageTrack` (progress), `CommandSearch`, `InsightsTabs`.

## Owner and feature switches

The owner is the one person who can open Feature switches. It is claimed **once, automatically**, the first time
an active Super Admin signs in while nobody is owner yet:
- if the Vercel setting `OWNER_EMAIL` is set, the account with that email;
- otherwise the Super Admin named exactly "Reynald Arro", and only if exactly one active Super Admin has that name.

The claim is a single database statement, so two sign-ins at the same moment cannot both win. After that it
stays with the account and nothing in the app can change it. **Set `OWNER_EMAIL`** (Vercel → Settings → Environment
Variables → value is your sign-in email address, then redeploy) so it does not depend on a name.

To add a new switchable feature: add it to `src/lib/features.ts`, guard its page with
`await requireFeature("key")` and its API with `const off = await featureOff("key"); if (off) return off;`, and
hide its buttons with `<Feature name="key">`. The route-access test fails if an API route stops checking who is
calling.

## Tests and quality checks

- `npm test` (also run by every Vercel build) runs the unit tests in `src/lib/__tests__`, including a test that
  runs every API route handler and checks that nobody signed in is refused and that an Adviser is refused on
  every Super-Admin-only handler.
- The QA audit documents (defect register, results, traceability, regression plan, release readiness,
  remediation plan) are kept in `qa-reports/` in the project folder of the working copy; they are not part of the
  deployed app.
- Whenever a fix or feature is made, this README, `CHANGES.md` and the QA documents are updated in the same
  change.

---

## Setup — no installs, no VS Code, everything through the browser

This path never touches npm, Node, or a terminal. Everything happens on github.com,
supabase.com, and vercel.com.

### Step 1 — Unzip the file

Right-click `renewal-system.zip` → **Extract All** (Windows) or double-click it (Mac). This just
uses your OS's built-in unzip — no software install. You'll get a `renewal-system` folder.

### Step 2 — Create a GitHub repo and upload the files

1. Go to [github.com](https://github.com) → sign in → click the **+** in the top right →
   **New repository**.
2. Name it (e.g. `renewal-system`), keep it **Private**, don't add a README/gitignore (we already
   have one), click **Create repository**.
3. On the empty repo page, click **uploading an existing file**.
4. Open the `renewal-system` folder you extracted, select **all files and subfolders inside it**
   (not the outer folder itself), and drag them into the GitHub upload box. Modern browsers accept
   whole folders dropped this way.
5. Scroll down, click **Commit changes**. Your code is now on GitHub.

### Step 3 — Create the database (Supabase)

1. Go to [supabase.com](https://supabase.com) → sign in → **New Project**.
2. Pick a name, set a database password (save it somewhere), pick a region close to NZ, create it.
3. Once it's ready: **Project Settings → Database → Connection string**.
4. Copy the **Transaction pooler** string → this is your `DATABASE_URL`.
5. Copy the **Session pooler** (or "Direct connection") string → this is your `DIRECT_URL`.
   Replace `[YOUR-PASSWORD]` in both with the database password you set.

### Step 4 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → sign in with GitHub → **Add New → Project**.
2. Import the `renewal-system` repo you just created.
3. Before clicking Deploy, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Transaction pooler string from Supabase |
   | `DIRECT_URL` | the Session/direct string from Supabase |
   | `NEXTAUTH_SECRET` | any long random string — generate one at [generate-secret.vercel.app/32](https://generate-secret.vercel.app/32) |
   | `NEXTAUTH_URL` | your Vercel URL, e.g. `https://renewal-system.vercel.app` (you can add this after the first deploy once you know the URL, then redeploy) |
   | `SEED_ADMIN_NAME` | your name |
   | `SEED_ADMIN_EMAIL` | your email — this becomes your manager login |
   | `SEED_ADMIN_PASSWORD` | a strong password |
   | `SETUP_SECRET` | another random string you make up — keep this one private |

4. Click **Deploy**. Vercel's build step runs `prisma generate && prisma db push && next build`
   automatically, which creates all the database tables for you — no local commands needed.
5. Once it says "Ready," open the deployed URL. If you hadn't set `NEXTAUTH_URL` yet, go back to
   **Settings → Environment Variables**, add it now using the real URL Vercel gave you, then
   **Deployments → ⋯ → Redeploy**.

### Step 5 — Create your manager (Super Admin) account

Visit this URL in your browser once (replace the domain and token with your own):

```
https://your-app.vercel.app/api/setup/seed-admin?token=YOUR_SETUP_SECRET
```

You should see a message confirming the account was created. This is a one-time bootstrap step —
visiting it again after the account exists just tells you it already exists and does nothing.

### Step 6 — Log in

Go to `https://your-app.vercel.app/login`, sign in with `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`. You're now the Super Admin. Change your password by creating a new account
for yourself later if you'd rather not keep using the seeded one, or just keep it — it's yours.

From here:
- **Users** (Settings menu) — approve people as they sign in for the first time.
- **Upload** — upload your renewal files (Cactus/Blanket × Renewals/Contract Works).
- **Renewals** — select renewals and choose Assign in the bar at the bottom.

---

## Alternative setup (if you ever do have npm access)

<details>
<summary>Local / CLI steps</summary>

```bash
npm install
npx prisma db push
npm run seed
npm run dev
```

`npm run seed` does the same thing as the `/api/setup/seed-admin` URL above, just from your
terminal instead of a browser.
</details>

---

## Day-to-day usage

**As the manager (Super Admin):**
1. **Upload** — pick Company + Book, upload the file, check the preview, then save.
2. **Users** — approve anyone who has signed in and is waiting on you.
3. **Renewals** — filter, select renewals, choose who in "Assign to…" (or share them evenly) and click Assign.
4. **Board** and **Insights** — the pipeline at a glance, and the forecast and reports.

**As an adviser:**
1. Register at `/register`, wait for approval.
2. Once approved, **My Renewals** shows everything assigned to you, filterable by status.
3. Open a renewal to update its status (Needs quote → Quoted → Contacted → Renewed/Cancelled/Lapsed)
   and leave notes for the manager or your future self.

---

## How the file mapping works

The parser (`src/lib/excelParser.ts`) reads these columns from your export, matched by header
name so column order doesn't matter:

`Client Name`, `Id`, `Classification`, `Reference Code`, `Policy Number`, `Class of Risk`,
`Policy Description`, `Insurer`, `Sales Team`, `Service Team`, `Policy Team`,
`Auth. Rep & Prod. Broker`, `Start Date`, `Renewal Date`, `Payment Plan`, `Invoice Total`,
`Policy Category 1`.

Rows missing a Client Name or Policy Number (blank/group-separator rows in the raw export) are
skipped automatically and reported in the upload result.

If your source system ever renames a column, update the `HEADER_MAP` at the top of
`src/lib/excelParser.ts` — it's a one-line change per column.

## Project structure

```
prisma/schema.prisma        Database schema (Users, Renewals, Comments, UploadBatch, FeatureFlag, ...)
prisma/seed.ts              Creates the first Super Admin account
src/lib/excelParser.ts      Maps raw export rows to Renewal records
src/lib/auth.ts             NextAuth config (credentials login, roles, status checks)
src/middleware.ts           Route protection (admin vs adviser areas)
src/app/admin/*             Manager-only pages (upload, allocate, users, all renewals)
src/app/workspace/*         Adviser / underwriter pages (my list, board, calendar, dashboard)
src/app/admin/tools         Admin tools page; admin/features is the owner-only switches page
src/lib/features.ts         Every switchable feature; featureFlags.ts holds the on/off and owner logic
src/app/renewals/[id]/*     Shared renewal detail + status + comments
src/app/api/*               Route handlers backing all of the above
```
