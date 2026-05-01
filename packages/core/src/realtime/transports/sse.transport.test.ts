import { describe, expect, it, vi } from "vitest";
import { encodeSSEMessage, IgniterSSETransport } from "./sse.transport";

describe("encodeSSEMessage", () => {
  it("formats SSE payload", () => {
    const message = encodeSSEMessage({
      id: "1",
      event: "test",
      data: "hello",
      retry: 1000,
    });

    const text = new TextDecoder().decode(message);

    expect(text).toContain("id: 1");
    expect(text).toContain("event: test");
    expect(text).toContain("retry: 1000");
    expect(text).toContain("data: hello");
  });
});

describe("IgniterSSETransport", () => {
  it("opens connections and publishes events", async () => {
    const transport = new IgniterSSETransport();

    const response = await transport.openConnection(new Request("http://local"), {
      connectionId: "conn-1",
      channels: ["users"],
      keepAliveInterval: 1000,
    });

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    const firstChunk = await reader!.read();
    const firstText = new TextDecoder().decode(firstChunk.value);

    expect(firstText).toContain("event: connected");

    const sent = transport.publish({
      channel: "users",
      type: "message",
      data: { ok: true },
      timestamp: "now",
    });

    expect(sent).toBe(1);

    const secondChunk = await reader!.read();
    const secondText = new TextDecoder().decode(secondChunk.value);

    expect(secondText).toContain("event: message");
    expect(secondText).toContain("\"ok\":true");

    await reader!.cancel();
  });

  it("returns zero when no handlers are registered", () => {
    const transport = new IgniterSSETransport();

    const sent = transport.publish({
      channel: "missing",
      type: "message",
      data: { ok: true },
    });

    expect(sent).toBe(0);
  });

  it("clears connections on closeAll", async () => {
    const transport = new IgniterSSETransport();

    await transport.openConnection(new Request("http://local"), {
      connectionId: "conn-1",
      channels: ["users"],
    });

    transport.closeAll();

    const sent = transport.publish({
      channel: "users",
      type: "message",
      data: { ok: true },
    });

    expect(sent).toBe(0);
  });

  it("sends keepalive and closes on cancel", async () => {
    vi.useFakeTimers();

    const onKeepAlive = vi.fn();
    const onClose = vi.fn();
    const transport = new IgniterSSETransport();

    const response = await transport.openConnection(new Request("http://local"), {
      connectionId: "conn-1",
      channels: ["users"],
      keepAliveInterval: 10,
      onKeepAlive,
      onClose,
    });

    const reader = response.body?.getReader();
    await reader!.read();

    await vi.advanceTimersByTimeAsync(15);

    const keepAliveChunk = await reader!.read();
    const keepAliveText = new TextDecoder().decode(keepAliveChunk.value);

    expect(onKeepAlive).toHaveBeenCalled();
    expect(keepAliveText).toContain(": keepalive");

    await reader!.cancel("bye");
    expect(onClose).toHaveBeenCalledWith("bye");

    vi.useRealTimers();
  });

  it("logs when delivery fails and skips unmatched channels", async () => {
    const warn = vi.fn();
    const logger = { child: vi.fn(() => ({ warn })) };
    const transport = new IgniterSSETransport(logger as any);

    const response = await transport.openConnection(new Request("http://local"), {
      connectionId: "conn-1",
      channels: ["alpha"],
    });

    const reader = response.body?.getReader();
    await reader!.read();

    const connections = (transport as any).connections as Map<string, any>;
    const handlers = Array.from(connections.get("alpha") ?? []);
    connections.set("beta", new Set(handlers));

    transport.publish({ channel: "beta", data: { ok: true } });

    const circular: any = {};
    circular.self = circular;
    transport.publish({ channel: "alpha", data: circular });

    expect(warn).toHaveBeenCalledWith(
      "Event delivery failed",
      expect.objectContaining({ connectionId: "conn-1" }),
    );
  });

  it("warns when publish handlers throw and closeAll fails", () => {
    const warn = vi.fn();
    const logger = { child: vi.fn(() => ({ warn })) };
    const transport = new IgniterSSETransport(logger as any);

    const connections = (transport as any).connections as Map<string, any>;
    connections.set("broken", new Set([
      {
        connectionId: "broken-1",
        channels: ["broken"],
        handler: () => {
          throw new Error("boom");
        },
      },
    ]));

    transport.publish({ channel: "broken", data: { ok: true } });

    const fakeStream = {
      locked: true,
      cancel: () => {
        throw new Error("fail");
      },
    };
    (transport as any).activeStreams.add(fakeStream);

    transport.closeAll();

    expect(warn).toHaveBeenCalledWith(
      "Event send failed",
      expect.objectContaining({ error: expect.any(Error) }),
    );
    expect(warn).toHaveBeenCalledWith(
      "Failed to close SSE stream",
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });
});
