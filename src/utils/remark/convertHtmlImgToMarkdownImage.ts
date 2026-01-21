type MdastNode = {
  type?: string;
  value?: unknown;
  children?: MdastNode[];
  [key: string]: unknown;
};

type ImageNode = {
  type: "image";
  url: string;
  alt: string;
  title?: string;
};

function walkAndReplace(
  nodes: MdastNode[],
  replace: (node: MdastNode) => MdastNode | null,
) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const next = replace(node);
    if (next) nodes[i] = next;

    const children = nodes[i]?.children;
    if (Array.isArray(children) && children.length > 0) {
      walkAndReplace(children, replace);
    }
  }
}

function getAttr(tag: string, name: string): string | undefined {
  const re = new RegExp(`${name}\\s*=\\s*(\"([^\"]*)\"|'([^']*)')`, "i");
  const match = tag.match(re);
  const value = match?.[2] ?? match?.[3];
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

function tryParseSingleImg(html: string): ImageNode | null {
  const raw = html.trim();
  if (!raw) return null;

  // 仅处理“内容就是一个 <img ...>” 的场景，避免误伤复杂 HTML。
  const onlyImg = raw.match(/^<img\b[\s\S]*?>\s*$/i);
  if (!onlyImg) return null;

  const src = getAttr(raw, "src");
  if (!src) return null;

  const alt = getAttr(raw, "alt") ?? "";
  const title = getAttr(raw, "title");

  return title
    ? { type: "image", url: src, alt, title }
    : { type: "image", url: src, alt };
}

/**
 * 将 Markdown 内的原始 HTML `<img ...>` 自动转换为 Markdown 图片节点（`![]()`）。
 *
 * 目的：
 * - 让 `.md` 里写 `<img>` 的作者不需要改写文档
 * - 仍然走 Astro 的 Markdown 图片处理/优化逻辑（而不是原样输出 `<img>`）
 */
export default function convertHtmlImgToMarkdownImage() {
  return (tree: MdastNode) => {
    if (!tree || !Array.isArray(tree.children)) return;

    walkAndReplace(tree.children, node => {
      if (node.type !== "html" || typeof node.value !== "string") return null;
      const image = tryParseSingleImg(node.value);
      return image;
    });
  };
}

