import { describe, expect, it, vi } from "vitest";
import { IgniterStorageBuilder } from "../builders/main.builder";
import { MockStorageAdapter } from "../adapters/mock.adapter";
import { IgniterStorageTelemetryEvents } from "../telemetry/index";

describe("IgniterStorage (Comprehensive Suite)", () => {
  const mockAdapter = new MockStorageAdapter();
  const BASE_URL = "https://cdn.example.com";

  const createTelemetryStorage = () => {
    const telemetry = { emit: vi.fn() };
    const adapter = new MockStorageAdapter();
    const storage = IgniterStorageBuilder.create()
      .withAdapter(adapter)
      .withUrl(BASE_URL)
      .withTelemetry(telemetry as any)
      .build();

    return { adapter, storage, telemetry };
  };

  const findEmitPayload = (
    telemetry: { emit: ReturnType<typeof vi.fn> },
    event: string,
    position: "first" | "last" = "last",
  ) => {
    const calls = telemetry.emit.mock.calls.filter(([key]) => key === event);
    expect(calls.length).toBeGreaterThan(0);
    const call = position === "first" ? calls[0] : calls[calls.length - 1];
    return call?.[1] as { level: string; attributes: Record<string, unknown> };
  };

  describe("File Operations (Manager Logic)", () => {
    const storage = IgniterStorageBuilder.create()
      .withAdapter(mockAdapter)
      .withUrl(BASE_URL)
      .build();

    it("upload() should store file and emit telemetry", async () => {
      const blob = new Blob(["hello"], { type: "text/plain" });
      const file = await storage.upload(blob, "hello.txt");

      expect(file.path).toBe("hello.txt");
      expect(file.url).toBe(`${BASE_URL}/hello.txt`);
      expect(mockAdapter.files.has("hello.txt")).toBe(true);
    });

    it("upload() should infer extension from mime type if missing", async () => {
      const blob = new Blob(["img"], { type: "image/png" });
      const file = await storage.upload(blob, "avatar");

      expect(file.path).toBe("avatar.png");
      expect(file.extension).toBe("png");
    });

    it("delete() should remove file from adapter", async () => {
      mockAdapter.files.set("to-delete.txt", {
        body: "...",
        options: { contentType: "text/plain" },
      });
      await storage.delete("to-delete.txt");
      expect(mockAdapter.files.has("to-delete.txt")).toBe(false);
    });

    it("copy() should create a new file", async () => {
      mockAdapter.files.set("source.txt", {
        body: "data",
        options: { contentType: "text/plain" },
      });
      await storage.copy("source.txt", "dest.txt");
      expect(mockAdapter.files.has("dest.txt")).toBe(true);
      expect(mockAdapter.files.get("dest.txt")?.body).toBe("data");
    });

    it("move() should copy and delete", async () => {
      mockAdapter.files.set("old.txt", {
        body: "old",
        options: { contentType: "text/plain" },
      });
      await storage.move("old.txt", "new.txt");
      expect(mockAdapter.files.has("new.txt")).toBe(true);
      expect(mockAdapter.files.has("old.txt")).toBe(false);
    });

    it("uploadFromBuffer() should work correctly", async () => {
      const buf = Buffer.from("buffer data");
      const file = await storage.uploadFromBuffer(buf, "buf.txt", {
        contentType: "text/plain",
      });
      expect(file.path).toBe("buf.txt");
      expect(mockAdapter.files.get("buf.txt")?.body).toBeInstanceOf(Blob);
    });

    it("uploadFromUrl() should fetch and store file", async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers({ "content-type": "image/jpeg" }),
        arrayBuffer: async () => new ArrayBuffer(8),
      };

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

      const file = await storage.uploadFromUrl(
        "https://source.com/img.jpg",
        "dest.jpg",
      );

      expect(file.path).toBe("dest.jpg");
      expect(file.contentType).toBe("image/jpeg");
      expect(mockAdapter.files.has("dest.jpg")).toBe(true);

      vi.unstubAllGlobals();
    });
  });

  describe("Replace Strategies", () => {
    const storage = IgniterStorageBuilder.create()
      .withAdapter(mockAdapter)
      .withUrl(BASE_URL)
      .build();

    it("BY_FILENAME should delete files with same basename but different extensions", async () => {
      mockAdapter.clear();
      mockAdapter.files.set("photo.jpg", {
        body: "",
        options: { contentType: "" },
      });
      mockAdapter.files.set("photo.png", {
        body: "",
        options: { contentType: "" },
      });

      const blob = new Blob(["new"], { type: "image/webp" });
      await storage.upload(blob, "photo.webp", { replace: "BY_FILENAME" });

      expect(mockAdapter.files.has("photo.webp")).toBe(true);
      expect(mockAdapter.files.has("photo.jpg")).toBe(false);
      expect(mockAdapter.files.has("photo.png")).toBe(false);
    });
  });

  describe("Hooks Execution", () => {
    it("should call onUploadStarted and onUploadSuccess", async () => {
      const onStart = vi.fn();
      const onSuccess = vi.fn();

      const storage = IgniterStorageBuilder.create()
        .withAdapter(mockAdapter)
        .withUrl(BASE_URL)
        .onUploadStarted(onStart)
        .onUploadSuccess(onSuccess)
        .build();

      await storage.upload(new Blob([""]), "hook.txt");

      expect(onStart).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe("Telemetry", () => {
    describe("telemetry.get", () => {
      it("emits get.started", async () => {
        const { storage, telemetry } = createTelemetryStorage();

        await storage.get("missing.txt");

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("get.started"),
          "first",
        );
        expect(payload).toMatchObject({
          level: "debug",
          attributes: {
            "storage.path": "missing.txt",
          },
        });
      });

      it("emits get.success", async () => {
        const { storage, telemetry, adapter } = createTelemetryStorage();
        adapter.files.set("exists.txt", {
          body: "data",
          options: { contentType: "text/plain" },
        });

        await storage.get("exists.txt");

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("get.success"),
        );
        expect(payload.level).toBe("info");
        expect(payload.attributes).toMatchObject({
          "storage.path": "exists.txt",
          "storage.found": true,
        });
        expect(payload.attributes["storage.duration_ms"]).toEqual(
          expect.any(Number),
        );
      });

      it("emits get.error", async () => {
        const { storage, telemetry, adapter } = createTelemetryStorage();
        vi.spyOn(adapter, "exists").mockRejectedValueOnce(new Error("boom"));

        await expect(storage.get("fail.txt")).rejects.toThrow();

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("get.error"),
        );
        expect(payload.level).toBe("error");
        expect(payload.attributes).toMatchObject({
          "storage.path": "fail.txt",
          "storage.error.message": "boom",
        });
      });
    });

    describe("telemetry.delete", () => {
      it("emits delete.started", async () => {
        const { storage, telemetry } = createTelemetryStorage();

        await storage.delete("to-delete.txt");

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("delete.started"),
          "first",
        );
        expect(payload).toMatchObject({
          level: "debug",
          attributes: {
            "storage.path": "to-delete.txt",
          },
        });
      });

      it("emits delete.success", async () => {
        const { storage, telemetry } = createTelemetryStorage();

        await storage.delete("to-delete.txt");

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("delete.success"),
        );
        expect(payload.level).toBe("info");
        expect(payload.attributes).toMatchObject({
          "storage.path": "to-delete.txt",
        });
        expect(payload.attributes["storage.duration_ms"]).toEqual(
          expect.any(Number),
        );
      });

      it("emits delete.error", async () => {
        const { storage, telemetry, adapter } = createTelemetryStorage();
        vi.spyOn(adapter, "delete").mockRejectedValueOnce(new Error("boom"));

        await expect(storage.delete("to-delete.txt")).rejects.toThrow();

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("delete.error"),
        );
        expect(payload.level).toBe("error");
        expect(payload.attributes).toMatchObject({
          "storage.path": "to-delete.txt",
          "storage.error.message": "boom",
        });
      });
    });

    describe("telemetry.list", () => {
      it("emits list.started", async () => {
        const { storage, telemetry } = createTelemetryStorage();

        await storage.list();

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("list.started"),
          "first",
        );
        expect(payload.level).toBe("debug");
      });

      it("emits list.success", async () => {
        const { storage, telemetry } = createTelemetryStorage();

        await storage.list();

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("list.success"),
        );
        expect(payload.level).toBe("info");
        expect(payload.attributes).toMatchObject({
          "storage.count": 0,
        });
        expect(payload.attributes["storage.duration_ms"]).toEqual(
          expect.any(Number),
        );
      });

      it("emits list.error", async () => {
        const { storage, telemetry, adapter } = createTelemetryStorage();
        vi.spyOn(adapter, "list").mockRejectedValueOnce(new Error("boom"));

        await expect(storage.list()).rejects.toThrow();

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("list.error"),
        );
        expect(payload.level).toBe("error");
        expect(payload.attributes).toMatchObject({
          "storage.error.message": "boom",
        });
      });
    });

    describe("telemetry.stream", () => {
      it("emits stream.started", async () => {
        const { storage, telemetry, adapter } = createTelemetryStorage();
        adapter.files.set("stream.txt", {
          body: "data",
          options: { contentType: "text/plain" },
        });

        await storage.stream("stream.txt");

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("stream.started"),
          "first",
        );
        expect(payload).toMatchObject({
          level: "debug",
          attributes: {
            "storage.path": "stream.txt",
          },
        });
      });

      it("emits stream.success", async () => {
        const { storage, telemetry, adapter } = createTelemetryStorage();
        adapter.files.set("stream.txt", {
          body: "data",
          options: { contentType: "text/plain" },
        });

        await storage.stream("stream.txt");

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("stream.success"),
        );
        expect(payload.level).toBe("info");
        expect(payload.attributes).toMatchObject({
          "storage.path": "stream.txt",
        });
        expect(payload.attributes["storage.duration_ms"]).toEqual(
          expect.any(Number),
        );
      });

      it("emits stream.error", async () => {
        const { storage, telemetry, adapter } = createTelemetryStorage();
        vi.spyOn(adapter, "stream").mockRejectedValueOnce(new Error("boom"));

        await expect(storage.stream("missing.txt")).rejects.toThrow();

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("stream.error"),
        );
        expect(payload.level).toBe("error");
        expect(payload.attributes).toMatchObject({
          "storage.path": "missing.txt",
          "storage.error.message": "boom",
        });
      });
    });

    describe("telemetry.upload", () => {
      it("emits upload.started", async () => {
        const { storage, telemetry } = createTelemetryStorage();

        await storage.upload(new Blob(["data"], { type: "text/plain" }), "a.txt");

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("upload.started"),
          "first",
        );
        expect(payload).toMatchObject({
          level: "debug",
          attributes: {
            "storage.path": "a.txt",
            "storage.method": "file",
          },
        });
      });

      it("emits upload.success", async () => {
        const { storage, telemetry } = createTelemetryStorage();

        await storage.upload(new Blob(["data"], { type: "text/plain" }), "a.txt");

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("upload.success"),
        );
        expect(payload.level).toBe("info");
        expect(payload.attributes).toMatchObject({
          "storage.path": "a.txt",
        });
        expect(payload.attributes["storage.duration_ms"]).toEqual(
          expect.any(Number),
        );
      });

      it("emits upload.error", async () => {
        const { storage, telemetry, adapter } = createTelemetryStorage();
        vi.spyOn(adapter, "put").mockRejectedValueOnce(new Error("boom"));

        await expect(
          storage.upload(new Blob(["data"], { type: "text/plain" }), "a.txt"),
        ).rejects.toThrow();

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("upload.error"),
        );
        expect(payload.level).toBe("error");
        expect(payload.attributes).toMatchObject({
          "storage.path": "a.txt",
          "storage.error.message": "boom",
        });
      });
    });

    describe("telemetry.copy", () => {
      it("emits copy.started", async () => {
        const { storage, telemetry, adapter } = createTelemetryStorage();
        adapter.files.set("from.txt", {
          body: "data",
          options: { contentType: "text/plain" },
        });

        await storage.copy("from.txt", "to.txt");

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("copy.started"),
          "first",
        );
        expect(payload).toMatchObject({
          level: "debug",
          attributes: {
            "storage.from": "from.txt",
            "storage.to": "to.txt",
          },
        });
      });

      it("emits copy.success", async () => {
        const { storage, telemetry, adapter } = createTelemetryStorage();
        adapter.files.set("from.txt", {
          body: "data",
          options: { contentType: "text/plain" },
        });

        await storage.copy("from.txt", "to.txt");

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("copy.success"),
        );
        expect(payload.level).toBe("info");
        expect(payload.attributes).toMatchObject({
          "storage.from": "from.txt",
          "storage.to": "to.txt",
        });
        expect(payload.attributes["storage.duration_ms"]).toEqual(
          expect.any(Number),
        );
      });

      it("emits copy.error", async () => {
        const { storage, telemetry, adapter } = createTelemetryStorage();
        vi.spyOn(adapter, "copy").mockRejectedValueOnce(new Error("boom"));

        await expect(storage.copy("from.txt", "to.txt")).rejects.toThrow();

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("copy.error"),
        );
        expect(payload.level).toBe("error");
        expect(payload.attributes).toMatchObject({
          "storage.from": "from.txt",
          "storage.to": "to.txt",
          "storage.error.message": "boom",
        });
      });
    });

    describe("telemetry.move", () => {
      it("emits move.started", async () => {
        const { storage, telemetry, adapter } = createTelemetryStorage();
        adapter.files.set("from.txt", {
          body: "data",
          options: { contentType: "text/plain" },
        });

        await storage.move("from.txt", "to.txt");

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("move.started"),
          "first",
        );
        expect(payload).toMatchObject({
          level: "debug",
          attributes: {
            "storage.from": "from.txt",
            "storage.to": "to.txt",
          },
        });
      });

      it("emits move.success", async () => {
        const { storage, telemetry, adapter } = createTelemetryStorage();
        adapter.files.set("from.txt", {
          body: "data",
          options: { contentType: "text/plain" },
        });

        await storage.move("from.txt", "to.txt");

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("move.success"),
        );
        expect(payload.level).toBe("info");
        expect(payload.attributes).toMatchObject({
          "storage.from": "from.txt",
          "storage.to": "to.txt",
        });
        expect(payload.attributes["storage.duration_ms"]).toEqual(
          expect.any(Number),
        );
      });

      it("emits move.error", async () => {
        const { storage, telemetry, adapter } = createTelemetryStorage();
        vi.spyOn(adapter, "move").mockRejectedValueOnce(new Error("boom"));

        await expect(storage.move("from.txt", "to.txt")).rejects.toThrow();

        const payload = findEmitPayload(
          telemetry,
          IgniterStorageTelemetryEvents.get.key("move.error"),
        );
        expect(payload.level).toBe("error");
        expect(payload.attributes).toMatchObject({
          "storage.from": "from.txt",
          "storage.to": "to.txt",
          "storage.error.message": "boom",
        });
      });
    });
  });
});
