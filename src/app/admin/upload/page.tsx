import { requireSuperAdmin } from "@/lib/guards";
import UploadForm from "./UploadForm";

export default async function UploadPage() {
  await requireSuperAdmin();

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Upload renewal file</h1>
          <p className="text-sm text-slate-500">
            Upload the raw .xlsx or .csv export. Existing renewals (matched by policy number,
            renewal date, company, and book) are updated in place — assignment, status, and
            comments are never touched by a re-upload. New rows are added as Unassigned.
          </p>
        </div>
        <UploadForm />
      </main>
  );
}
