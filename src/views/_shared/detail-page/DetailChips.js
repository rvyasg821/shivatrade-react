// items: array of strings OR { label, to, onClick, bg, fg }
// Chips use inline hex colors so they stay stable regardless of which CSS
// chunks have loaded (theme `bg-light-*` utilities use rgba+!important and
// can render inconsistently between initial mount and full refresh).

import { Link } from "react-router-dom";

const DEFAULT_BG = "#eef0f3";
const DEFAULT_FG = "#1a2238";

const chipStyle = (bg, fg) => ({
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  background: bg || DEFAULT_BG,
  color: fg || DEFAULT_FG,
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.3,
  whiteSpace: "nowrap",
});

const DetailChips = ({
  title,
  items = [],
  bg = DEFAULT_BG,
  fg = DEFAULT_FG,
  emptyText,
}) => {
  const norm = items
    .map((it) =>
      typeof it === "string" || typeof it === "number"
        ? { label: String(it) }
        : it
    )
    .filter((it) => it && it.label);

  if (!norm.length && !emptyText && !title) return null;

  return (
    <div className="mb-1">
      {title ? <div className="text-muted small mb-50">{title}</div> : null}
      {norm.length === 0 ? (
        <span className="text-muted small">{emptyText || "-"}</span>
      ) : (
        <div className="d-flex flex-wrap gap-50">
          {norm.map((it, idx) => {
            const style = chipStyle(it.bg || bg, it.fg || fg);
            const inner = <span style={style}>{it.label}</span>;
            if (it.to) {
              return (
                <Link
                  key={it.key || idx}
                  to={it.to}
                  className="text-decoration-none"
                >
                  {inner}
                </Link>
              );
            }
            if (it.onClick) {
              return (
                <span
                  key={it.key || idx}
                  role="button"
                  onClick={it.onClick}
                  style={{ cursor: "pointer" }}
                >
                  {inner}
                </span>
              );
            }
            return <span key={it.key || idx}>{inner}</span>;
          })}
        </div>
      )}
    </div>
  );
};

export default DetailChips;
