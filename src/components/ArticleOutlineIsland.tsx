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
  collapsedIds,
  onToggle,
}: {
  nodes: TocNode[];
  baseId: string;
  collapsedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <ol className="article-outline__list">
      {nodes.map(node => {
        const hasChildren = node.children.length > 0;
        const childrenId = getChildrenId(baseId, node.id);
        const isExpanded = !collapsedIds.has(node.id);

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
              <a href={`#${node.heading.slug}`} className="article-outline__link">
                {node.heading.text}
              </a>
            </div>

            {hasChildren && (
              <div
                id={childrenId}
                className="article-outline__children"
                style={{ display: isExpanded ? undefined : "none" }}
              >
                <OutlineList
                  nodes={node.children}
                  baseId={baseId}
                  collapsedIds={collapsedIds}
                  onToggle={onToggle}
                />
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

  const onToggle = React.useCallback((id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <OutlineList
      nodes={nodes}
      baseId={baseId}
      collapsedIds={collapsedIds}
      onToggle={onToggle}
    />
  );
}
