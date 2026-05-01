import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveGeo } from "./geo";

const createCache = () => ({
  getGeo: vi.fn().mockResolvedValue(null),
  setGeo: vi.fn().mockResolvedValue(undefined),
});

describe("resolveGeo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.IGNITER_GEO_SERVICE_PROVIDER;
    delete process.env.IGNITER_GEO_SERVICE_TOKEN;
  });

  it("returns header-based geo when ip is missing", async () => {
    const headers = new Headers({
      "x-vercel-ip-country": "BR",
      "x-vercel-ip-region": "SP",
    });

    const result = await resolveGeo({ headers });

    expect(result).toEqual({
      country: "BR",
      region: "SP",
      city: undefined,
      latitude: undefined,
      longitude: undefined,
    });
  });

  it("returns cached geo when available", async () => {
    const cache = createCache();
    cache.getGeo.mockResolvedValueOnce({ country: "US" });

    const result = await resolveGeo({
      ip: "1.1.1.1",
      headers: new Headers(),
      cache: cache as any,
    });

    expect(result).toEqual({ country: "US" });
    expect(cache.getGeo).toHaveBeenCalledWith("1.1.1.1");
    expect(cache.setGeo).not.toHaveBeenCalled();
  });

  it("falls back to headers when provider fails", async () => {
    const cache = createCache();
    const logger = { warn: vi.fn() };

    process.env.IGNITER_GEO_SERVICE_PROVIDER = "ipinfo";

    (globalThis as any).fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, json: vi.fn() });

    const headers = new Headers({ "x-country-code": "BR" });

    const result = await resolveGeo({
      ip: "1.1.1.1",
      headers,
      cache: cache as any,
      logger: logger as any,
    });

    expect(result?.country).toBe("BR");
    expect(cache.setGeo).toHaveBeenCalled();
  });

  it("resolves via provider and caches the result", async () => {
    const cache = createCache();

    process.env.IGNITER_GEO_SERVICE_PROVIDER = "ipapi";

    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        country_code: "BR",
        region: "SP",
        city: "Sao Paulo",
        latitude: -23.5,
        longitude: -46.6,
      }),
    });

    const result = await resolveGeo({
      ip: "1.1.1.1",
      headers: new Headers(),
      cache: cache as any,
    });

    expect(result).toEqual({
      country: "BR",
      region: "SP",
      city: "Sao Paulo",
      latitude: -23.5,
      longitude: -46.6,
    });
    expect(cache.setGeo).toHaveBeenCalledWith("1.1.1.1", result);
  });
});
