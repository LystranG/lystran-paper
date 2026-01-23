import type { APIRoute } from "astro";
import { kv } from "@vercel/kv";
import { json, normalizePath, viewsKey } from "../utils/viewsApi";

export const prerender = false;

/**
 * 文章阅读量自增接口
 *
 * 防刷策略：
 * - 客户端：localStorage 6 小时去重
 * - 服务端：Vercel Firewall
 */
export const POST: APIRoute = async ({ request }) => {
  const raw = request.headers.get("x-slug");
  const slug = normalizePath(raw);

  if (!slug || !slug.startsWith("/posts/") || slug.length > 2000) {
    return json({ error: "Invalid post slug" }, 400);
  }

  const key = viewsKey(slug);
  let next: number;
  try {
    next = await kv.incr(key);
  } catch {
    return json({ error: "KV not configured" }, 503);
  }

  return json({ slug, views: next });
};
