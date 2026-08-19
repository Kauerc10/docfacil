import { signOut } from "firebase/auth";
import { auth, getClientAppCheckToken } from "@/lib/firebase";
import { firebaseAuthenticatedFetch } from "./authenticated-fetch";

/**
 * Cliente único para chamadas do browser às APIs do DocFácil.
 *
 * Se existe usuário Firebase autenticado, a request nunca é rebaixada
 * silenciosamente para guest por falha de ID token. Um 401 por token inválido
 * força uma única renovação e uma única repetição da request.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const clientAuth = auth;

  return firebaseAuthenticatedFetch(input, init, {
    auth: clientAuth,
    getAppCheckToken: getClientAppCheckToken,
    signOutUser: clientAuth ? () => signOut(clientAuth) : undefined,
  });
}
