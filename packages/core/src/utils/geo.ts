import type { IgniterLogger } from "../types";
import type { IgniterRequestGeo } from "../types/realtime.interface";
import type { IgniterStoreCacheProcessor } from "../services/cache.processor";

type GeoResolverOptions = {
  ip?: string;
  headers: Headers;
  cache?: IgniterStoreCacheProcessor;
  logger?: IgniterLogger;
};

const inferGeoFromHeaders = (headers: Headers): IgniterRequestGeo | undefined => {
  const country =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country-code") ||
    undefined;
  const region =
    headers.get("x-vercel-ip-region") ||
    headers.get("x-region-code") ||
    undefined;
  const city = headers.get("x-vercel-ip-city") || headers.get("x-city") || undefined;
  const latitudeValue = headers.get("x-vercel-ip-latitude");
  const longitudeValue = headers.get("x-vercel-ip-longitude");

  if (!country && !region && !city && !latitudeValue && !longitudeValue) {
    return undefined;
  }

  return {
    country: country ?? undefined,
    region: region ?? undefined,
    city: city ?? undefined,
    latitude: latitudeValue ? Number(latitudeValue) : undefined,
    longitude: longitudeValue ? Number(longitudeValue) : undefined,
  };
};

const resolveFromProvider = async (
  provider: string,
  ip: string,
  token?: string,
): Promise<IgniterRequestGeo | undefined> => {
  if (provider === "ipinfo") {
    const url = token
      ? `https://ipinfo.io/${ip}/json?token=${token}`
      : `https://ipinfo.io/${ip}/json`;
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const data = (await response.json()) as {
      country?: string;
      region?: string;
      city?: string;
      loc?: string;
    };
    const [lat, lng] = data.loc ? data.loc.split(",") : [];
    return {
      country: data.country,
      region: data.region,
      city: data.city,
      latitude: lat ? Number(lat) : undefined,
      longitude: lng ? Number(lng) : undefined,
    };
  }

  if (provider === "ipapi") {
    const url = `https://ipapi.co/${ip}/json/`;
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const data = (await response.json()) as {
      country_code?: string;
      region?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    };
    return {
      country: data.country_code,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  }

  return undefined;
};

export const resolveGeo = async ({
  ip,
  headers,
  cache,
  logger,
}: GeoResolverOptions): Promise<IgniterRequestGeo | undefined> => {
  if (!ip) {
    return inferGeoFromHeaders(headers);
  }

  const cached = await cache?.getGeo(ip);
  if (cached) {
    return cached;
  }

  const provider = process.env.IGNITER_GEO_SERVICE_PROVIDER;
  const token = process.env.IGNITER_GEO_SERVICE_TOKEN;

  try {
    if (provider) {
      const resolved = await resolveFromProvider(provider, ip, token);
      if (resolved) {
        await cache?.setGeo(ip, resolved);
        return resolved;
      }
    }
  } catch (error) {
    logger?.warn("Geo provider failed, falling back to headers", {
      provider,
      error,
    });
  }

  const fallback = inferGeoFromHeaders(headers);
  if (fallback) {
    await cache?.setGeo(ip, fallback, 3600);
  }
  return fallback;
};
