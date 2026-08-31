// Select Sales Order lines — full-page version of the customer-first multi-SO
// line picker (the "Create Invoice" entry on the invoice listing). Mirrors the
// CreatePoVendor page layout (header + back, Card, footer actions). On Add it
// navigates to the invoice add page with the picked lines in router state —
// exactly what `MultiSoPickerModal`'s onConfirm used to do.
//
// The wizard's "+ Add items from another SO" keeps using MultiSoPickerModal,
// since that appends to an in-progress (unsaved) draft and can't navigate away.

import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Spinner,
  Input,
  Badge,
} from "reactstrap";
import EntitySearchSelect from "@components/entity-select";
import {
  usePagination,
  TablePaginationBar,
} from "@src/views/_shared/table/TablePagination";
import { ArrowLeft } from "react-feather";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot } from "@constant/defaultValues";
// GST UQC comes from the UOM master, not a local copy of the mapping.
import { useUqcResolver } from "@src/views/_shared/uom/useUomOptions";


const groupKey = (g) =>
  `${(g.currency_code || "").toUpperCase()}|${(g.country_of_destination || "")
    .trim()
    .toLowerCase()}`;

const SelectSoLines = () => {
  const uqcFor = useUqcResolver();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [customerId, setCustomerId] = useState("");
  const [rawGroups, setRawGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  // picks: { [po_line_id]: { selected, qty } }
  const [picks, setPicks] = useState({});


  // Fetch invoiceable SO groups for the chosen customer.
  useEffect(() => {
    if (!customerId) {
      setRawGroups([]);
      setPicks({});
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    pg.resetPage();
    (async () => {
      try {
        const resp = await instance.get(
          `${API_ENDPOINTS.invoices.customerInvoiceable}/${customerId}`
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
  }, [customerId]);

  const groups = useMemo(
    () => rawGroups.filter((g) => (g.lines || []).length > 0),
    [rawGroups]
  );

  // Active key: from the first group that has any selected line. Groups whose
  // key differs are disabled (one invoice = one currency + country).
  const activeKey = useMemo(() => {
    for (const g of groups) {
      const anySelected = (g.lines || []).some(
        (l) => picks[l.purchase_order_line_id]?.selected
      );
      if (anySelected) return groupKey(g);
    }
    return null;
  }, [groups, picks]);

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
  const pg = usePagination(totalLines);
  const pageItems = flatLines.slice(pg.pageStart, pg.pageStart + pg.pageSize);

  // Re-group the current page's lines back into SO boxes (in order).
  const pageGroups = useMemo(() => {
    const map = new Map();
    for (const { g, l } of pageItems) {
      if (!map.has(g.po_id)) map.set(g.po_id, { g, lines: [] });
      map.get(g.po_id).lines.push(l);
    }
    return Array.from(map.values());
  }, [pageItems]);

  // "Select all" targets the combinable set: lines in groups matching the
  // active key (else the first group's). Toggling off clears them.
  const selectAllKey = activeKey || (groups[0] ? groupKey(groups[0]) : null);
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
          out[id] = { selected: next, qty: out[id]?.qty ?? l.available };
        }
      }
      return out;
    });
  };

  const backToList = () => navigate(`${appsRoot}/invoices`);

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
          // The source SO's ORIGINAL advance + its currently-unclaimed
          // remainder — seeds the invoice form's per-SO Advance table (same
          // fields MultiSoPickerModal carries).
          so_advance_amount: g.advance_amount ?? "0",
          so_remaining_advance: g.remaining_advance ?? g.advance_amount ?? "0",
          so_voucher_no: g.po_voucher_no || "",
          so_freight_total: g.freight_total ?? "0",
          purchase_order_line_id: l.purchase_order_line_id,
          po_vendor_line_id: undefined,
          product_id: l.product_id,
          product_name: l.product_name || "",
          product_code: l.product_code || "",
          // PO is multi-vendor at line level — carry the SO line's own
          // vendor forward (was missing → the invoice line showed "Pick
          // vendor" instead of the SO's actual vendor).
          vendor_id: l.vendor_id || "",
          vendor_name: l.vendor_name || "",
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
          // source→document rate so the invoice line total converts
          // correctly (line total = qty × unit_price × cost_exchange_rate).
          // Without these the rate defaults to 1 and a foreign line shows
          // its raw source value.
          source_currency_code: l.source_currency_code || "INR",
          cost_exchange_rate:
            l.cost_exchange_rate != null && l.cost_exchange_rate !== ""
              ? String(l.cost_exchange_rate)
              : "1",
          // Costing snapshot — carry the SO line's own discount/margin
          // forward (was hardcoded "0"/omitted, silently dropping both).
          discount_pct: String(l.discount_pct || 0),
          margin_pct: String(l.margin_pct || 0),
          tax_pct: "0",
          igst_rate_pct: String(l.tax_pct || 0),
          product_rebates_snapshot: Array.isArray(l.product_rebates_snapshot)
            ? l.product_rebates_snapshot
            : [],
          product_expenses_snapshot: Array.isArray(l.product_expenses_snapshot)
            ? l.product_expenses_snapshot
            : [],
          packages: l.package_count != null ? String(l.package_count) : "",
          net_weight: l.net_weight_kg != null ? String(l.net_weight_kg) : "",
          gross_weight:
            l.gross_weight_kg != null ? String(l.gross_weight_kg) : "",
        });
      }
    }
    if (!out.length) return;
    navigate(`${appsRoot}/invoices/add`, {
      state: { multiSo: { ...chosen, lines: out } },
    });
  };

  return (
    <Fragment>
      <div className="app-user-view">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Create Invoice")}</h3>
          <Button color="secondary" outline onClick={backToList}>
            <ArrowLeft size={16} />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <h5 className="mb-0">{t("Select Sales Order lines")}</h5>
          </CardHeader>
          <CardBody>
            <div className="mb-2" style={{ maxWidth: 480 }}>
              <label className="form-label">{t("Customer")}</label>
              <EntitySearchSelect
                kind="customer"
                isClearable
                value={customerId || null}
                onChange={(opt) => setCustomerId(opt ? opt.value : "")}
                placeholder={t("Search & pick a customer")}
              />
            </div>

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

                <TablePaginationBar {...pg} totalRows={totalLines} />
              </Fragment>
            )}
          </CardBody>
          <CardFooter className="d-flex justify-content-end gap-1">
            <Button color="secondary" outline onClick={backToList}>
              {t("Cancel")}
            </Button>
            <Button
              color="primary"
              disabled={selectedCount === 0}
              onClick={handleConfirm}
            >
              {t("Add")} {selectedCount > 0 ? `(${selectedCount})` : ""}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Fragment>
  );
};

export default SelectSoLines;
