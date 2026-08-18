import type { Metadata } from "next";
import { PasswordResetForm } from "./password-reset-form";

export const metadata: Metadata = {
  title: "Redefinir senha | DocFácil",
  description: "Crie uma nova senha para sua conta do DocFácil.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <PasswordResetForm />;
}
