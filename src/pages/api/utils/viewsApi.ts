import { REDIS_KEY_PREFIX } from "@/constants";
import { SITE } from "@/config";

/**
 * 统一输出 JSON 响应。
 */
export function json(data: unknown, status = 200, headers?: [string, string][]) {

  const responseHeaders = new Headers({
    "Content-Type": "application/json; charset=utf-8"
  })

  if (headers) {
    headers.forEach((t) => {
      responseHeaders.append(t[0], t[1])
    })
  }

  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders
  });
}

/**
 * 提取 pathname（相对/绝对 URL）。
 */
export function normalizePath(input: unknown) {
  if (typeof input !== "string") return null;
  try {
    const url = new URL(input, SITE.website);
    return url.pathname;
  } catch {
    return null;
  }
}

/**
 * 阅读量计数器对应的 Redis Key
 */
export function viewsKey(path: string) {
  return `${REDIS_KEY_PREFIX}views:${path.trim()}`;
}

/**
 * 将 KV 返回值安全转换为 number。
 */
export function coerceViewsNumber(value: unknown) {
  if (typeof value === "number") return value;
  return Number(value) || 0;
}
