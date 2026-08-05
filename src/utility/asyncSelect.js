// Helpers for server-side searchable dropdowns (vendors / customers / products).
// The matching /dropdown endpoints accept ?search=&limit= and return the first
// `limit` rows (default 10), then top matches as the user types — so the full
// list is never shipped to the client.

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

// Build a debounced `loadOptions` function for react-select/async, backed by a
// /dropdown endpoint. `minChars: 0` loads the first page as soon as the menu
// opens ("show 10, then search"). Each call to this factory keeps its OWN timer
// so two open dropdowns don't cancel each other.
export const makeDropdownLoader = (
  endpoint,
  mapRow,
  { limit = 10, minChars = 0, debounceMs = 300 } = {},
) => {
  let timer = null;
  return (input) =>
    new Promise((resolve) => {
      if (timer) clearTimeout(timer);
      const term = (input || "").trim();
      if (term.length < minChars) {
        resolve([]);
        return;
      }
      timer = setTimeout(async () => {
        try {
          const resp = await instance.get(endpoint, {
            params: { search: term || undefined, limit },
          });
          resolve((resp?.data?.data || []).map(mapRow));
        } catch {
          resolve([]);
        }
      }, debounceMs);
    });
};

// Row → react-select option ({ value, label, raw }). `raw` keeps the full row
// so call sites can read extra fields (currency, code, price, …) on select.
export const vendorOption = (v) => ({
  value: v._id,
  label: v.vendor_code ? `${v.company_name} (${v.vendor_code})` : v.company_name,
  raw: v,
});
export const customerOption = (c) => ({
  value: c._id,
  label: c.company_name || c.name,
  raw: c,
});
export const productOption = (p) => ({
  value: p._id,
  label: `${p.code ? `${p.code} - ` : ""}${p.name}`,
  raw: p,
});

// Endpoint + mapper per entity kind (consumed by <EntitySearchSelect kind=…/>).
export const ENTITY_KINDS = {
  vendor: { endpoint: API_ENDPOINTS.vendors.dropdown, map: vendorOption },
  customer: { endpoint: API_ENDPOINTS.customers.dropdown, map: customerOption },
  product: { endpoint: API_ENDPOINTS.products.dropdown, map: productOption },
};

// Resolve options for already-selected ids (edit forms) so the picker can show
// a label without loading the whole list. Hits the same /dropdown with ?ids=.
export const resolveEntityByIds = (cfg, ids) => {
  const list = (ids || []).filter(Boolean);
  if (!cfg || !list.length) return Promise.resolve([]);
  return instance
    .get(cfg.endpoint, { params: { ids: list.join(",") } })
    .then((r) => (r?.data?.data || []).map(cfg.map))
    .catch(() => []);
};
