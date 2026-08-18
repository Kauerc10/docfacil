export type AuthenticatedFetchUser = {
  getIdToken(forceRefresh?: boolean): Promise<string>;
};

export type AuthenticatedFetchAuth = {
  currentUser: AuthenticatedFetchUser | null;
};

export type AuthSessionErrorCode =
  | "AUTH_TOKEN_UNAVAILABLE"
  | "AUTH_SESSION_EXPIRED";

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export class AuthSessionError extends Error {
  readonly code: AuthSessionErrorCode;

  constructor(code: AuthSessionErrorCode, message: string) {
    super(message);
    this.name = "AuthSessionError";
    this.code = code;
  }
}

type AuthenticatedFetchOptions = {
  auth: AuthenticatedFetchAuth | null;
  getAppCheckToken?: () => Promise<string | null>;
  fetchImpl?: FetchLike;
  signOutUser?: () => Promise<void>;
};

async function readBackendErrorCode(response: Response): Promise<string | undefined> {
  if (response.status !== 401) return undefined;

  try {
    const payload = (await response.clone().json()) as {
      error?: { code?: unknown };
    };
    return typeof payload.error?.code === "string"
      ? payload.error.code
      : undefined;
  } catch {
    return undefined;
  }
}

function withHeader(
  init: RequestInit,
  name: string,
  value: string | null
): RequestInit {
  const headers = new Headers(init.headers);
  if (value) headers.set(name, value);
  else headers.delete(name);
  return { ...init, headers };
}

async function addAppCheckHeader(
  init: RequestInit,
  getAppCheckToken?: () => Promise<string | null>
): Promise<RequestInit> {
  if (!getAppCheckToken) return init;

  try {
    const token = await getAppCheckToken();
    return token ? withHeader(init, "X-Firebase-AppCheck", token) : init;
  } catch {
    return init;
  }
}

async function getRequiredUserToken(
  user: AuthenticatedFetchUser,
  forceRefresh: boolean
): Promise<string> {
  try {
    const token = await user.getIdToken(forceRefresh);
    if (!token) throw new Error("empty token");
    return token;
  } catch {
    throw new AuthSessionError(
      forceRefresh ? "AUTH_SESSION_EXPIRED" : "AUTH_TOKEN_UNAVAILABLE",
      forceRefresh
        ? "Sua sessão expirou. Entre novamente para continuar."
        : "Não foi possível validar sua sessão. Tente novamente."
    );
  }
}

export async function firebaseAuthenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: AuthenticatedFetchOptions
): Promise<Response> {
  const fetchImpl: FetchLike = options.fetchImpl || fetch;
  const user = options.auth?.currentUser || null;

  let requestInit = await addAppCheckHeader(init, options.getAppCheckToken);

  if (!user) {
    return fetchImpl(input, requestInit);
  }

  const initialToken = await getRequiredUserToken(user, false);
  requestInit = withHeader(
    requestInit,
    "Authorization",
    `Bearer ${initialToken}`
  );

  const firstResponse = await fetchImpl(input, requestInit);
  const firstErrorCode = await readBackendErrorCode(firstResponse);

  if (firstErrorCode !== "INVALID_AUTH_TOKEN") {
    return firstResponse;
  }

  let refreshedToken: string;
  try {
    refreshedToken = await getRequiredUserToken(user, true);
  } catch (error) {
    await options.signOutUser?.().catch(() => undefined);
    throw error;
  }

  const retryInit = withHeader(
    requestInit,
    "Authorization",
    `Bearer ${refreshedToken}`
  );
  const retryResponse = await fetchImpl(input, retryInit);
  const retryErrorCode = await readBackendErrorCode(retryResponse);

  if (retryErrorCode === "INVALID_AUTH_TOKEN") {
    await options.signOutUser?.().catch(() => undefined);
    throw new AuthSessionError(
      "AUTH_SESSION_EXPIRED",
      "Sua sessão expirou. Entre novamente para continuar."
    );
  }

  return retryResponse;
}
