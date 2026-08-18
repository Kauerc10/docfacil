import type { Metadata } from "next";
import { PasswordRecoveryForm } from "./password-recovery-form";

export const metadata: Metadata = {
  title: "Recuperar senha | DocFácil",
  description: "Recupere o acesso à sua conta do DocFácil.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <PasswordRecoveryForm />;
}
