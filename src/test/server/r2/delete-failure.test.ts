import { describe, expect, it } from "bun:test";
import { R2ArtifactStorage } from "@/lib/server/r2/storage";
import { BackendError } from "@/lib/server/errors";

describe("R2 Delete Error Handling and Consistency", () => {
  it("deleteArtifact throws BackendError with code R2_DELETE_FAILED when S3 send fails", async () => {
    const failingS3Client = {
      send: async () => {
        throw new Error("Cloudflare R2 service unavailable");
      },
    } as any;

    const storage = new R2ArtifactStorage(failingS3Client, "test-bucket");

    let thrownError: any = null;
    try {
      await storage.deleteArtifact("documents/doc_123/v1/document.pdf");
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(BackendError);
    expect(thrownError?.code).toBe("R2_DELETE_FAILED");
    expect(thrownError?.status).toBe(500);
  });

  it("deleteDocumentArtifacts throws BackendError when S3 listing/deletion fails", async () => {
    const failingS3Client = {
      send: async () => {
        throw new Error("Network timeout contacting R2");
      },
    } as any;

    const storage = new R2ArtifactStorage(failingS3Client, "test-bucket");

    let thrownError: any = null;
    try {
      await storage.deleteDocumentArtifacts("doc_123");
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(BackendError);
    expect(thrownError?.code).toBe("R2_DELETE_FAILED");
  });
});
