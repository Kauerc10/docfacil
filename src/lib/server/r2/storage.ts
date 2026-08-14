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

export interface ArtifactStorageConfig {
  nodeEnv: string;
  allowInMemory?: boolean;
  r2AccountId?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string;
  r2BucketName?: string;
  r2Endpoint?: string;
}

export function createArtifactStorageFromConfig(config: ArtifactStorageConfig): ArtifactStorage {
  const hasR2Creds =
    Boolean(config.r2AccountId) &&
    Boolean(config.r2AccessKeyId) &&
    Boolean(config.r2SecretAccessKey) &&
    Boolean(config.r2BucketName);

  const hasPartialR2Creds =
    (Boolean(config.r2AccountId) || Boolean(config.r2AccessKeyId) || Boolean(config.r2SecretAccessKey)) &&
    !hasR2Creds;

  if (hasPartialR2Creds) {
    throw new BackendError(
      "SERVER_MISCONFIGURED",
      500,
      "Credenciais do Cloudflare R2 incompletas no servidor."
    );
  }

  if (hasR2Creds) {
    const s3Client = new S3Client({
      region: "auto",
      endpoint: config.r2Endpoint || `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2AccessKeyId!,
        secretAccessKey: config.r2SecretAccessKey!,
      },
    });

    return new R2ArtifactStorage(s3Client, config.r2BucketName!);
  }

  if (config.nodeEnv === "test") {
    return new InMemoryArtifactStorage();
  }

  if (config.nodeEnv !== "production" && config.allowInMemory) {
    return new InMemoryArtifactStorage();
  }

  throw new BackendError(
    "SERVER_MISCONFIGURED",
    500,
    "Armazenamento de artefatos R2 não configurado."
  );
}

let artifactStorageSingleton: ArtifactStorage | null = null;

export function getArtifactStorage(): ArtifactStorage {
  if (artifactStorageSingleton) {
    return artifactStorageSingleton;
  }

  const env = getServerEnv();
  artifactStorageSingleton = createArtifactStorageFromConfig({
    nodeEnv: env.NODE_ENV,
    allowInMemory: env.ALLOW_IN_MEMORY_ARTIFACT_STORAGE,
    r2AccountId: env.R2_ACCOUNT_ID,
    r2AccessKeyId: env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: env.R2_SECRET_ACCESS_KEY,
    r2BucketName: env.R2_BUCKET_NAME,
  });

  return artifactStorageSingleton;
}

export function setArtifactStorageForTesting(storage: ArtifactStorage | null): void {
  artifactStorageSingleton = storage;
}
