const HIT_TTL_MS = 6 * 60 * 60 * 1000; // 6 小时
const STORAGE_PREFIX = "lystran:postviews:lastHit:";
let activeController: AbortController | null = null;

function normalizePath(input: string) {
  try {
    return new URL(input, window.location.origin).pathname;
  } catch {
    return input;
  }
}

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
  body: unknown,
  signal: AbortSignal
): Promise<PostJsonResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
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

async function run() {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>("[data-post-views-path]")
  );
  if (elements.length === 0) return;

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
    const hit = await postJson<{ path: string; views: number }>(
      "/api/views/hit",
      { path: hitPath },
      signal
    );

    if (hit.ok) {
      setCount(normalizePath(hit.data.path), hit.data.views);
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

document.addEventListener("astro:page-load", scheduleRun);
scheduleRun();
