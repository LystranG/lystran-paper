/**
 * 文章阅读量（views）
 * - 读取页面中的 data-post-views-* 节点并批量拉取阅读量
 * - 对当前文章（hit=true）本地 6 小时去重后触发一次自增
 * - KV 不可用或网络错误时隐藏组件
 */
const HIT_TTL_MS = 6 * 60 * 60 * 1000; // 6 小时
const STORAGE_PREFIX = "lystran:postviews:lastHit:";
let activeController: AbortController | null = null;

// URL/路径规整为 pathname
function normalizePath(input: string) {
  try {
    return new URL(input, window.location.origin).pathname;
  } catch {
    return input;
  }
}

// 6 小时内只命中一次
function shouldHit(path: string) {
  try {
    const key = STORAGE_PREFIX + path;
    const last = Number(localStorage.getItem(key) ?? "0");
    return Date.now() - last >= HIT_TTL_MS;
  } catch {
    return true;
  }
}

function markHit(path: string) {
  try {
    localStorage.setItem(STORAGE_PREFIX + path, String(Date.now()));
  } catch {
    // ignore
  }
}

// 同一页面可能出现多个阅读量组件，按 path 同步更新所有节点
function setCount(path: string, views: number) {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-post-views-path]`)
  );

  for (const el of elements) {
    const elPath = normalizePath(el.dataset.postViewsPath ?? "");
    if (elPath !== path) continue;
    const countEl = el.querySelector<HTMLElement>("[data-post-views-count]");
    if (!countEl) continue;
    el.hidden = false;
    countEl.textContent = String(views);
  }
}

type PostJsonResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; data: null };

async function postJson<T>(
  url: string,
  body: unknown | undefined,
  signal: AbortSignal,
  headers?: Record<string, string>
): Promise<PostJsonResult<T>> {
  let res: Response;
  try {
    const init: RequestInit = {
      method: "POST",
      signal,
      headers: headers ? { ...headers } : undefined,
    };

    if (body !== undefined) {
      init.headers = {
        ...(typeof init.headers === "object" && init.headers ? init.headers : {}),
        "Content-Type": "application/json",
      };
      init.body = JSON.stringify(body);
    }

    res = await fetch(url, {
      ...init,
    });
  } catch {
    return { ok: false, status: 0, data: null };
  }

  if (!res.ok) return { ok: false, status: res.status, data: null };
  return { ok: true, status: res.status, data: (await res.json()) as T };
}

function disableAll() {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>("[data-post-views]")
  );
  for (const el of elements) el.hidden = true;
}

// 优先对详情页做一次 hit 自增，随后对剩余 paths 批量读取
async function run() {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>("[data-post-views-path]")
  );
  if (elements.length === 0) return;

  // 页面切换/热更新时中断上一轮请求，避免乱序
  activeController?.abort();
  activeController = new AbortController();
  const signal = activeController.signal;

  const paths = Array.from(
    new Set(
      elements
        .map(el => normalizePath(el.dataset.postViewsPath ?? ""))
        .filter(p => p.startsWith("/posts/"))
    )
  );

  const hitEl = elements.find(el => el.dataset.postViewsHit === "true");
  const hitPath = hitEl ? normalizePath(hitEl.dataset.postViewsPath ?? "") : null;

  if (hitPath && hitPath.startsWith("/posts/") && shouldHit(hitPath)) {
    const hit = await postJson<{ slug: string; views: number }>(
      "/api/views/hit",
      undefined,
      signal,
      { "X-Slug": hitPath }
    );

    if (hit.ok) {
      setCount(normalizePath(hit.data.slug), hit.data.views);
      markHit(hitPath);
      const remaining = paths.filter(p => p !== hitPath);
      if (remaining.length === 0) return;
      const batch = await postJson<{ views: Record<string, number> }>(
        "/api/views/batch",
        { paths: remaining },
        signal
      );
      if (!batch.ok) {
        if (batch.status === 0 || batch.status === 503) disableAll();
        return;
      }
      for (const [path, views] of Object.entries(batch.data.views)) {
        setCount(normalizePath(path), views);
      }
      return;
    }

    if (hit.status === 0 || hit.status === 503) {
      disableAll();
      return;
    }
  }

  const batch = await postJson<{ views: Record<string, number> }>(
    "/api/views/batch",
    { paths },
    signal
  );
  if (!batch.ok) {
    if (batch.status === 0 || batch.status === 503) disableAll();
    return;
  }

  for (const [path, views] of Object.entries(batch.data.views)) {
    setCount(normalizePath(path), views);
  }
}

let scheduled = false;
function scheduleRun() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    void run();
  });
}

// Astro 的页面切换会触发 astro:page-load；首次加载也主动跑一次
document.addEventListener("astro:page-load", scheduleRun);
scheduleRun();
