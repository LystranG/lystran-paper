function getAttr(tag: string, name: string): string | undefined {
  const re = new RegExp(`${name}\\s*=\\s*(\"([^\"]*)\"|'([^']*)')`, "i");
  const match = tag.match(re);
  const value = match?.[2] ?? match?.[3];
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

type MdastNode = {
  type: string;
  value?: unknown;
  children?: unknown;
};

type MdastParent = MdastNode & {
  children: MdastNode[];
};

function isMdastNode(value: unknown): value is MdastNode {
  return Boolean(value) && typeof value === "object" && "type" in value;
}

function isMdastParent(value: unknown): value is MdastParent {
  if (!isMdastNode(value)) return false;
  return Array.isArray((value as MdastNode).children);
}

type ImageNode = {
  type: "image";
  url: string;
  alt: string;
  title?: string;
};

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
  return (tree: unknown) => {
    const walk = (nodes: MdastNode[]) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (!isMdastNode(node)) continue;

        if (node.type === "html" && typeof node.value === "string") {
          const image = tryParseSingleImg(node.value);
          if (image) nodes[i] = image;
        }

        if (isMdastParent(node) && node.children.length > 0) {
          walk(node.children);
        }
      }
    };

    if (isMdastParent(tree)) {
      walk(tree.children);
    }
  };
}
