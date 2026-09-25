import "server-only";
import { requireAppCheck, requireUser, resolvePrincipal } from "@/lib/server/security";
import { assertPilotUser } from "./session-store";

export async function requireAIPilot(req: Request): Promise<string> {
  await requireAppCheck(req, undefined, true);
  const user = requireUser(await resolvePrincipal(req));
  assertPilotUser(user.userId);
  return user.userId;
}
