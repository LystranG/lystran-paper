import type { APIRoute } from "astro";
import { kv } from "@vercel/kv";
import {
  coerceViewsNumber,
  json,
  normalizePath,
  viewsKey,
} from "../utils/viewsApi";

export const prerender = false;

const MAX_PATHS = 50;

/**
 * 批量获取阅读量
 * 只读，不会自增
 */
export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const paths = (body as { paths?: unknown }).paths;
  if (!Array.isArray(paths)) {
    return json({ error: "paths must be an array" }, 400);
  }

  const normalized = paths
    .map(normalizePath)
    .filter((p): p is string => Boolean(p))
    .filter(p => p.startsWith("/posts/"))
    .filter(p => p.length <= 2000);

  const unique = Array.from(new Set(normalized)).slice(0, MAX_PATHS);

  try {
    const entries = await Promise.all(
      unique.map(async path => {
        const key = viewsKey(path);
        const value = (await kv.get<unknown>(key)) ?? 0;
        return [path, coerceViewsNumber(value)] as const;
      })
    );

    // CDN 读缓存
    return json({ views: Object.fromEntries(entries) }, 200, [
      ['Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30']
    ]);
  } catch {
    return json({ error: "KV not configured" }, 503);
  }
};
