import { allowedDomains, googleConfigured, passwordLoginEnabled } from "@/lib/signInMethods";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <LoginForm
      google={googleConfigured()}
      password={await passwordLoginEnabled()}
      domains={allowedDomains()}
      errorCode={typeof searchParams.error === "string" ? searchParams.error.slice(0, 40) : undefined}
    />
  );
}
