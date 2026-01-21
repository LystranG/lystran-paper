import * as React from "react";

type Heading = {
  depth: number;
  slug: string;
  text: string;
};

export type TocNode = {
  id: string;
  heading: Heading;
  children: TocNode[];
};

type Props = {
  nodes: TocNode[];
  baseId: string;
};

function getChildrenId(baseId: string, nodeId: string) {
  return `${baseId}-children-${nodeId}`;
}

function OutlineList({
  nodes,
  baseId,
  activeSlug,
  collapsedIds,
  onToggle,
}: {
  nodes: TocNode[];
  baseId: string;
  activeSlug: string | null;
  collapsedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <ol className="article-outline__list">
      {nodes.map(node => {
        const hasChildren = node.children.length > 0;
        const childrenId = getChildrenId(baseId, node.id);
        const isExpanded = !collapsedIds.has(node.id);
        const isActive = activeSlug === node.heading.slug;

        return (
          <li key={node.id} className="article-outline__item">
            <div className="article-outline__row">
              {hasChildren ? (
                <button
                  type="button"
                  className="article-outline__toggle"
                  aria-expanded={isExpanded}
                  aria-controls={childrenId}
                  aria-label="折叠/展开子目录"
                  onClick={() => onToggle(node.id)}
                >
                  ▾
                </button>
              ) : (
                <span className="article-outline__spacer" aria-hidden="true" />
              )}
              <a
                href={`#${node.heading.slug}`}
                className={
                  isActive
                    ? "article-outline__link article-outline__link--active"
                    : "article-outline__link"
                }
                aria-current={isActive ? "location" : undefined}
              >
                {node.heading.text}
              </a>
            </div>

            {hasChildren && (
              <div
                id={childrenId}
                className="article-outline__children"
                data-collapsed={isExpanded ? "false" : "true"}
              >
                <div className="article-outline__children-inner">
                  <OutlineList
                    nodes={node.children}
                    baseId={baseId}
                    activeSlug={activeSlug}
                    collapsedIds={collapsedIds}
                    onToggle={onToggle}
                  />
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function ArticleOutlineIsland({ nodes, baseId }: Props) {
  const [collapsedIds, setCollapsedIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [activeSlug, setActiveSlug] = React.useState<string | null>(null);

  const onToggle = React.useCallback((id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const slugs = React.useMemo(() => {
    const result: string[] = [];
    const walk = (list: TocNode[]) => {
      for (const node of list) {
        result.push(node.heading.slug);
        if (node.children.length > 0) walk(node.children);
      }
    };
    walk(nodes);
    return result;
  }, [nodes]);

  const slugToAncestors = React.useMemo(() => {
    const map = new Map<string, string[]>();
    const walk = (list: TocNode[], ancestors: string[]) => {
      for (const node of list) {
        map.set(node.heading.slug, ancestors);
        if (node.children.length > 0) {
          walk(node.children, [...ancestors, node.id]);
        }
      }
    };
    walk(nodes, []);
    return map;
  }, [nodes]);

  React.useEffect(() => {
    const elements = slugs
      .map(slug => document.getElementById(slug))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const updateActive = () => {
      const topOffset = 120;
      let current: string | null = null;
      for (const el of elements) {
        const top = el.getBoundingClientRect().top;
        if (top - topOffset <= 0) current = el.id;
        else break;
      }
      if (!current) current = elements[0]!.id;
      setActiveSlug(prev => (prev === current ? prev : current));
    };

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        updateActive();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    updateActive();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [slugs.join("|")]);

  React.useEffect(() => {
    if (!activeSlug) return;
    const ancestors = slugToAncestors.get(activeSlug);
    if (!ancestors || ancestors.length === 0) return;
    setCollapsedIds(prev => {
      let changed = false;
      const next = new Set(prev);
      for (const id of ancestors) {
        if (next.delete(id)) changed = true;
      }
      return changed ? next : prev;
    });
  }, [activeSlug, slugToAncestors]);

  return (
    <OutlineList
      nodes={nodes}
      baseId={baseId}
      activeSlug={activeSlug}
      collapsedIds={collapsedIds}
      onToggle={onToggle}
    />
  );
}
