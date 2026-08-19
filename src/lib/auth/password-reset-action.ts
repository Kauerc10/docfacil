export function parsePasswordResetAction(
  search: string
): { code: string } | null {
  const params = new URLSearchParams(search);
  if (params.get("mode") !== "resetPassword") return null;

  const code = params.get("oobCode")?.trim();
  return code ? { code } : null;
}
