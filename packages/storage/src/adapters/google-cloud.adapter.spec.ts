import { PassThrough, Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storageState = vi.hoisted(() => ({
  instances: [] as Array<{ options: unknown }>,
  fileMocks: new Map<string, any>(),
  createBucketMock: vi.fn(),
  bucketMock: {
    file: vi.fn(),
    exists: vi.fn(),
    getFiles: vi.fn(),
  },
}));

const createFileMock = (name: string) => ({
  name,
  save: vi.fn(),
  delete: vi.fn(),
  exists: vi.fn(),
  createReadStream: vi.fn(),
  createWriteStream: vi.fn(),
  makePublic: vi.fn().mockResolvedValue(undefined),
  copy: vi.fn(),
  move: vi.fn(),
});

vi.mock("@google-cloud/storage", () => {
  class Storage {
    constructor(public options: unknown = undefined) {
      storageState.instances.push({ options });
    }

    bucket = vi.fn(() => storageState.bucketMock);
    createBucket = storageState.createBucketMock;
  }

  return { Storage };
});

import { IgniterGoogleCloudStorageAdapter } from "./google-cloud.adapter";

const createAdapter = (overrides?: {
  credentialsJson?: string;
  credentialsJsonBase64?: string;
}) =>
  new IgniterGoogleCloudStorageAdapter({
    bucket: "bucket",
    ...overrides,
  });

describe("IgniterGoogleCloudStorageAdapter", () => {
  beforeEach(() => {
    storageState.instances.length = 0;
    storageState.fileMocks.clear();
    storageState.bucketMock.file.mockReset();
    storageState.bucketMock.exists.mockReset();
    storageState.bucketMock.getFiles.mockReset();
    storageState.createBucketMock.mockReset();

    storageState.bucketMock.file.mockImplementation((name: string) => {
      if (!storageState.fileMocks.has(name)) {
        const file = createFileMock(name);
        file.exists.mockResolvedValue([true]);
        file.createReadStream.mockReturnValue(new PassThrough());
        file.createWriteStream.mockImplementation(() => new PassThrough());
        storageState.fileMocks.set(name, file);
      }
      return storageState.fileMocks.get(name);
    });

    storageState.bucketMock.exists.mockResolvedValue([true]);
    storageState.bucketMock.getFiles.mockResolvedValue([[]]);
    storageState.createBucketMock.mockResolvedValue(undefined);
  });

  it("throws when bucket is missing", () => {
    expect(() => new IgniterGoogleCloudStorageAdapter({})).toThrow(
      "IGNITER_STORAGE_GOOGLE_BUCKET_REQUIRED",
    );
  });

  it("uses inline JSON credentials when provided", () => {
    const json = JSON.stringify({ client_email: "test@example.com" });
    createAdapter({ credentialsJson: json });

    expect(storageState.instances[0]?.options).toEqual({
      credentials: { client_email: "test@example.com" },
    });
  });

  it("uploads buffers with metadata and public ACL", async () => {
    const adapter = createAdapter();

    await adapter.put("/folder/file.txt", new Uint8Array([1, 2, 3]), {
      contentType: "text/plain",
      cacheControl: "max-age=3600",
      public: true,
    });

    const file = storageState.fileMocks.get("folder/file.txt");
    expect(file.save).toHaveBeenCalledTimes(1);
    const [bytes, options] = file.save.mock.calls[0];
    expect(Buffer.isBuffer(bytes)).toBe(true);
    expect(options).toMatchObject({
      resumable: false,
      validation: "md5",
      metadata: {
        contentType: "text/plain",
        cacheControl: "max-age=3600",
      },
    });
    expect(file.makePublic).toHaveBeenCalledTimes(1);
  });

  it("streams uploads when body is a Readable", async () => {
    const adapter = createAdapter();

    await adapter.put("stream.txt", Readable.from(["data"]), {
      contentType: "text/plain",
    });

    const file = storageState.fileMocks.get("stream.txt");
    expect(file.createWriteStream).toHaveBeenCalledWith({
      resumable: false,
      metadata: {
        contentType: "text/plain",
        cacheControl: undefined,
      },
    });
    expect(file.save).not.toHaveBeenCalled();
  });

  it("lists objects by prefix", async () => {
    const adapter = createAdapter();
    storageState.bucketMock.getFiles.mockResolvedValueOnce([
      [{ name: "a/file.txt" }],
    ]);

    const files = await adapter.list("/a");

    expect(files).toEqual(["a/file.txt"]);
    expect(storageState.bucketMock.getFiles).toHaveBeenCalledWith({
      prefix: "a",
    });
  });

  it("deletes objects with ignoreNotFound enabled", async () => {
    const adapter = createAdapter();
    const file = storageState.bucketMock.file("delete.txt");

    await adapter.delete("delete.txt");

    expect(file.delete).toHaveBeenCalledWith({ ignoreNotFound: true });
  });

  it("checks object existence via storage API", async () => {
    const adapter = createAdapter();
    const file = storageState.bucketMock.file("exists.txt");
    file.exists.mockResolvedValue([true]);

    await expect(adapter.exists("exists.txt")).resolves.toBe(true);
  });

  it("throws when streaming a missing file", async () => {
    const adapter = createAdapter();
    const file = storageState.bucketMock.file("missing.txt");
    file.exists.mockResolvedValue([false]);

    await expect(adapter.stream("missing.txt")).rejects.toThrow(
      "IGNITER_STORAGE_FILE_NOT_FOUND",
    );
  });

  it("returns a readable stream for existing files", async () => {
    const adapter = createAdapter();
    const stream = new PassThrough();
    const file = storageState.bucketMock.file("readme.txt");
    file.exists.mockResolvedValue([true]);
    file.createReadStream.mockReturnValue(stream);

    const result = await adapter.stream("readme.txt");

    expect(result).toBe(stream);
  });

  it("copies and moves objects within the bucket", async () => {
    const adapter = createAdapter();

    await adapter.copy("from.txt", "to.txt");
    const fromFile = storageState.bucketMock.file("from.txt");
    const toFile = storageState.bucketMock.file("to.txt");
    expect(fromFile.copy).toHaveBeenCalledWith(toFile);

    await adapter.move("move-from.txt", "move-to.txt");
    const moveFrom = storageState.bucketMock.file("move-from.txt");
    const moveTo = storageState.bucketMock.file("move-to.txt");
    expect(moveFrom.move).toHaveBeenCalledWith(moveTo);
  });
});
