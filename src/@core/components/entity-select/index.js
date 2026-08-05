// Reusable server-side searchable dropdown for vendors / customers / products.
// Shows the first 10 when the menu opens, then searches the server as the user
// types, so the full list is never loaded up-front.
//
// Props:
//   kind      — "vendor" | "customer" | "product"
//   value     — the selected id (string), OR a react-select option
//               { value, label }, OR null. A bare id is resolved to its label
//               automatically via ?ids=, so call sites can just pass the id.
//   onChange  — (option | null) => void   (option carries .raw = full row)
//   limit     — page size (default 10)
//   minChars  — chars before searching (default 0 = show 10 on open)
//   eager     — true (default): preload the first page on mount (single header
//               pickers). false: load only when the menu opens (line-item
//               pickers, so N rows don't each fetch on mount).
//   …rest     — passed through to Select (isDisabled, placeholder, styles, …)

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Select from "react-select";
import {
  makeDropdownLoader,
  resolveEntityByIds,
  ENTITY_KINDS,
} from "@src/utility/asyncSelect";

const EntitySearchSelect = ({
  kind,
  value = null,
  onChange,
  limit = 10,
  minChars = 0,
  isClearable = true,
  eager = true,
  ...rest
}) => {
  const cfg = ENTITY_KINDS[kind];
  // Per-instance debounced loader (own timer) — rebuilt only if knobs change.
  const load = useMemo(
    () =>
      cfg
        ? makeDropdownLoader(cfg.endpoint, cfg.map, { limit, minChars })
        : () => Promise.resolve([]),
    [cfg, limit, minChars],
  );

  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState({}); // id → option (labels)
  const loadedRef = useRef(false);

  const runSearch = useCallback(
    (term) => {
      setLoading(true);
      load(term)
        .then((opts) => {
          setOptions(Array.isArray(opts) ? opts : []);
          loadedRef.current = true;
          setLoading(false);
        })
        .catch(() => setLoading(false));
    },
    [load],
  );

  // Eager pickers preload the first page; lazy ones wait for menu-open.
  useEffect(() => {
    if (eager && cfg && !loadedRef.current) runSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eager, cfg]);

  // Resolve a bare id's label (edit forms) via ?ids= when it isn't already
  // present in the loaded options or the resolved cache.
  const bareId =
    value != null && value !== "" && typeof value !== "object"
      ? String(value)
      : null;
  useEffect(() => {
    if (!cfg || !bareId || resolved[bareId]) return;
    if (options.some((o) => String(o.value) === bareId)) return;
    let alive = true;
    resolveEntityByIds(cfg, [bareId]).then((opts) => {
      const o = opts[0];
      if (alive && o) setResolved((r) => ({ ...r, [o.value]: o }));
    });
    return () => {
      alive = false;
    };
  }, [cfg, bareId, resolved, options]);

  if (!cfg) return null;

  const displayValue =
    value == null || value === ""
      ? null
      : typeof value === "object"
        ? value
        : options.find((o) => String(o.value) === String(value)) ||
          resolved[String(value)] || { value: String(value), label: "…" };

  return (
    <Select
      classNamePrefix="select"
      options={options}
      value={displayValue}
      isLoading={loading}
      isClearable={isClearable}
      // Server already filtered — don't also client-filter (would hide the
      // selected label option, etc.).
      filterOption={() => true}
      onMenuOpen={() => {
        if (!loadedRef.current) runSearch("");
      }}
      onInputChange={(input, meta) => {
        if (meta.action === "input-change") runSearch(input);
      }}
      onChange={(opt) => {
        if (opt) setResolved((r) => ({ ...r, [opt.value]: opt }));
        onChange?.(opt || null);
      }}
      loadingMessage={() => "…"}
      noOptionsMessage={({ inputValue }) =>
        loading ? "…" : inputValue ? "No matches" : "Type to search"
      }
      {...rest}
    />
  );
};

export default EntitySearchSelect;
