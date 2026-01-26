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
 */
function normalizeAndLimitPaths(inputs: unknown[]) {
  const normalized = inputs
    .map(normalizePath)
    .filter((p): p is string => Boolean(p))
    .filter(p => p.startsWith("/posts/"))
    .filter(p => p.length <= 2000);

  return Array.from(new Set(normalized)).slice(0, MAX_PATHS);
}

async function handleBatch(paths: string[]) {
  try {
    const entries = await Promise.all(
      paths.map(async path => {
        const key = viewsKey(path);
        const value = (await kv.get<unknown>(key)) ?? 0;
        return [path, coerceViewsNumber(value)] as const;
      })
    );

    // CDN 读缓存
    return json({ views: Object.fromEntries(entries) }, 200, [
      ["Cache-Control", "public, s-maxage=60, stale-while-revalidate=30"],
    ]);
  } catch {
    return json({ error: "KV not configured" }, 503);
  }
}

export const GET: APIRoute = async ({ url }) => {
  // 重复参数 path
  const raw = url.searchParams.getAll("path");
  const unique = normalizeAndLimitPaths(raw);
  return handleBatch(unique);
};
