// Shared hex-coloured status pill. Every status listing (Leads, RFQs,
// Quotations, Sales Orders, POVs, Vendors, Vendor Categories, Categories,
// Products, Price List, party-detail doc panels…) needs a status palette
// bigger than the fixed `doc-badge-{green,red,orange,gray}` set (see
// CLAUDE.md §1.5) — each one used to hand-roll its own hex-map + a `ref`
// callback that force-sets background/text via `style.setProperty(...,
// "important")`, because the global `.badge` CSS rule otherwise wins over
// any inline style or class. This is the one place that ref-hack lives now.
//
// Usage: build a `{ [status]: hex }` map local to the caller (its labels and
// palette are its own business), then render:
//   <StatusPill label={t(map[row.status]?.label || row.status)} hex={map[row.status]?.hex || "#6c757d"} />
// or use the `statusColumn` helper in _shared/party/PartyDocListPanel.js when
// building a column for that shared table.
const StatusPill = ({ label, hex, className = "" }) => (
  <span
    className={`badge rounded-pill text-capitalize text-nowrap ${className}`.trim()}
    ref={(el) => {
      if (el) {
        el.style.setProperty("background-color", `${hex}1f`, "important");
        el.style.setProperty("color", hex, "important");
      }
    }}
  >
    {label}
  </span>
);

export default StatusPill;
