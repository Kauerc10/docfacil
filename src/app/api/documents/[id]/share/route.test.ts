import { describe, expect, it, beforeEach } from "bun:test";
import { POST as shareRoute } from "./route";
import { POST as revokeRoute } from "./revoke/route";
import { getRepositories } from "@/lib/server/firestore/repositories";
import { setAdminAuthForTesting } from "@/lib/server/firebase-admin";

describe("Document Sharing & Revocation APIs", () => {
  const repos = getRepositories();

  beforeEach(() => {
    setAdminAuthForTesting(null);
  });

  it("creates opt-in share link fixed on current version and revokes it cleanly", async () => {
    const doc = await repos.documents.createDocument({
      owner: { type: "user", userId: "usr_share_owner" },
      modeloSlug: "declaracao-residencia",
      modeloNome: "Declaração de Residência",
      respostas: {},
      entitlement: { type: "pro", watermarked: false },
      artifactState: "ready",
      currentVersion: 2,
      targetVersion: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    setAdminAuthForTesting({
      verifyIdToken: async () => ({ uid: "usr_share_owner" } as any),
    } as any);

    // 1. Share
    const shareReq = new Request(`http://localhost:3000/api/documents/${doc.id}/share`, {
      method: "POST",
      headers: {
        Authorization: "Bearer auth-token",
      },
    });

    const shareRes = await shareRoute(shareReq, {
      params: Promise.resolve({ id: doc.id! }),
    });

    expect(shareRes.status).toBe(200);
    const shareData = await shareRes.json();
    expect(shareData.shareUrl).toBeDefined();
    expect(shareData.token).toBeDefined();
    expect(shareData.version).toBe(2);
    expect(shareData.active).toBe(true);

    // 2. Revoke
    const revokeReq = new Request(
      `http://localhost:3000/api/documents/${doc.id}/share/revoke`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer auth-token",
        },
      }
    );

    const revokeRes = await revokeRoute(revokeReq, {
      params: Promise.resolve({ id: doc.id! }),
    });

    expect(revokeRes.status).toBe(200);
    const revokeData = await revokeRes.json();
    expect(revokeData.success).toBe(true);
  });
});
