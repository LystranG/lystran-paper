import type { APIRoute } from "astro";
import { kv } from "@vercel/kv";
import { json, normalizePath, viewsKey } from "../utils/viewsApi";

export const prerender = false;

/**
 * 文章阅读量自增接口（仅用于“真实进入文章页面”时调用）。
 *
 * 防刷策略：
 * - 客户端：localStorage 6 小时去重（避免用户刷新/来回点导致频繁+1）。
 * - 服务端：限流交给 Vercel Firewall（你已决定在平台侧实现）。
 */
export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const path = normalizePath((body as { path?: unknown }).path);
  if (!path || !path.startsWith("/posts/")) {
    return json({ error: "Invalid path" }, 400);
  }

  const key = viewsKey(path);
  let next: number;
  try {
    next = await kv.incr(key);
  } catch {
    return json({ error: "KV not configured" }, 503);
  }

  return json({ path, views: next });
};
