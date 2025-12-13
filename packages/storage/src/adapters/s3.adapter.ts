import type Stream from 'node:stream'
import { Readable } from 'node:stream'
import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { tryCatch } from '../utils/try-catch'
import { IgniterStorageAdapter, type IgniterStoragePutOptions } from './igniter-storage.adapter'

export type IgniterS3StorageCredentials = {
  endpoint?: string
  region?: string
  bucket?: string
  accessKeyId?: string
  secretAccessKey?: string
  signatureVersion?: string
}

/**
 * S3 adapter for `@igniter-js/storage`.
 *
 * Infrastructure-only:
 * - operates on full object keys
 * - does not implement scopes/policies/filename inference
 */
export class IgniterS3StorageAdapter extends IgniterStorageAdapter {
  private readonly client: S3Client
  private readonly bucket: string

  constructor(credentials: IgniterS3StorageCredentials) {
    super()

    if (!credentials.bucket) {
      throw new Error('IGNITER_STORAGE_S3_BUCKET_REQUIRED')
    }

    this.bucket = credentials.bucket

    this.client = new S3Client({
      region: credentials.region,
      endpoint: credentials.endpoint,
      forcePathStyle: true,
      tls: !credentials.endpoint?.includes('localhost'),
      credentials: {
        accessKeyId: credentials.accessKeyId || '',
        secretAccessKey: credentials.secretAccessKey || '',
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
    })
  }

  async put(
    key: string,
    body: File | Blob | Uint8Array | ArrayBuffer | Stream.Readable,
    options: IgniterStoragePutOptions,
  ): Promise<void> {
    const Key = this.normalizeKey(key)

    await this.ensureBucketExistsAndPublic()

    if (body instanceof Readable) {
      const upload = new Upload({
        client: this.client,
        queueSize: 12,
        partSize: 1024 * 1024 * 32,
        params: {
          Bucket: this.bucket,
          Key,
          Body: body,
          ContentType: options.contentType,
          CacheControl: options.cacheControl,
          ACL: options.public ? 'public-read' : undefined,
        },
      })

      const result = await tryCatch(upload.done())
      if (result.error) {
        await tryCatch(
          this.client.send(
            new DeleteObjectCommand({
              Bucket: this.bucket,
              Key,
            }),
          ),
        )

        throw result.error instanceof Error
          ? result.error
          : new Error(`IGNITER_STORAGE_UPLOAD_FAILED: ${String(result.error)}`)
      }

      return
    }

    const bytes = await this.toBuffer(body)

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key,
        Body: bytes,
        ContentType: options.contentType,
        CacheControl: options.cacheControl,
        ACL: options.public ? 'public-read' : undefined,
      }),
    )
  }

  async delete(key: string): Promise<void> {
    const Key = this.normalizeKey(key)

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key,
      }),
    )
  }

  async list(prefix?: string): Promise<string[]> {
    const Prefix = prefix ? this.normalizeKey(prefix) : undefined

    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix,
    })

    const response = await this.client.send(command)

    return (response.Contents || [])
      .map((i) => i.Key)
      .filter((k): k is string => Boolean(k))
  }

  async exists(key: string): Promise<boolean> {
    const Key = this.normalizeKey(key)

    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key,
    })

    const response = await tryCatch(this.client.send(command))

    if (response.error) {
      if (response.error instanceof Error && response.error.name === 'NotFound') {
        return false
      }

      throw response.error
    }

    return true
  }

  async stream(key: string): Promise<Stream.Readable> {
    const Key = this.normalizeKey(key)

    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key,
      }),
    )

    if (response.Body instanceof Readable) {
      return response.Body
    }

    if (response.Body && typeof response.Body === 'function') {
      return Readable.fromWeb(response.Body)
    }

    throw new Error('IGNITER_STORAGE_RESPONSE_BODY_NOT_A_STREAM')
  }

  async copy(fromKey: string, toKey: string): Promise<void> {
    const from = this.normalizeKey(fromKey)
    const to = this.normalizeKey(toKey)

    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        Key: to,
        CopySource: encodeURI(`${this.bucket}/${from}`),
        ACL: 'public-read',
      }),
    )
  }

  async move(fromKey: string, toKey: string): Promise<void> {
    await this.copy(fromKey, toKey)
    await this.delete(fromKey)
  }

  private async toBuffer(
    body: File | Blob | Uint8Array | ArrayBuffer,
  ): Promise<Buffer> {
    if (body instanceof Uint8Array) {
      return Buffer.from(body)
    }

    if (body instanceof ArrayBuffer) {
      return Buffer.from(body)
    }

    const arrayBuffer = await body.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  private async ensureBucketExistsAndPublic(): Promise<void> {
    // NOTE: This is an infra concern (not business rules). Best-effort.
    try {
      await this.client.send(
        new CreateBucketCommand({
          Bucket: this.bucket,
          ACL: 'public-read',
        }),
      )

      await this.client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucket,
          Policy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'PublicReadGetObject',
                Effect: 'Allow',
                Principal: '*',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${this.bucket}/*`],
              },
            ],
          }),
        }),
      )
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'BucketAlreadyExists' ||
          error.name === 'BucketAlreadyOwnedByYou')
      ) {
        return
      }

      // Best-effort: ignore if policy fails (some providers disallow this).
      if (error instanceof Error && error.name === 'MalformedPolicy') {
        return
      }

      // Still allow uploads; bucket might already exist.
    }
  }
}

/**
 * Factory export to match the future `@igniter-js/storage/adapters` API.
 */
export const IgniterS3Adapter = {
  create: (credentials: IgniterS3StorageCredentials) =>
    new IgniterS3StorageAdapter(credentials),
} as const
