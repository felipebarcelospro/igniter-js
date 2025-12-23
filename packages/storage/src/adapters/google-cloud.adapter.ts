import type Stream from "node:stream";
import { Readable } from "node:stream";
import { Storage } from "@google-cloud/storage";
import {
  IgniterStorageAdapter,
  type IgniterStoragePutOptions,
} from "./storage.adapter";

export type IgniterGoogleStorageCredentials = {
  bucket?: string;
  endpoint?: string;
  region?: string;
  /** JSON string credentials. */
  credentialsJson?: string;
  /** Base64 JSON credentials. */
  credentialsJsonBase64?: string;
};

/**
 * Google Cloud Storage adapter for `@igniter-js/storage`.
 *
 * Infrastructure-only:
 * - operates on full object keys
 * - does not implement scopes/policies/filename inference
 */
export class IgniterGoogleCloudStorageAdapter extends IgniterStorageAdapter {
  private readonly storage: Storage;
  private readonly bucket: string;

  constructor(credentials: IgniterGoogleStorageCredentials) {
    super();

    if (!credentials.bucket) {
      throw new Error("IGNITER_STORAGE_GOOGLE_BUCKET_REQUIRED");
    }

    this.bucket = credentials.bucket;
    this.storage = this.createClient(credentials);
  }

  async put(
    key: string,
    body: File | Blob | Uint8Array | ArrayBuffer | Stream.Readable,
    options: IgniterStoragePutOptions,
  ): Promise<void> {
    const objectName = this.normalizeKey(key);
    const fileRef = this.storage.bucket(this.bucket).file(objectName);

    await this.ensureBucketExists();

    const metadata = {
      contentType: options.contentType,
      cacheControl: options.cacheControl,
    };

    if (body instanceof Readable) {
      await new Promise<void>((resolve, reject) => {
        const writeStream = fileRef.createWriteStream({
          resumable: false,
          metadata,
        });

        const forwardError = async (error: unknown) => {
          writeStream.destroy();
          await fileRef.delete({ ignoreNotFound: true }).catch(() => undefined);
          reject(
            error instanceof Error
              ? error
              : new Error(`IGNITER_STORAGE_UPLOAD_FAILED: ${String(error)}`),
          );
        };

        writeStream.on("error", forwardError);
        body.on("error", forwardError);
        writeStream.on("finish", resolve);
        body.pipe(writeStream);
      });
    } else {
      const bytes = await this.toBuffer(body);
      await fileRef.save(bytes, {
        resumable: false,
        metadata,
        validation: "md5",
      });
    }

    if (options.public) {
      await fileRef.makePublic().catch(() => undefined);
    }
  }

  async delete(key: string): Promise<void> {
    const objectName = this.normalizeKey(key);
    await this.storage
      .bucket(this.bucket)
      .file(objectName)
      .delete({ ignoreNotFound: true });
  }

  async list(prefix?: string): Promise<string[]> {
    const normalizedPrefix = prefix ? this.normalizeKey(prefix) : undefined;

    const [files] = await this.storage.bucket(this.bucket).getFiles({
      prefix: normalizedPrefix,
    });

    return files.map((f) => f.name);
  }

  async exists(key: string): Promise<boolean> {
    const objectName = this.normalizeKey(key);
    const [exists] = await this.storage
      .bucket(this.bucket)
      .file(objectName)
      .exists();

    return exists;
  }

  async stream(key: string): Promise<Stream.Readable> {
    const objectName = this.normalizeKey(key);
    const fileRef = this.storage.bucket(this.bucket).file(objectName);
    const [exists] = await fileRef.exists();

    if (!exists) {
      throw new Error("IGNITER_STORAGE_FILE_NOT_FOUND");
    }

    return fileRef.createReadStream();
  }

  async copy(fromKey: string, toKey: string): Promise<void> {
    const from = this.normalizeKey(fromKey);
    const to = this.normalizeKey(toKey);

    const bucket = this.storage.bucket(this.bucket);
    await bucket.file(from).copy(bucket.file(to));
  }

  async move(fromKey: string, toKey: string): Promise<void> {
    const from = this.normalizeKey(fromKey);
    const to = this.normalizeKey(toKey);

    const bucket = this.storage.bucket(this.bucket);
    await bucket.file(from).move(bucket.file(to));
  }

  private createClient(credentials: IgniterGoogleStorageCredentials): Storage {
    // Priority:
    // 1) Inline JSON credentials
    // 2) Base64 JSON credentials
    // 3) ADC (Application Default Credentials)

    if (credentials.credentialsJson) {
      try {
        const parsed = JSON.parse(credentials.credentialsJson);
        return new Storage({ credentials: parsed });
      } catch {
        // fallthrough
      }
    }

    if (credentials.credentialsJsonBase64) {
      try {
        const json = Buffer.from(
          credentials.credentialsJsonBase64,
          "base64",
        ).toString("utf-8");
        const parsed = JSON.parse(json);
        return new Storage({ credentials: parsed });
      } catch {
        // fallthrough
      }
    }

    return new Storage();
  }

  private async ensureBucketExists(): Promise<void> {
    const bucket = this.storage.bucket(this.bucket);
    const [exists] = await bucket.exists();

    if (!exists) {
      await this.storage.createBucket(this.bucket);
    }
  }

  private async toBuffer(
    body: File | Blob | Uint8Array | ArrayBuffer,
  ): Promise<Buffer> {
    if (body instanceof Uint8Array) {
      return Buffer.from(body);
    }

    if (body instanceof ArrayBuffer) {
      return Buffer.from(body);
    }

    const arrayBuffer = await body.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

/**
 * Factory export to match the future `@igniter-js/storage/adapters` API.
 */
export const IgniterGoogleAdapter = {
  create: (credentials: IgniterGoogleStorageCredentials) =>
    new IgniterGoogleCloudStorageAdapter(credentials),
} as const;
