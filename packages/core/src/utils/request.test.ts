import { describe, expect, it } from "vitest";
import { getRequestIp, parseDeviceFromUserAgent } from "./request";

describe("getRequestIp", () => {
  it("prioritizes x-forwarded-for", () => {
    const request = new Request("http://localhost", {
      headers: new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }),
    });

    expect(getRequestIp(request)).toBe("1.1.1.1");
  });

  it("falls back to x-real-ip", () => {
    const request = new Request("http://localhost", {
      headers: new Headers({ "x-real-ip": "3.3.3.3" }),
    });

    expect(getRequestIp(request)).toBe("3.3.3.3");
  });

  it("falls back to cf-connecting-ip and x-client-ip", () => {
    const request = new Request("http://localhost", {
      headers: new Headers({ "cf-connecting-ip": "4.4.4.4" }),
    });

    expect(getRequestIp(request)).toBe("4.4.4.4");

    const fallback = new Request("http://localhost", {
      headers: new Headers({ "x-client-ip": "5.5.5.5" }),
    });

    expect(getRequestIp(fallback)).toBe("5.5.5.5");
  });
});

describe("parseDeviceFromUserAgent", () => {
  it("parses device, browser, and OS", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114 Safari/537.36";

    const device = parseDeviceFromUserAgent(ua);

    expect(device).toEqual({
      device: "windows",
      browser: "chrome",
      os: "windows",
    });
  });

  it("returns undefined for missing user agent", () => {
    expect(parseDeviceFromUserAgent(undefined)).toBeUndefined();
  });

  it("detects mobile safari and android chrome", () => {
    const safari =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    const android =
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/115.0 Mobile Safari/537.36";

    expect(parseDeviceFromUserAgent(safari)).toEqual({
      device: "ios",
      browser: "safari",
      os: "ios",
    });

    expect(parseDeviceFromUserAgent(android)).toEqual({
      device: "android",
      browser: "chrome",
      os: "android",
    });
  });

  it("detects edge and opera", () => {
    const edge =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edge/120.0";
    const opera =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 OPR/105.0";

    expect(parseDeviceFromUserAgent(edge)).toEqual({
      device: "windows",
      browser: "edge",
      os: "windows",
    });

    expect(parseDeviceFromUserAgent(opera)).toEqual({
      device: "windows",
      browser: "opera",
      os: "windows",
    });
  });
});
