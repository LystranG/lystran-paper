type HastNode = {
  type?: string;
  tagName?: string;
  value?: unknown;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function walk(node: HastNode, visitor: (n: HastNode) => void) {
  visitor(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child, visitor);
  }
}

function toText(node: HastNode): string {
  let result = "";
  walk(node, n => {
    if (n.type === "text" && typeof n.value === "string") result += n.value;
  });
  return result.replace(/\s+/g, " ").trim();
}

function getAriaProp(
  properties: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = properties?.[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

/**
 * 为 `a` 与空内容的 `h1..h6` 自动补齐可访问名称（aria-label）。
 * 目的：修复 `astro audit` / axe 规则中 “Headings and anchors must have an accessible name” 的报错。
 */
export default function ensureAccessibleName() {
  return (tree: HastNode) => {
    walk(tree, node => {
      if (node.type !== "element" || typeof node.tagName !== "string") return;

      const tag = node.tagName.toLowerCase();
      const properties = (node.properties ??= {});

      const hasAriaLabel =
        Boolean(getAriaProp(properties, "aria-label")) ||
        Boolean(getAriaProp(properties, "aria-labelledby"));

      if (tag === "a") {
        if (hasAriaLabel) return;
        const text = toText(node);
        if (!text) return;
        properties["aria-label"] = text;
        return;
      }

      const isHeading = /^h[1-6]$/.test(tag);
      if (!isHeading) return;
      if (hasAriaLabel) return;

      const text = toText(node);
      if (text) return;

      const id = properties["id"];
      if (typeof id === "string" && id.trim()) {
        properties["aria-label"] = id.trim();
      }
    });
  };
}

