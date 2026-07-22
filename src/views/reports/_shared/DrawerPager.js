// Client-side pagination for a report drill-down drawer.
//
// The drawer already holds its whole result set, so paging here is a display
// concern with no refetch. The "x–y of N" count doubles as "how many documents
// make up this figure", which is usually the question the drawer is answering.
//
// Extracted from the GST Balance drawer when the HSN Summary drawer needed the
// same thing — one implementation, so the two never page differently.

import { Button, Input } from "reactstrap";
import { ChevronLeft, ChevronRight } from "react-feather";

export const PAGE_SIZES = [10, 25, 50, 100];

/**
 * Slice `arr` for the given page, clamping the page into range so a size
 * change (or a smaller result set) can never strand the user on a blank page.
 */
export const pageSlice = (arr, page, size) => {
  const total = (arr || []).length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const safe = Math.min(Math.max(0, page), pageCount - 1);
  return {
    total,
    pageCount,
    safe,
    rows: (arr || []).slice(safe * size, safe * size + size),
    from: total === 0 ? 0 : safe * size + 1,
    to: Math.min(total, (safe + 1) * size),
  };
};

export const Pager = ({ meta, size, onSize, onPage, label }) => (
  <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mt-50 small">
    <div className="d-flex align-items-center gap-1">
      <span className="text-muted">{label}</span>
      <Input
        type="select"
        bsSize="sm"
        style={{ width: 80 }}
        value={size}
        onChange={(e) => {
          onSize(Number(e.target.value));
          onPage(0);
        }}
      >
        {PAGE_SIZES.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </Input>
      <span className="text-muted">
        {meta.from}–{meta.to} of {meta.total}
      </span>
    </div>
    <div className="d-flex align-items-center gap-1">
      <Button
        color="secondary"
        outline
        size="sm"
        disabled={meta.safe <= 0}
        onClick={() => onPage(meta.safe - 1)}
      >
        <ChevronLeft size={14} />
      </Button>
      <span className="text-muted">
        {meta.safe + 1} / {meta.pageCount}
      </span>
      <Button
        color="secondary"
        outline
        size="sm"
        disabled={meta.safe >= meta.pageCount - 1}
        onClick={() => onPage(meta.safe + 1)}
      >
        <ChevronRight size={14} />
      </Button>
    </div>
  </div>
);

export default Pager;
