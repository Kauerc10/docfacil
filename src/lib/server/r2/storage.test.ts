import { describe, expect, it } from "bun:test";
import {
  buildArtifactObjectKey,
  InMemoryArtifactStorage,
  R2ArtifactStorage,
} from "./storage";
import { BackendError } from "../errors";
import { createHash } from "crypto";
import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

describe("buildArtifactObjectKey", () => {
  it("formats object key consistently with versioning", () => {
    const key = buildArtifactObjectKey("doc_abc123", 1);
    expect(key).toBe("documents/doc_abc123/v1/document.pdf");

    const keyV2 = buildArtifactObjectKey("doc_abc123", 2);
    expect(keyV2).toBe("documents/doc_abc123/v2/document.pdf");
  });
});

describe("InMemoryArtifactStorage", () => {
  it("stores artifacts, calculates SHA256 and size, and provides download url", async () => {
    const storage = new InMemoryArtifactStorage();
    const content = Buffer.from("%PDF-1.4 test file content");
    const expectedSha256 = createHash("sha256").update(content).digest("hex");

    const result = await storage.putArtifact({
      documentId: "doc_test1",
      version: 1,
      pdfBuffer: content,
      filename: "declaracao-residencia.pdf",
    });

    expect(result.objectKey).toBe("documents/doc_test1/v1/document.pdf");
    expect(result.sha256).toBe(expectedSha256);
    expect(result.sizeBytes).toBe(content.length);

    const url = await storage.getDownloadUrl({
      objectKey: result.objectKey,
      filename: "declaracao-residencia.pdf",
      expiresInSeconds: 300,
    });

    expect(decodeURIComponent(url)).toContain("documents/doc_test1/v1/document.pdf");
    expect(url).toContain("expires=300");

    // Test deletion
    await storage.deleteDocumentArtifacts("doc_test1");
    expect(storage.hasObject(result.objectKey)).toBe(false);
  });
});

describe("R2ArtifactStorage mock S3Client", () => {
  it("sends PutObject with private cache-control and application/pdf", async () => {
    let sentCommand: any = null;
    const mockS3 = {
      send: async (command: any) => {
        sentCommand = command;
        return {};
      },
    };

    const storage = new R2ArtifactStorage(
      mockS3 as any,
      "docfacil-pdfs",
      async (_client, command, options) => {
        return `https://signed.r2.cloudflarestorage.com/${(command as any).input.Key}?exp=${options?.expiresIn}`;
      }
    );

    const content = Buffer.from("%PDF-1.4 test");
    const res = await storage.putArtifact({
      documentId: "doc_999",
      version: 1,
      pdfBuffer: content,
      filename: "contrato.pdf",
    });

    expect(res.objectKey).toBe("documents/doc_999/v1/document.pdf");
    expect(sentCommand).toBeDefined();
    expect(sentCommand.input.Bucket).toBe("docfacil-pdfs");
    expect(sentCommand.input.Key).toBe("documents/doc_999/v1/document.pdf");
    expect(sentCommand.input.ContentType).toBe("application/pdf");
    expect(sentCommand.input.CacheControl).toBe("private, no-store, max-age=0");
    expect(sentCommand.input.ContentDisposition).toContain('filename="contrato.pdf"');

    const downloadUrl = await storage.getDownloadUrl({
      objectKey: res.objectKey,
      filename: "contrato.pdf",
    });
    expect(downloadUrl).toContain("documents/doc_999/v1/document.pdf");
    expect(downloadUrl).toContain("exp=300");
  });

  it("maps S3 upload errors to BackendError with code R2_UPLOAD_FAILED", async () => {
    const failingS3 = {
      send: async () => {
        throw new Error("Network timeout to Cloudflare");
      },
    };

    const storage = new R2ArtifactStorage(failingS3 as any, "docfacil-pdfs");
    const content = Buffer.from("%PDF-1.4");

    try {
      await storage.putArtifact({
        documentId: "doc_err",
        version: 1,
        pdfBuffer: content,
        filename: "test.pdf",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(BackendError);
      expect(err.code).toBe("R2_UPLOAD_FAILED");
      expect(err.status).toBe(500);
    }
  });

  it("deletes every artifact page returned by R2", async () => {
    const continuationTokens: Array<string | undefined> = [];
    const deletedKeys: string[][] = [];
    const mockS3 = {
      send: async (command: unknown) => {
        if (command instanceof ListObjectsV2Command) {
          const token = command.input.ContinuationToken;
          continuationTokens.push(token);
          if (!token) {
            return {
              Contents: [
                { Key: "documents/doc_paged/v1/document.pdf" },
                { Key: "documents/doc_paged/v2/document.pdf" },
              ],
              IsTruncated: true,
              NextContinuationToken: "page-2",
            };
          }
          return {
            Contents: [{ Key: "documents/doc_paged/v1001/document.pdf" }],
            IsTruncated: false,
          };
        }
        if (command instanceof DeleteObjectsCommand) {
          deletedKeys.push(
            command.input.Delete?.Objects?.map((object) => object.Key!).filter(Boolean) || []
          );
          return {};
        }
        throw new Error("Unexpected R2 command");
      },
    };
    const storage = new R2ArtifactStorage(mockS3 as any, "docfacil-pdfs");

    await storage.deleteDocumentArtifacts("doc_paged");

    expect(continuationTokens).toEqual([undefined, "page-2"]);
    expect(deletedKeys).toEqual([
      ["documents/doc_paged/v1/document.pdf", "documents/doc_paged/v2/document.pdf"],
      ["documents/doc_paged/v1001/document.pdf"],
    ]);
  });
});
