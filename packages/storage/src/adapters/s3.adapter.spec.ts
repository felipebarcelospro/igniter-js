import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());
const uploadDoneMock = vi.hoisted(() => vi.fn());
const uploadInstances = vi.hoisted(() => [] as Array<{ options: unknown }>);
const CommandClasses = vi.hoisted(
  () =>
    ({
      CopyObjectCommand: class CopyObjectCommand {
        constructor(public input: unknown) {}
      },
      CreateBucketCommand: class CreateBucketCommand {
        constructor(public input: unknown) {}
      },
      DeleteObjectCommand: class DeleteObjectCommand {
        constructor(public input: unknown) {}
      },
      GetObjectCommand: class GetObjectCommand {
        constructor(public input: unknown) {}
      },
      HeadObjectCommand: class HeadObjectCommand {
        constructor(public input: unknown) {}
      },
      ListObjectsV2Command: class ListObjectsV2Command {
        constructor(public input: unknown) {}
      },
      PutBucketPolicyCommand: class PutBucketPolicyCommand {
        constructor(public input: unknown) {}
      },
      PutObjectCommand: class PutObjectCommand {
        constructor(public input: unknown) {}
      },
    }) as const,
);

vi.mock("@aws-sdk/client-s3", () => {
  class S3Client {
    constructor(public config: unknown) {}
    send = sendMock;
  }

  return {
    S3Client,
    ...CommandClasses,
  };
});

vi.mock("@aws-sdk/lib-storage", () => ({
  Upload: class Upload {
    options: unknown;

    constructor(options: unknown) {
      this.options = options;
      uploadInstances.push(this);
    }

    done() {
      return uploadDoneMock();
    }
  },
}));

import { IgniterS3StorageAdapter } from "./s3.adapter";

const getCommands = () => sendMock.mock.calls.map(([command]) => command);

const findCommand = (name: string) =>
  getCommands().find(
    (command) => command?.constructor?.name === name,
  ) as { input?: any } | undefined;

const createAdapter = () => new IgniterS3StorageAdapter({ bucket: "bucket" });

describe("IgniterS3StorageAdapter", () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({});
    uploadDoneMock.mockReset();
    uploadDoneMock.mockResolvedValue({});
    uploadInstances.length = 0;
  });

  it("throws when bucket is missing", () => {
    expect(() => new IgniterS3StorageAdapter({})).toThrow(
      "IGNITER_STORAGE_S3_BUCKET_REQUIRED",
    );
  });

  it("uploads via PutObjectCommand for non-stream bodies", async () => {
    const adapter = createAdapter();

    await adapter.put("/folder/file.txt", new Blob(["data"]), {
      contentType: "text/plain",
      cacheControl: "max-age=3600",
      public: true,
    });

    expect(findCommand("CreateBucketCommand")).toBeDefined();
    expect(findCommand("PutBucketPolicyCommand")).toBeDefined();

    const putCommand = findCommand("PutObjectCommand");
    expect(putCommand?.input).toMatchObject({
      Bucket: "bucket",
      Key: "folder/file.txt",
      ContentType: "text/plain",
      CacheControl: "max-age=3600",
      ACL: "public-read",
    });
  });

  it("uploads via multipart when body is a stream", async () => {
    const adapter = createAdapter();

    await adapter.put("stream.txt", Readable.from(["data"]), {
      contentType: "text/plain",
      public: true,
    });

    expect(uploadInstances).toHaveLength(1);
    const instance = uploadInstances[0] as { options: any };
    expect(instance.options).toMatchObject({
      queueSize: 12,
      partSize: 1024 * 1024 * 32,
      params: {
        Bucket: "bucket",
        Key: "stream.txt",
        ContentType: "text/plain",
        ACL: "public-read",
      },
    });

    expect(findCommand("PutObjectCommand")).toBeUndefined();
  });

  it("deletes the object when multipart upload fails", async () => {
    const adapter = createAdapter();
    uploadDoneMock.mockRejectedValueOnce(new Error("boom"));

    await expect(
      adapter.put("stream.txt", Readable.from(["data"]), {
        contentType: "text/plain",
      }),
    ).rejects.toThrow("boom");

    expect(findCommand("DeleteObjectCommand")).toBeDefined();
  });

  it("lists objects by prefix", async () => {
    const adapter = createAdapter();
    sendMock.mockResolvedValueOnce({
      Contents: [{ Key: "a/file.txt" }, { Key: undefined }],
    });

    const files = await adapter.list("/a");

    expect(files).toEqual(["a/file.txt"]);
    const listCommand = findCommand("ListObjectsV2Command");
    expect(listCommand?.input).toMatchObject({
      Bucket: "bucket",
      Prefix: "a",
    });
  });

  it("returns false when head returns NotFound", async () => {
    const adapter = createAdapter();
    const notFound = Object.assign(new Error("not found"), { name: "NotFound" });
    sendMock.mockRejectedValueOnce(notFound);

    await expect(adapter.exists("missing.txt")).resolves.toBe(false);
  });

  it("returns a readable stream from GetObjectCommand", async () => {
    const adapter = createAdapter();
    const body = Readable.from(["data"]);
    sendMock.mockResolvedValueOnce({ Body: body });

    const stream = await adapter.stream("file.txt");

    expect(stream).toBe(body);
  });

  it("copies and moves objects using CopyObjectCommand", async () => {
    const adapter = createAdapter();

    await adapter.copy("/from.txt", "/to.txt");
    const copyCommand = findCommand("CopyObjectCommand");
    expect(copyCommand?.input).toMatchObject({
      Bucket: "bucket",
      Key: "to.txt",
      CopySource: encodeURI("bucket/from.txt"),
      ACL: "public-read",
    });

    await adapter.move("move-from.txt", "move-to.txt");
    const deleteCommand = findCommand("DeleteObjectCommand");
    expect(deleteCommand?.input).toMatchObject({
      Bucket: "bucket",
      Key: "move-from.txt",
    });
  });
});
