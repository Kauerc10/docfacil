import type { Metadata } from "next";
import { parsePasswordResetAction } from "@/lib/auth/password-reset-action";
import { PasswordResetForm } from "./password-reset-form";

export const metadata: Metadata = {
  title: "Redefinir senha | DocFácil",
  description: "Crie uma nova senha para sua conta do DocFácil.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function toQueryString(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    } else if (value !== undefined) {
      query.set(key, value);
    }
  }

  return query.toString();
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const action = parsePasswordResetAction(toQueryString(params));

  return <PasswordResetForm code={action?.code ?? null} />;
}
