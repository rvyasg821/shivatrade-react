// MultiSoPickerModal — customer-first multi-SO line picker.
//
// Shared by two entry points (SHIPPING_INVOICE_MERGE_PLAN §5b):
//   1. Invoice listing "Create Invoice" — no customer locked yet; the
//      operator picks a customer, then ticks invoiceable lines across that
//      customer's confirmed SOs (grouped by SO).
//   2. Wizard "+ Add items from another SO" — customer + currency + country
//      already locked by the in-progress invoice; non-matching SOs disabled.
//
// Invariant: one invoice = one customer + one currency + one country. The
// first SO with a ticked line sets the "active key" (currency|country); SOs
// that don't match are disabled with a hint.

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Spinner,
  Input,
  Badge,
} from "reactstrap";
import EntitySearchSelect from "@components/entity-select";
import ReactPaginate from "react-paginate";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
// GST UQC comes from the UOM master, not a local copy of the mapping.
import { useUqcResolver } from "@src/views/_shared/uom/useUomOptions";


const groupKey = (g) =>
  `${(g.currency_code || "").toUpperCase()}|${(g.country_of_destination || "")
    .trim()
    .toLowerCase()}`;

const MultiSoPickerModal = ({
  isOpen,
  toggle,
  customerId: lockedCustomerId,
  lockCurrency,
  lockCountry,
  excludeInvoiceId,
  existingPoLineIds = [],
  onConfirm,
}) => {
  const uqcFor = useUqcResolver();
  const { t } = useTranslation();

  const [customerId, setCustomerId] = useState(lockedCustomerId || "");
  const [rawGroups, setRawGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  // picks: { [po_line_id]: { selected, qty } }
  const [picks, setPicks] = useState({});
  // Client-side pagination over the flattened line items.
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  const customerLocked = !!lockedCustomerId;
  const existing = useMemo(
    () => new Set((existingPoLineIds || []).map(String)),
    [existingPoLineIds]
  );

  // Reset on open; honour the locked customer.
  useEffect(() => {
    if (isOpen) {
      setCustomerId(lockedCustomerId || "");
      setRawGroups([]);
      setPicks({});
      setPage(0);
    }
  }, [isOpen, lockedCustomerId]);

  // Fetch invoiceable SO groups for the chosen customer. Deps are stable
  // (no `existing` here — that filter is applied at render via useMemo, so a
  // fresh existingPoLineIds array from the parent never re-triggers a fetch).
  useEffect(() => {
    if (!isOpen || !customerId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params = excludeInvoiceId
          ? { exclude_invoice_id: excludeInvoiceId }
          : {};
        const resp = await instance.get(
          `${API_ENDPOINTS.invoices.customerInvoiceable}/${customerId}`,
          { params }
        );
        const raw = resp?.data?.data || [];
        if (!cancelled) {
          setRawGroups(raw);
          const init = {};
          raw.forEach((g) =>
            (g.lines || []).forEach((l) => {
              init[l.purchase_order_line_id] = {
                selected: false,
                qty: l.available,
              };
            })
          );
          setPicks(init);
        }
      } catch {
        if (!cancelled) setRawGroups([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, customerId, excludeInvoiceId]);

  // Displayed groups = raw minus lines already on the in-progress draft;
  // empty groups dropped. Pure derivation — never triggers a re-fetch.
  const groups = useMemo(
    () =>
      rawGroups
        .map((g) => ({
          ...g,
          lines: (g.lines || []).filter(
            (l) => !existing.has(String(l.purchase_order_line_id))
          ),
        }))
        .filter((g) => g.lines.length > 0),
    [rawGroups, existing]
  );

  // Active key: from the wizard lock if provided, else from the first group
  // that has any selected line. Groups whose key differs are disabled.
  const activeKey = useMemo(() => {
    if (lockCurrency || lockCountry) {
      return `${(lockCurrency || "").toUpperCase()}|${(lockCountry || "")
        .trim()
        .toLowerCase()}`;
    }
    for (const g of groups) {
      const anySelected = g.lines.some(
        (l) => picks[l.purchase_order_line_id]?.selected
      );
      if (anySelected) return groupKey(g);
    }
    return null;
  }, [groups, picks, lockCurrency, lockCountry]);

  const isGroupEnabled = (g) => !activeKey || groupKey(g) === activeKey;

  const togglePick = (poLineId) =>
    setPicks((p) => ({
      ...p,
      [poLineId]: { ...p[poLineId], selected: !p[poLineId]?.selected },
    }));
  const setQty = (poLineId, qty) =>
    setPicks((p) => ({ ...p, [poLineId]: { ...p[poLineId], qty } }));

  const selectedCount = Object.values(picks).filter((p) => p?.selected).length;

  // Flatten lines across groups (carrying group context), then paginate.
  const flatLines = useMemo(() => {
    const arr = [];
    for (const g of groups) for (const l of g.lines) arr.push({ g, l });
    return arr;
  }, [groups]);
  const totalLines = flatLines.length;
  const pageCount = Math.max(1, Math.ceil(totalLines / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageItems = flatLines.slice(pageStart, pageStart + pageSize);
  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [pageCount, page]);

  // Re-group the current page's lines back into SO boxes (in order) so the
  // group headers + per-SO styling survive pagination.
  const pageGroups = useMemo(() => {
    const map = new Map();
    for (const { g, l } of pageItems) {
      if (!map.has(g.po_id)) map.set(g.po_id, { g, lines: [] });
      map.get(g.po_id).lines.push(l);
    }
    return Array.from(map.values());
  }, [pageItems]);

  // "Select all" targets the combinable set: lines in groups matching the
  // active key (locked, else the first group's). Toggling off clears them.
  const selectAllKey =
    activeKey || (groups[0] ? groupKey(groups[0]) : null);
  const selectableLineIds = useMemo(() => {
    if (!selectAllKey) return [];
    const ids = [];
    for (const g of groups) {
      if (groupKey(g) !== selectAllKey) continue;
      for (const l of g.lines) ids.push(l.purchase_order_line_id);
    }
    return ids;
  }, [groups, selectAllKey]);
  const allSelected =
    selectableLineIds.length > 0 &&
    selectableLineIds.every((id) => picks[id]?.selected);

  const toggleSelectAll = () => {
    const next = !allSelected;
    setPicks((p) => {
      const out = { ...p };
      for (const g of groups) {
        if (groupKey(g) !== selectAllKey) continue;
        for (const l of g.lines) {
          const id = l.purchase_order_line_id;
          out[id] = {
            selected: next,
            qty: out[id]?.qty ?? l.available,
          };
        }
      }
      return out;
    });
  };

  const handleConfirm = () => {
    const out = [];
    let chosen = null;
    for (const g of groups) {
      if (!isGroupEnabled(g)) continue;
      for (const l of g.lines) {
        const pick = picks[l.purchase_order_line_id];
        if (!pick?.selected) continue;
        const qty = Number(pick.qty || 0);
        if (qty <= 0) continue;
        if (!chosen) {
          chosen = {
            customer_id: customerId,
            currency_code: g.currency_code || "",
            country_of_destination: g.country_of_destination || "",
          };
        }
        out.push({
          purchase_order_id: g.po_id,
          purchase_order_line_id: l.purchase_order_line_id,
          po_vendor_line_id: undefined,
          product_id: l.product_id,
          product_name: l.product_name || "",
          product_code: l.product_code || "",
          // BE already resolves this as SO line → product master.
          part_no: l.part_no || "",
          description: l.product_name || "",
          hsn_code: l.hsn_code || "",
          customer_reference: l.customer_reference || "",
          unit: l.unit || "Nos",
          uqc_code: uqcFor(l.unit),
          qty: String(qty),
          unit_price: String(l.unit_price || 0),
          // Multi-currency: carry the SO line's source currency + frozen
          // source→document rate so the invoice line total converts correctly
          // (line total = qty × unit_price × cost_exchange_rate). Without these
          // the rate defaults to 1 and a foreign line shows its raw source value.
          source_currency_code: l.source_currency_code || "INR",
          cost_exchange_rate:
            l.cost_exchange_rate != null && l.cost_exchange_rate !== ""
              ? String(l.cost_exchange_rate)
              : "1",
          discount_pct: "0",
          tax_pct: "0",
          igst_rate_pct: String(l.tax_pct || 0),
          product_rebates_snapshot: Array.isArray(l.product_rebates_snapshot)
            ? l.product_rebates_snapshot
            : [],
          product_expenses_snapshot: Array.isArray(l.product_expenses_snapshot)
            ? l.product_expenses_snapshot
            : [],
          // Packing carried from the SO line (originally from quotation).
          packages: l.package_count != null ? String(l.package_count) : "",
          net_weight: l.net_weight_kg != null ? String(l.net_weight_kg) : "",
          gross_weight:
            l.gross_weight_kg != null ? String(l.gross_weight_kg) : "",
        });
      }
    }
    if (!out.length) return;
    onConfirm(out, chosen);
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg" backdrop="static">
      <ModalHeader toggle={toggle}>{t("Select Sales Order lines")}</ModalHeader>
      <ModalBody>
        {!customerLocked && (
          <div className="mb-2">
            <label className="form-label">{t("Customer")}</label>
            <EntitySearchSelect
              kind="customer"
              isClearable
              value={customerId || null}
              onChange={(opt) => setCustomerId(opt ? opt.value : "")}
              placeholder={t("Search & pick a customer")}
            />
          </div>
        )}

        {loading ? (
          <div className="text-center py-3">
            <Spinner size="sm" /> {t("Loading invoiceable SOs…")}
          </div>
        ) : !customerId ? (
          <div className="text-muted small py-2">
            {t("Pick a customer to see their invoiceable Sales Orders.")}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-muted small py-2">
            {t("No invoiceable SO lines for this customer (dispatched or in free stock).")}
          </div>
        ) : (
          <Fragment>
            {/* Select-all + selected count bar */}
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-1 mb-2">
              <Button
                size="sm"
                color="outline-primary"
                disabled={selectableLineIds.length === 0}
                onClick={toggleSelectAll}
              >
                {allSelected ? t("Clear all") : t("Select all")}
              </Button>
              <span className="small text-muted">
                {selectedCount} {t("selected")} · {totalLines} {t("lines")}
              </span>
            </div>

            {pageGroups.map((pg) => {
              const g = pg.g;
              const enabled = isGroupEnabled(g);
              return (
              <div
                key={g.po_id}
                className={`border rounded p-2 mb-2 ${
                  enabled ? "" : "bg-light opacity-50"
                }`}
              >
                <div className="d-flex flex-wrap align-items-center gap-1 mb-1">
                  <strong>{g.po_voucher_no || g.po_id}</strong>
                  {g.quotation_voucher_no && (
                    <span className="text-muted small">
                      · {t("Quote")} {g.quotation_voucher_no}
                    </span>
                  )}
                  {g.buyer_reference && (
                    <span className="text-muted small">
                      · {t("Req")} {g.buyer_reference}
                    </span>
                  )}
                  <Badge color="light-secondary" className="ms-1">
                    {g.currency_code || "—"}
                  </Badge>
                  {g.country_of_destination && (
                    <Badge color="light-secondary">
                      {g.country_of_destination}
                    </Badge>
                  )}
                  {!enabled && (
                    <span className="text-danger small ms-auto">
                      {t("Different currency/country — not combinable")}
                    </span>
                  )}
                </div>
                {pg.lines.map((l) => {
                  const pk = picks[l.purchase_order_line_id] || {};
                  return (
                    <div
                      key={l.purchase_order_line_id}
                      className="d-flex align-items-center gap-1 py-25 flex-wrap"
                    >
                      <Input
                        type="checkbox"
                        className="me-1 flex-shrink-0"
                        disabled={!enabled}
                        checked={!!pk.selected}
                        onChange={() =>
                          togglePick(l.purchase_order_line_id)
                        }
                      />
                      <span className="flex-grow-1" style={{ minWidth: 0 }}>
                        {l.product_code ? (
                          <code className="me-1 text-nowrap">
                            {l.product_code}
                          </code>
                        ) : null}
                        {l.product_name}
                      </span>
                      <span className="text-muted small me-1 flex-shrink-0">
                        {t("avail")} {l.available}
                      </span>
                      <Input
                        type="number"
                        bsSize="sm"
                        min="0"
                        step="0.01"
                        className="flex-shrink-0"
                        style={{ width: 90 }}
                        disabled={!enabled || !pk.selected}
                        value={pk.qty ?? ""}
                        onChange={(e) =>
                          setQty(l.purchase_order_line_id, e.target.value)
                        }
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}

            {totalLines > pageSize && (
              <div className="d-flex justify-content-between align-items-center flex-wrap mt-1 gap-1">
                <div className="d-flex align-items-center small text-muted">
                  <span className="me-50">{t("Show")}</span>
                  <Input
                    type="select"
                    bsSize="sm"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value) || 10);
                      setPage(0);
                    }}
                    style={{ width: 80 }}
                  >
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Input>
                  <span className="ms-50">
                    {t("of")} {totalLines} {t("lines")}
                  </span>
                </div>
                <ReactPaginate
                  previousLabel=""
                  nextLabel=""
                  pageCount={pageCount}
                  activeClassName="active"
                  forcePage={safePage}
                  onPageChange={({ selected }) => setPage(selected)}
                  pageClassName="page-item"
                  nextLinkClassName="page-link"
                  nextClassName="page-item next"
                  previousClassName="page-item prev"
                  previousLinkClassName="page-link"
                  pageLinkClassName="page-link"
                  containerClassName="pagination react-paginate line-items-paginator justify-content-end mb-0"
                />
              </div>
            )}
          </Fragment>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={toggle}>
          {t("Cancel")}
        </Button>
        <Button
          color="primary"
          disabled={selectedCount === 0}
          onClick={handleConfirm}
        >
          {t("Add")} {selectedCount > 0 ? `(${selectedCount})` : ""}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

MultiSoPickerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
  customerId: PropTypes.string,
  lockCurrency: PropTypes.string,
  lockCountry: PropTypes.string,
  excludeInvoiceId: PropTypes.string,
  existingPoLineIds: PropTypes.array,
  onConfirm: PropTypes.func.isRequired,
};

export default MultiSoPickerModal;
