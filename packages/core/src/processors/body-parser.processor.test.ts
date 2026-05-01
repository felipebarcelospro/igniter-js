import { describe, expect, it } from "vitest";
import { BodyParserProcessor } from "./body-parser.processor";
import { IgniterError } from "../error";

const createRequest = (body: string | null, contentType?: string) =>
  new Request("http://localhost:3000/api/test", {
    method: "POST",
    headers: new Headers({
      ...(contentType ? { "Content-Type": contentType } : {}),
    }),
    body: body ?? undefined,
  });

describe("BodyParserProcessor", () => {
  it("returns undefined when no body schema is provided", async () => {
    const request = createRequest(JSON.stringify({ ok: true }), "application/json");
    const result = await BodyParserProcessor.parse(request, false);

    expect(result).toBeUndefined();
  });

  it("parses JSON payloads", async () => {
    const request = createRequest(JSON.stringify({ ok: true }), "application/json");

    const result = await BodyParserProcessor.parse(request, true);

    expect(result).toEqual({ ok: true });
  });

  it("throws IgniterError for invalid JSON", async () => {
    const request = createRequest("{invalid}", "application/json");

    await expect(BodyParserProcessor.parse(request, true)).rejects.toBeInstanceOf(
      IgniterError,
    );
    await expect(BodyParserProcessor.parse(request, true)).rejects.toMatchObject({
      code: "BODY_PARSE_ERROR",
    });
  });

  it("parses plain text payloads", async () => {
    const request = createRequest("hello", "text/plain");

    const result = await BodyParserProcessor.parse(request, true);

    expect(result).toBe("hello");
  });

  it("parses urlencoded form payloads", async () => {
    const form = new URLSearchParams({ name: "Igniter" });
    const request = new Request("http://localhost:3000/api/test", {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/x-www-form-urlencoded",
      }),
      body: form,
    });

    const result = await BodyParserProcessor.parse(request, true);

    expect(result).toEqual({ name: "Igniter" });
  });

  it("parses multipart form payloads", async () => {
    const formData = new FormData();
    formData.append("name", "Igniter");

    const request = new Request("http://localhost:3000/api/test", {
      method: "POST",
      body: formData,
    });

    const result = await BodyParserProcessor.parse(request, true);

    expect(result).toEqual({ name: "Igniter" });
  });

  it("parses binary payloads", async () => {
    const request = new Request("http://localhost:3000/api/test", {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/octet-stream",
      }),
      body: new Uint8Array([1, 2, 3]),
    });

    const result = await BodyParserProcessor.parse(request, true);

    expect(result).toBeInstanceOf(ArrayBuffer);
  });
});
