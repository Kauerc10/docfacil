import { describe, expect, it } from "bun:test";
import { createArtifactStorageFromConfig, InMemoryArtifactStorage, R2ArtifactStorage } from "@/lib/server/r2/storage";
import { BackendError } from "@/lib/server/errors";

describe("R2 Artifact Storage Configuration & Fail-Closed Behavior", () => {
  it("fails closed in production when R2 credentials are missing", () => {
    expect(() =>
      createArtifactStorageFromConfig({
        nodeEnv: "production",
        allowInMemory: true, // must be ignored in production
      })
    ).toThrow(BackendError);
  });

  it("fails closed in development when allowInMemory is false and credentials are missing", () => {
    expect(() =>
      createArtifactStorageFromConfig({
        nodeEnv: "development",
        allowInMemory: false,
      })
    ).toThrow(BackendError);
  });

  it("allows InMemoryArtifactStorage in development only when allowInMemory is true", () => {
    const storage = createArtifactStorageFromConfig({
      nodeEnv: "development",
      allowInMemory: true,
    });
    expect(storage).toBeInstanceOf(InMemoryArtifactStorage);
  });

  it("creates R2ArtifactStorage when complete credentials are provided", () => {
    const storage = createArtifactStorageFromConfig({
      nodeEnv: "production",
      r2AccountId: "acc123",
      r2AccessKeyId: "key123",
      r2SecretAccessKey: "secret123",
      r2BucketName: "docfacil-pdfs",
    });
    expect(storage).toBeInstanceOf(R2ArtifactStorage);
  });

  it("fails closed when R2 credentials are only partial", () => {
    expect(() =>
      createArtifactStorageFromConfig({
        nodeEnv: "development",
        allowInMemory: true,
        r2AccountId: "acc123",
        r2AccessKeyId: "key123",
        // secret missing
      })
    ).toThrow(BackendError);
  });
});
