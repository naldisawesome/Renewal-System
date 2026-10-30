import { allowedDomains, googleConfigured, passwordLoginEnabled } from "@/lib/signInMethods";
import RegisterForm from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  return <RegisterForm google={googleConfigured()} password={await passwordLoginEnabled()} domains={allowedDomains()} />;
}
