import { describe, expect, it } from "bun:test";
import { resolvePrincipal, requireAppCheck, requireUser, type Principal } from "./security";
import { BackendError } from "./errors";
import type { Auth, DecodedIdToken } from "firebase-admin/auth";
import type { AppCheck } from "firebase-admin/app-check";

describe("security: resolvePrincipal", () => {
  it("resolves guest when Authorization header is absent", async () => {
    const req = new Request("http://localhost/api/test");
    const principal = await resolvePrincipal(req);
    expect(principal).toEqual({ type: "guest" });
  });

  it("throws INVALID_AUTH_TOKEN when Authorization header is malformed", async () => {
    const req = new Request("http://localhost/api/test", {
      headers: { Authorization: "Basic 12345" },
    });

    expect(resolvePrincipal(req)).rejects.toThrow(BackendError);
    try {
      await resolvePrincipal(req);
    } catch (err: any) {
      expect(err.code).toBe("INVALID_AUTH_TOKEN");
      expect(err.status).toBe(401);
    }
  });

  it("resolves authenticated user when token is valid", async () => {
    const mockAuth = {
      verifyIdToken: async (token: string): Promise<DecodedIdToken> => {
        if (token === "valid-token") {
          return {
            uid: "user-123",
            email: "user@example.com",
            aud: "docfacil",
            auth_time: 12345,
            exp: 12345,
            firebase: { identities: {}, sign_in_provider: "google.com" },
            iat: 12345,
            iss: "firebase",
            sub: "user-123",
          } as DecodedIdToken;
        }
        throw new Error("Invalid token");
      },
    } as unknown as Auth;

    const req = new Request("http://localhost/api/test", {
      headers: { Authorization: "Bearer valid-token" },
    });

    const principal = await resolvePrincipal(req, mockAuth);
    expect(principal).toEqual({
      type: "user",
      userId: "user-123",
      email: "user@example.com",
    });
  });

  it("throws INVALID_AUTH_TOKEN when token verification fails and does not degrade to guest", async () => {
    const mockAuth = {
      verifyIdToken: async () => {
        throw new Error("Token expired");
      },
    } as unknown as Auth;

    const req = new Request("http://localhost/api/test", {
      headers: { Authorization: "Bearer expired-token" },
    });

    expect(resolvePrincipal(req, mockAuth)).rejects.toThrow(BackendError);
    try {
      await resolvePrincipal(req, mockAuth);
    } catch (err: any) {
      expect(err.code).toBe("INVALID_AUTH_TOKEN");
      expect(err.status).toBe(401);
      // Ensure raw token is not in message
      expect(err.message).not.toContain("expired-token");
    }
  });
});

describe("security: requireUser", () => {
  it("returns user details for authenticated principal", () => {
    const principal: Principal = { type: "user", userId: "usr_1", email: "a@b.com" };
    const user = requireUser(principal);
    expect(user.userId).toBe("usr_1");
  });

  it("throws INVALID_AUTH_TOKEN for guest principal", () => {
    const principal: Principal = { type: "guest" };
    expect(() => requireUser(principal)).toThrow(BackendError);
  });
});

describe("security: requireAppCheck", () => {
  it("passes when enforcement is disabled", async () => {
    const req = new Request("http://localhost/api/test");
    await expect(requireAppCheck(req, undefined, false)).resolves.toBeUndefined();
  });

  it("throws APP_CHECK_REQUIRED when enforcement is enabled and header is missing", async () => {
    const req = new Request("http://localhost/api/test");
    try {
      await requireAppCheck(req, undefined, true);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("APP_CHECK_REQUIRED");
      expect(err.status).toBe(401);
    }
  });

  it("throws APP_CHECK_INVALID when app check token verification fails", async () => {
    const mockAppCheck = {
      verifyToken: async () => {
        throw new Error("Invalid app check");
      },
    } as unknown as AppCheck;

    const req = new Request("http://localhost/api/test", {
      headers: { "X-Firebase-AppCheck": "bad-app-check" },
    });

    try {
      await requireAppCheck(req, mockAppCheck, true);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("APP_CHECK_INVALID");
      expect(err.status).toBe(401);
      expect(err.message).not.toContain("bad-app-check");
    }
  });

  it("passes when valid app check token is provided", async () => {
    const mockAppCheck = {
      verifyToken: async (token: string) => {
        return { appId: "app-123", token };
      },
    } as unknown as AppCheck;

    const req = new Request("http://localhost/api/test", {
      headers: { "X-Firebase-AppCheck": "good-token" },
    });

    await expect(requireAppCheck(req, mockAppCheck, true)).resolves.toBeUndefined();
  });
});
