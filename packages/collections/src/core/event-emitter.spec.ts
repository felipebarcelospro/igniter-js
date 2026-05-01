import { describe, it, expect, vi } from "vitest";
import { IgniterCollectionEventEmitter } from "./event-emitter";

describe("IgniterCollectionEventEmitter", () => {
  it("should subscribe and emit events", async () => {
    const emitter = new IgniterCollectionEventEmitter<{ test: { foo: string } }>();
    const handler = vi.fn();

    emitter.on("test", handler);
    await emitter.emit("test", { foo: "bar" });

    expect(handler).toHaveBeenCalledWith({ foo: "bar" });
  });

  it("should unsubscribe from events", async () => {
    const emitter = new IgniterCollectionEventEmitter<{ test: { foo: string } }>();
    const handler = vi.fn();

    emitter.on("test", handler);
    emitter.off("test", handler);
    await emitter.emit("test", { foo: "bar" });

    expect(handler).not.toHaveBeenCalled();
  });

  it("should subscribe once", async () => {
    const emitter = new IgniterCollectionEventEmitter<{ test: { foo: string } }>();
    const handler = vi.fn();

    emitter.once("test", handler);
    await emitter.emit("test", { foo: "bar" });
    await emitter.emit("test", { foo: "baz" });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ foo: "bar" });
  });

  it("should handle async handlers", async () => {
    const emitter = new IgniterCollectionEventEmitter<{ test: { foo: string } }>();
    let value = "";
    const handler = async (data: { foo: string }) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      value = data.foo;
    };

    emitter.on("test", handler);
    await emitter.emit("test", { foo: "bar" });

    expect(value).toBe("bar");
  });

  it("should not crash if handler throws", async () => {
    const emitter = new IgniterCollectionEventEmitter<{ test: { foo: string } }>();
    const handler1 = () => { throw new Error("test"); };
    const handler2 = vi.fn();

    emitter.on("test", handler1);
    emitter.on("test", handler2);

    // Should not throw
    await emitter.emit("test", { foo: "bar" });

    expect(handler2).toHaveBeenCalled();
  });
});
