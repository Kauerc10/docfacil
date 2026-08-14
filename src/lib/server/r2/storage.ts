import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash } from "crypto";
import { getServerEnv } from "../env";
import { BackendError } from "../errors";

export interface PutArtifactParams {
  documentId: string;
  version: number;
  pdfBuffer: Buffer | Uint8Array;
  filename: string;
}

export interface PutArtifactResult {
  objectKey: string;
  sha256: string;
  sizeBytes: number;
}

export interface GetDownloadUrlParams {
  objectKey: string;
  filename: string;
  expiresInSeconds?: number;
}

export interface ArtifactStorage {
  putArtifact(params: PutArtifactParams): Promise<PutArtifactResult>;
  getDownloadUrl(params: GetDownloadUrlParams): Promise<string>;
  deleteArtifact(objectKey: string): Promise<void>;
  deleteDocumentArtifacts(documentId: string): Promise<void>;
}

export function buildArtifactObjectKey(documentId: string, version: number): string {
  return `documents/${documentId}/v${version}/document.pdf`;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/["\r\n\\]/g, "_").trim() || "documento.pdf";
}

type PresignerFn = (
  client: S3Client,
  command: GetObjectCommand,
  options?: { expiresIn?: number }
) => Promise<string>;

export class R2ArtifactStorage implements ArtifactStorage {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly presigner: PresignerFn;

  constructor(
    s3Client: S3Client,
    bucketName: string,
    presigner: PresignerFn = getSignedUrl
  ) {
    this.s3Client = s3Client;
    this.bucketName = bucketName;
    this.presigner = presigner;
  }

  public async putArtifact(params: PutArtifactParams): Promise<PutArtifactResult> {
    const objectKey = buildArtifactObjectKey(params.documentId, params.version);
    const buffer = Buffer.isBuffer(params.pdfBuffer)
      ? params.pdfBuffer
      : Buffer.from(params.pdfBuffer);

    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const sizeBytes = buffer.length;
    const cleanFilename = sanitizeFilename(params.filename);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
        Body: buffer,
        ContentType: "application/pdf",
        ContentLength: sizeBytes,
        CacheControl: "private, no-store, max-age=0",
        ContentDisposition: `attachment; filename="${cleanFilename}"`,
      });

      await this.s3Client.send(command);

      return {
        objectKey,
        sha256,
        sizeBytes,
      };
    } catch {
      throw new BackendError(
        "R2_UPLOAD_FAILED",
        500,
        "Falha ao persistir o arquivo PDF no armazenamento de artefatos."
      );
    }
  }

  public async getDownloadUrl(params: GetDownloadUrlParams): Promise<string> {
    const cleanFilename = sanitizeFilename(params.filename);
    const expiresIn = params.expiresInSeconds ?? 300;

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: params.objectKey,
        ResponseContentType: "application/pdf",
        ResponseContentDisposition: `attachment; filename="${cleanFilename}"`,
        ResponseCacheControl: "private, no-store, max-age=0",
      });

      return await this.presigner(this.s3Client, command, { expiresIn });
    } catch {
      throw new BackendError(
        "R2_SIGN_FAILED",
        500,
        "Falha ao gerar link de download assinado do documento."
      );
    }
  }

  public async deleteArtifact(objectKey: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      });
      await this.s3Client.send(command);
    } catch {
      // Ignora erro se não existir ou loga
    }
  }

  public async deleteDocumentArtifacts(documentId: string): Promise<void> {
    const prefix = `documents/${documentId}/`;
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const listed = await this.s3Client.send(listCommand);
      if (!listed.Contents || listed.Contents.length === 0) {
        return;
      }

      const objectsToDelete = listed.Contents.map((obj) => ({ Key: obj.Key }));
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: { Objects: objectsToDelete },
      });

      await this.s3Client.send(deleteCommand);
    } catch {
      // Best effort deletion
    }
  }
}

export class InMemoryArtifactStorage implements ArtifactStorage {
  private readonly storage = new Map<string, { buffer: Buffer; filename: string }>();

  public async putArtifact(params: PutArtifactParams): Promise<PutArtifactResult> {
    const objectKey = buildArtifactObjectKey(params.documentId, params.version);
    const buffer = Buffer.isBuffer(params.pdfBuffer)
      ? params.pdfBuffer
      : Buffer.from(params.pdfBuffer);

    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const sizeBytes = buffer.length;

    this.storage.set(objectKey, {
      buffer,
      filename: sanitizeFilename(params.filename),
    });

    return {
      objectKey,
      sha256,
      sizeBytes,
    };
  }

  public async getDownloadUrl(params: GetDownloadUrlParams): Promise<string> {
    const cleanFilename = sanitizeFilename(params.filename);
    const expiresIn = params.expiresInSeconds ?? 300;
    const encodedKey = encodeURIComponent(params.objectKey);
    const encodedFilename = encodeURIComponent(cleanFilename);

    return `https://fake-r2.local/download?key=${encodedKey}&filename=${encodedFilename}&expires=${expiresIn}`;
  }

  public async deleteArtifact(objectKey: string): Promise<void> {
    this.storage.delete(objectKey);
  }

  public async deleteDocumentArtifacts(documentId: string): Promise<void> {
    const prefix = `documents/${documentId}/`;
    for (const key of Array.from(this.storage.keys())) {
      if (key.startsWith(prefix)) {
        this.storage.delete(key);
      }
    }
  }

  public hasObject(objectKey: string): boolean {
    return this.storage.has(objectKey);
  }

  public getObject(objectKey: string): Buffer | undefined {
    return this.storage.get(objectKey)?.buffer;
  }
}

let artifactStorageSingleton: ArtifactStorage | null = null;

export function getArtifactStorage(): ArtifactStorage {
  if (artifactStorageSingleton) {
    return artifactStorageSingleton;
  }

  const env = getServerEnv();

  if (
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY
  ) {
    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });

    artifactStorageSingleton = new R2ArtifactStorage(s3Client, env.R2_BUCKET_NAME);
  } else {
    artifactStorageSingleton = new InMemoryArtifactStorage();
  }

  return artifactStorageSingleton;
}
