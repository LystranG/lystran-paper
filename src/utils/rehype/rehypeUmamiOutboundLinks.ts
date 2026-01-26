type HastNode = {
  type?: string;
  tagName?: string;
  value?: unknown;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

type Options = {
  /**
   * 站点 URL（用于判断外链/内链）。
   */
  site: string;
  /**
   * Umami 事件名，默认：outbound-link-click
   */
  eventName?: string;
  /**
   * 额外的内链 host（例如同时把 apex + www 视为内链）。
   * 值示例：["lystran.com", "www.lystran.com"]
   */
  additionalInternalHosts?: string[];
};

function walk(node: HastNode, visitor: (n: HastNode) => void) {
  visitor(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child, visitor);
  }
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
}

function toHostSet(site: string, additionalInternalHosts?: string[]) {
  const set = new Set<string>();
  try {
    const url = new URL(site);
    if (url.host) set.add(url.host);

    // 站点做了 apex <-> www 重定向，但仍应视为内链。
    if (url.host.startsWith("www.")) set.add(url.host.slice(4));
    else set.add(`www.${url.host}`);
  } catch {
    // ignore
  }

  for (const host of additionalInternalHosts ?? []) {
    if (typeof host === "string" && host.trim()) set.add(host.trim());
  }

  return set;
}

function isTrackableHttpUrl(href: string, base: string) {
  if (href.startsWith("#")) return null;
  const lower = href.toLowerCase();
  if (
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("javascript:")
  ) {
    return null;
  }

  try {
    const url = new URL(href, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * 为外部链接自动补齐 Umami 事件属性
 */
export default function rehypeUmamiOutboundLinks(options: Options) {
  const eventName = options.eventName ?? "outbound-link-click";
  const site = options.site;
  const internalHosts = toHostSet(site, options.additionalInternalHosts);

  return (tree: HastNode) => {
    walk(tree, node => {
      if (node.type !== "element" || node.tagName?.toLowerCase() !== "a") return;

      const properties = (node.properties ??= {});

      // 不覆盖用户手写属性
      const existingEvent = properties["data-umami-event"];
      if (typeof existingEvent === "string" && existingEvent.trim()) return;

      const href = asString(properties["href"]);
      if (!href) return;

      const url = isTrackableHttpUrl(href, site);
      if (!url) return;

      if (internalHosts.has(url.host)) return;

      properties["data-umami-event"] = eventName;
      properties["data-umami-event-url"] = href;
    });
  };
}

