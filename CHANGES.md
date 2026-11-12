# Update 2026-11-13: uploads only add, and a faster file reader

## After you deploy
- **No database changes** and no new settings.

## Uploads only add
Every upload now only adds what is missing. A renewal or contract works already in the system is never changed or
removed: its details, status, adviser and underwriter, follow-up and notes stay exactly as they are. So renewals
gathered months ahead and already allocated are safe when the month is pulled again.

The Upload page asks "What this upload does":
- **New renewals and contract works** (the normal choice): adds every row in the file that isn't in the system yet.
- **New contract works only**: adds only contract works that aren't in the system yet; renewal rows are left out.

The preview shows how many new renewals and new contract works will be added and how many rows are already in the
system, with examples. The button reads "Add N new rows". The page remembers the last choice in your browser.

**How "already in the system" is decided:** same Id as a stored record, or the same policy number, renewal date
and description as one stored under either Renewals or Contract Works (so a line filed under the other type
earlier is not added twice). Two identical new lines in one file are both added.

**Safety:** saving only inserts new rows (in batches of 1,000). The server refuses to save if a plan would ever
change an existing record, and a test runs the real upload route against a recording database to confirm it makes
no update or delete calls.

**This replaces the old "refresh" behaviour.** Previously a re-upload also updated details of existing records
(insurer, invoice total, renewal date and so on, never allocation or status). That no longer happens. If a detail
changes at source, edit it on the renewal page.

Recent uploads labels "Contract works only" uploads. Undo removes only what that upload added and keeps anything
someone has already started on.

## Faster, more forgiving file reader
- Reads only the first sheet, keeps cells as plain values (no formatting, styles or formulas) and works out which
  column feeds which field once per file instead of once per cell.
- Measured on generated exports of the same shape as yours (30 columns), with identical results to the old reader:
  20,000-row .xlsx 2.3 s to 1.0 s; 20,000-row .csv 1.0 s to 0.18 s.
- Matching against stored records now reads only the six fields needed to recognise them, not whole records.
- The heading row no longer has to be the first row: the reader looks through the first 15 rows for the row that
  names Client and Policy Number, so exports with a title or a run date above the table work as they are.

## Tests
154 unit tests (was 147): add-only rules for both choices, allocated records left alone, duplicate lines in one
file, heading-row detection, and the insert-only check on the real upload route.

---

# Update 2026-11-12: redesign

## After you deploy
- **No database changes.** Nothing was added, changed or removed. The saved-views table and two unused user columns
  are left exactly as they are.
- **No new Vercel settings.**
- Optional: delete the files listed in `DELETE-THESE-FILES.txt` on GitHub. They are empty stubs, so the build works
  either way.

## New look
- Calm interface in the original colours (cool paper, jade accent) with a dark mode; one typeface (Instrument Sans).
- **Top bar**: Renewals, Board, Upload, Insights, and a Settings menu (Users, Announcements, Audit log, System
  health, Feature switches), with Find a renewal, notifications and your account on the right. On phones it
  becomes a slide-in menu.
- **Find a renewal (Ctrl+K or ⌘K)** from anywhere: type a client name or policy number and press Enter. Advisers
  and underwriters only find their own renewals.

## Renewals list
- **Due-date stops** across the top (Overdue, Today, 1 to 3, 4 to 7, 8 to 14, 15 to 30 days). Click one to filter;
  click it again to clear. They replace the totals boxes and the month strip. The renewal month is now a filter.
- **Eight columns instead of twelve**: client and policy share a cell, adviser and underwriter share a cell.
- **Actions bar at the bottom** when rows are selected: Assign (to a person, remove, or **share evenly** between all
  advisers or underwriters), an optional **hand-over note**, Set follow-up, Delete.
- **Move someone's renewals** is a button on this page (with an optional hand-over note).
- A hand-over note is saved as a normal note on each renewal ("Hand-over note: ..."), so the new owner sees it in
  Activity. No new database field.

## Renewal page
- **Progress track** and a **Next step** sentence written for whoever is looking, with their one action beside it.
- Key facts in one strip. **Activity** and **Policy details** are tabs (Activity first); details show the nine
  everyday fields with "Show all 15 details".

## Insights
- Dashboard and Reports are one page with three tabs: Forecast, Time at each step, Outcomes.

## Advisers and underwriters
- Underwriters see "N waiting for your quote" on the Today line.

## Removed (screens and code only)
| Removed | Use instead |
|---|---|
| Calendar view | Board, or the Deadline filter |
| Dashboard widget picker | Everyone gets the standard tiles |
| Saved views | The list remembers your last filters |
| "What's new" notice | Announcements |
| Allocate page | Assign, share evenly and Move someone's renewals on the Renewals list |
| Admin tools page, Overview page | The Settings menu; due-date stops and Insights |
| Target-GWP column in the Excel export | (the feature was removed earlier) |

Old addresses (`/admin`, `/admin/allocate`, `/admin/tools`, `/workspace/calendar`) redirect to the new place.
Feature switches no longer lists Calendar, Saved views, What's new or Admin tools.

## Deliberately not removed
- **Password sign-in code.** It stays switched off by the existing setting rather than deleted: it cannot be tested
  here against real sign-in, and a mistake in that code would lock everyone out. The first-admin setup link also
  depends on it.

## Motion
The progress track draws itself and the current step lands when a status changes; the due-date bars grow in; the
actions bar and dialogs rise in; the phone menu slides in. All of it is switched off by "Reduce motion".

## Checks
147 unit tests pass and the typecheck is clean. Not run against a live database or a deployed copy.

---

# Update 2026-11-10: fixes from the QA audit, owner-only Feature switches, simpler statuses

## After you deploy
1. **Database:** two additions apply automatically on build: a `FeatureFlag` table and a `User.isOwner` column.
2. **Recommended Vercel setting:** `OWNER_EMAIL` = your sign-in email (Settings → Environment Variables, then
   redeploy). It decides who owns Feature switches.

## What changed
- **Statuses:** "Assigned" and "In Progress" are one step, **Needs quote**; "Unassigned" is **Not assigned**.
  Adviser and underwriter screens use matching wording ("Waiting for the underwriter's quote" / "Quote needed from
  you"). Existing In Progress renewals still work.
- **Renewals list:** one Filters button, remembered filters, bulk Assign, bulk follow-up, Stuck tag, quick notes,
  Target/Actual GWP cards removed. Reports "Missing details" and "Data checks" removed.
- **Admin tools** page; menu slimmed (Allocate and Audit log/System/Announcements moved under it).
- **Feature switches** (owner only) and a **What's new** notice.
- **Users:** name and email can't be edited (Google sign-in); the server rejects such changes too.

## Fixes from the QA audit of 2026-11-10 (see qa-reports/DEFECT-REGISTER.md)
| ID | Fix |
|---|---|
| D-01 | Remembered filters no longer cut a search short at `&`, `+` or `=` |
| D-02 | The Board no longer sends people to a switched-off Calendar |
| D-03 | The "change your password first" lock now covers notifications, account, problems and sign-in-methods APIs |
| D-04 | One plain-wording label and one colour for Assigned/In Progress for advisers and underwriters; unused leftover code removed |
| D-05 | The Board/Calendar tab switch hides the tab of a switched-off feature |
| D-06 | Allocate only changes, logs and counts renewals that still exist |
| D-07 | The Assign control is hidden while Allocation tools is switched off |
| D-08 | The owner claim is one atomic statement and, without `OWNER_EMAIL`, needs a unique name match |
| D-09 | An upload now updates the renewal date of an Id-matched renewal (never over a hand-edited date; a blank cell never erases one) |
| D-10 | README brought up to date |

## Tests
147 unit tests (was 53): new tests for each fix, the upload date rule, and one that runs every API route for
access rules. `vitest.config.ts` added so tests can use the `@/` imports.

## Not changed (decisions for you)
ESLint was not added (turning it on can make Vercel builds fail on style warnings); the all-or-nothing upload
apply and vendoring the xlsx package remain open; delete `src/app/api/notifications/stream/route.ts` on GitHub by
hand.

---

# Update: follow-ups, safer uploads, moving renewals, reports, phone app, email, problems, backups, staging

## After you deploy

1. **Database changes run automatically**: new columns on Renewal and User, and four small new tables
   (StatusChange, UploadChange, ProblemEvent; AppSetting was added with Google sign-in). Nothing is lost and nobody
   is signed out.
2. **Optional settings in Vercel** (Settings, Environment Variables, then redeploy). The System page shows which
   are set.

| Name | What it turns on |
|---|---|
| `CRON_SECRET` | The daily job: deadline reminders, follow-up reminders and the morning email (already listed in the last update) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Sending email: the morning email and problem alerts. See "Email" below |
| `APP_URL` | The address people open, e.g. `https://renewals.vercel.app`, used for links in emails |
| `APP_ENV=staging` | Only on a staging copy: shows a "Staging copy" banner and sends no emails |

## What's new

**Follow-ups.** Each open renewal has a "Next follow-up" date and short note (renewal page, right-hand side). On
the day, the adviser and underwriter get a bell reminder, and it's in their morning email. My renewals shows
"N follow-ups due" as a filter and a Follow-up column.

**Uploads: check first, then save, and undo.**
- Choosing a file now shows a check first: how many renewals are new, which will change (and which fields), which
  are already up to date, and which columns in the file aren't used. Nothing is saved until you choose
  **Save this upload**.
- **Recent uploads** lists the last 10. The most recent can be undone: renewals it added are removed (unless
  someone has already started on them), and values it changed are put back (unless someone changed them again
  since).
- The upload now recognises more column names (e.g. "Insured", "Policy No", "Expiry Date", "Premium") and client
  contact columns ("Contact", "Email", "Phone", "Address"). The check shows any columns still not used; send me a
  sample with dummy data if important columns are listed there.

**Move someone's renewals.** Allocate, **Move someone's renewals**: choose adviser or underwriter, from whom
(including people no longer active), and to whom. It shows how many will move. Status, notes and history stay;
the person taking over gets one notification, and each renewal's history records the move.

**All renewals pages.** 100 per page with Previous and Next; totals and Excel export still cover every match.

**Quoted premium.** "Mark as quoted" now asks for the quoted premium. It shows on the renewal page with the change
on last year's invoice, starts off the renewed premium when the adviser records the outcome, and is in the export.

**Reports** (new page, Super Admins):
- *Time at each step*: average days at Assigned, In progress, Quoted and Contacted over the last 90 days, by
  person, and the renewals waiting longest at their current step. It measures status changes made from this
  update on, so it fills up over the coming weeks.
- *Missing details*: how many renewals have no renewal date, insurer, invoice total, class of risk, contact name,
  email or phone, or underwriter. Each line opens those renewals in All renewals.

**Phones.** Renewal lists show as cards on small screens. The app can be installed: on Android, Chrome offers
"Install app"; on iPhone, Safari, Share, Add to Home Screen. It opens full screen with its own icon. With no
connection it shows a "You're offline" page; nothing about clients is stored on the phone.

**Morning email** (weekdays, about 8am NZ, once email is set up). Advisers and underwriters: their follow-ups due,
renewals at risk, and those due within 7 days, sent only when there's something. Super Admins: renewals at risk,
unassigned renewals due within 14 days, people waiting for approval, and open problems. Anyone can turn it off in
their profile (their name, top right).

**Problems.** When someone hits an error in the app, it's recorded and shown on the new **System** page (repeats
are counted on one line), the Overview shows a notice, and Super Admins get one email per new problem. People see
a friendly "This page didn't load" screen with a reference to quote.

**Backup download.** System, **Download backup**: one Excel file with every renewal, user (no passwords), note,
history entry, upload and the audit log. It holds client details, so store it where only managers can open it.

## Email (Resend)

1. Sign up at resend.com (the free plan covers this).
2. Domains, Add domain: use a domain you control, e.g. `blanket.co.nz` or a sub-domain like `mail.blanket.co.nz`.
   Resend shows DNS records; whoever manages that domain's DNS adds them. Wait until it says Verified.
3. API Keys, Create API key (sending access).
4. In Vercel add `RESEND_API_KEY`, and `EMAIL_FROM` = `Renewal System <renewals@your-verified-domain>`, plus
   `APP_URL`. Redeploy. The System page should show "Emails can be sent: Set up".

## Checking your backups (do this once)

1. Supabase, your project, **Database, Backups**: check which backups your plan keeps and for how long. If it shows
   none, your plan doesn't include them; the in-app **Download backup** (weekly, say) is then your copy.
2. Test a restore once, so you know it works before you need it: create a new, empty Supabase project, restore
   the latest backup into it (or, for the Excel backup, check the file opens and the Renewals sheet is complete),
   and look at a few renewals. Then delete the test project.

## Setting up a staging copy (for testing changes before staff see them)

1. Supabase: create a second project, e.g. "Renewal System staging". Copy its connection strings.
2. GitHub (web): create a branch named `staging` from main (branch menu, type `staging`, Create branch).
3. Vercel: Add New, Project, import the same repository again, name it e.g. `renewals-staging`. In its
   Settings, Git, set the Production Branch to `staging`.
4. In the staging project's Environment Variables, set `DATABASE_URL` and `DIRECT_URL` to the staging database,
   a different `NEXTAUTH_SECRET`, `NEXTAUTH_URL` to the staging address, and `APP_ENV` = `staging`. Leave out
   `CRON_SECRET` unless you want to test reminders.
5. Deploy. Create the first admin on it with `/api/setup/seed-admin` as you did originally.
6. From then on: upload changed files to the `staging` branch first, check them on the staging address, then
   upload the same files to `main`.

The staging copy shows a brown "Staging copy" bar at the top and never sends email.

---

# Update: Google sign-in for company accounts

Staff can sign in with their company Google account. Only @blanket.co.nz and @hicactus.com Workspace accounts get
in; personal Gmail and other organisations' accounts are turned away. Once everyone has signed in with Google, a
Super Admin can turn email-and-password sign-in off.

## Set it up

### 1. Create the Google sign-in keys (about 15 minutes, no admin access needed)

Use a company Google account that will stay with the company (not a personal Gmail), so the setup isn't tied to
one person.

1. Go to console.cloud.google.com and create a project, for example "Renewal System".
2. **APIs & Services, OAuth consent screen** (also called Google Auth Platform, Branding / Audience):
   - User type: **External**. (Internal only works inside one Workspace; Blanket and Cactus are two.)
   - App name "Renewal System", your support email, and the app's address as the home page.
   - Scopes: only the basic ones (email, profile, openid). These don't need Google's review.
   - Publish the app (**In production**). While it's "Testing", only listed test users can sign in.
3. **APIs & Services, Credentials, Create credentials, OAuth client ID**:
   - Application type: **Web application**.
   - Authorised redirect URI: `https://<your-app-address>/api/auth/callback/google`
     (add your Vercel preview or staging address too if you test there).
4. Copy the **Client ID** and **Client secret**.

### 2. Add them in Vercel (Settings, Environment Variables), then redeploy

| Name | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | the Client ID |
| `GOOGLE_CLIENT_SECRET` | the Client secret |
| `ALLOWED_EMAIL_DOMAINS` | `blanket.co.nz,hicactus.com` (this is also the default) |

The "Continue with Google" button appears once both Google values are set. The database change (two columns on
User and a small settings table) runs automatically on deploy.

### 3. If Google says the app is blocked

A Workspace can be set to block apps it hasn't approved. If staff of one company see "This app is blocked" or
"Access blocked", that company's Google Workspace admin needs to allow it: Admin console, Security, API controls,
App access control, add the app by its Client ID and mark it Trusted. Nothing else on their side is needed.

## How it works

- **Who can get in:** the app accepts a Google account only when Google confirms it belongs to the blanket.co.nz
  or hicactus.com Workspace, the email is on that domain, and Google has verified it. This is checked by the app
  itself on every sign-in.
- **First sign-in:** an account is created and waits for a Super Admin's approval (Users page), just like
  registering. Role starts as Adviser; change it when approving.
- **People who already have an account:** signing in with Google links it to their existing account by email.
  Their role, renewals and history are unchanged. After that, only that Google account can sign in as them.
- **Registering with a password** (while passwords are on) now also requires a company email.
- The audit log's Sign-ins view shows the method (Google or password) and why anyone was turned away.

## Turning password sign-in off

Users page, Sign-in: shows how many active people have signed in with Google and who hasn't. When everyone has,
choose **Turn off password sign-in**. Then:
- the sign-in page shows only Continue with Google, and registering is done through Google;
- anyone still signed in with a password is signed out within a minute;
- Change password is hidden.

You can only turn it off after signing in with Google yourself, so you can't lock yourself out. It can be turned
back on from the same place.

**Emergency switch:** if Google sign-in ever stops working while passwords are off, add `PASSWORD_LOGIN_FORCE_ON`
= `true` in Vercel and redeploy. Passwords work again until you remove it.

---

# Update: deadlines, outcomes, Excel export, editing by assigned staff

## After you deploy

1. **Database change runs automatically.** The build adds new columns to `Renewal` (client contact, hand-edited
   fields, outcome, last reminder) and one index. All are optional or have defaults, so nothing is lost and nobody
   is signed out.
2. **Deadline reminders (optional, recommended).** Add an environment variable in Vercel, Settings, Environment
   Variables: `CRON_SECRET` = any long random text (at least 16 characters). Redeploy. The new `vercel.json` runs
   the reminder every morning at about 8am New Zealand time. Without `CRON_SECRET` the reminders simply don't run;
   everything else works.

## Deadlines and at risk

- Open renewals are grouped by how soon they're due: **Overdue, Today, 3 days, 7 days, 14 days, 30 days**. The
  windows don't overlap (3 days = 1 to 3 days away, 7 days = 4 to 7, 14 days = 8 to 14, 30 days = 15 to 30), so the
  numbers add up. Shown on the Overview and on My renewals; each number opens that list.
- **At risk** = still open and overdue, due within 3 days, or due within 14 days and not quoted yet. The Overview
  lists the most urgent with the reason ("Not quoted yet, due in 9 days"); the renewal page shows a warning.
- All renewals has a new **Any deadline** filter (At risk, Overdue, Today, 3 / 7 / 14 / 30 days). Dates in the
  tables show "in 5d" or "3d overdue" for anything due within 30 days.
- **Reminders:** when a renewal enters the 30, 14, 7 or 3 day window, or is due today, its adviser and underwriter
  get a notification in the bell. Each window is reminded once. Changing the renewal date starts them again.

## The real outcome

- Marking a renewal **Renewed** asks for the premium it renewed at (and the insurer, filled in with the current
  one). **Cancelled** or **Lapsed** asks why: price, moved broker, went direct, business closed, cover not needed,
  insurer declined, no response, or other (with a note). The server enforces this.
- The renewal page shows the outcome, with the change on the last invoice. The adviser or a Super Admin can
  correct it.
- The Overview has an **Outcomes** panel: share kept, renewed premium against last invoice, and why renewals were
  lost. The status filter has a new "Lost (cancelled or lapsed)" option.

## Excel export

- **Export to Excel** on All renewals and on My renewals downloads exactly the list on screen, with every filter
  (and the Target GWP multiplier, when set). Includes deadline, at-risk reason, outcome and client contact columns,
  money and date formats, and filters on the header row.
- Super Admins and Policy Service Associates can export All renewals; advisers and underwriters export their own.
  Every export is recorded in the audit log.

## Editing by the assigned adviser or underwriter

- The adviser or underwriter assigned to a renewal (and Super Admins) can now edit its details. Portfolio and type
  stay Super Admin only. Policy Service Associates and other staff can't edit.
- New **Client contact** fields: contact name, phone, email, address.
- The page says how many details are blank, and marks fields edited by hand.
- **Uploads no longer undo the team's work:** a field edited by hand is never overwritten by a later upload, and a
  blank cell in an upload never erases a value. Other fields still refresh from the file.
- History records each change with before and after values; the audit log records who edited what.

## Fixes

- CSV uploads now keep macrons and dashes (Pōhutukawa, "Works — Tasman"); they were garbled before.
- Editing a policy that has several lines with the same policy number no longer reports a false clash.

---

# Redesign, security and speed update

Every feature works as before. What changed, and what to do when you deploy.

## After you deploy

1. **Delete one file from GitHub**: `src/app/api/notifications/stream/route.ts` (the old always-on notification
   connection; the bell now checks every 45 seconds instead).
2. **Database change runs automatically.** The build adds one column, `User.sessionVersion`. Nobody is signed out.
3. **The build no longer accepts data loss.** It used to run `prisma db push --accept-data-loss` on every deploy,
   which could silently drop a column and its data. Now, if a schema change would lose data, the build stops and
   tells you, instead of deleting anything.
4. **First-admin setup** (`/api/setup/seed-admin`), only if you ever use it again: it no longer falls back to a
   default password. Set `SEED_ADMIN_EMAIL` and a `SEED_ADMIN_PASSWORD` of at least 12 characters; the new admin
   must choose their own password at first sign-in.

## Design

- New visual system: cool paper background, fine hairlines, one jade accent, IBM Plex Serif for titles and figures,
  IBM Plex Sans for text, aligned figures in every table. Full dark mode.
- A slim top bar replaces the sidebar, so the renewal tables get the full screen width. Phones get a menu sheet.
- **Month ruler**: renewals due per month with count and value, on the Overview and as a one-click month filter on
  All renewals.
- Detail page: a stage track (Assigned to Outcome), clear next-step buttons instead of a status dropdown
  (Super Admins can still correct any status), notes as a conversation, history as a timeline.
- Allocate: a sticky assignment bar; click anywhere on a row to select it.
- Upload: drag and drop, and a results summary with next steps.
- Audit log: one page with Account changes, Data changes and Sign-ins.
- Charts are now drawn directly (no charting library), with the status split shown as one bar plus a table.
- Loading screens are placeholders shaped like the page, and a thin progress line shows at the top while a page
  loads. Animations are short and CSS-only; they switch off with Settings, Reduce motion, or the device setting.

## Security

| Fix | Why |
|---|---|
| Sessions end within a minute of a password change, role change, suspension or deletion | Previously up to 5 minutes, and a password change didn't sign out other devices |
| Profile photo removed from the session cookie | A base64 image was sent with every request (also a speed fix) |
| Wrong email takes as long as a wrong password | The response time no longer reveals which emails have accounts |
| @mentions limited to people who can open the renewal | A mention used to notify (and reveal the client name to) anyone |
| Approve only works on accounts waiting for approval; suspend/approve refuse deleted accounts | Closes edge cases in user management |
| Deleting a user also clears their underwriter assignments | They were left assigned to a deleted account |
| Uploads: file type checked by name and content, 30 per hour limit | Only real spreadsheet exports are processed |
| Bulk actions capped at 1,000 renewals; notes capped at 20 mentions | Stops oversized requests |
| Change password: 10 attempts per 15 minutes | Stops password guessing from a signed-in session |
| Content Security Policy and Cross-Origin-Opener-Policy headers; no `X-Powered-By` | Blocks injected scripts and framing |
| Client IP read from Vercel's own header first | Rate limits can't be dodged with a forged header |
| Setup route: no default password, constant-time secret check | A missing env var no longer creates a guessable admin |
| Audit log now records uploads, added/deleted renewals, allocations, new users, detail changes and password changes | A fuller trail for compliance |
| Deleted users no longer listed on the Users page | They were still shown |

## Speed

- Notifications: a light check every 45 seconds while the tab is open (and straight away when you come back to it),
  instead of a connection per tab querying the database every 3 seconds. Much lower database and Vercel usage.
- Dashboards: totals and per-adviser figures are summed by the database instead of loading every renewal.
- Dashboard pages download about 54% less JavaScript (197 kB to 90 kB); the renewal page 119 kB to 95 kB.
- The session cookie is much smaller (no photo inside it).

`recharts` is no longer used and can be removed from `package.json` whenever you next update dependencies.
