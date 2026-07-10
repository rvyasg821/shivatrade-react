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
import Select from "react-select";
import ReactPaginate from "react-paginate";
import { ArrowLeft } from "react-feather";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot } from "@constant/defaultValues";

// GSTR-1 UQC fallback (mirrors the add form's mapUomToUqc).
const mapUomToUqc = (unit) => {
  const u = (unit || "").trim().toUpperCase();
  const map = {
    KG: "KGS",
    KGS: "KGS",
    NOS: "NOS",
    PIECE: "PCS",
    PCS: "PCS",
    PACK: "PAC",
    BOX: "BOX",
    LITRE: "LTR",
    LTR: "LTR",
    ML: "MLT",
    METER: "MTR",
    MTR: "MTR",
    SET: "SET",
  };
  return map[u] || "OTH";
};

const groupKey = (g) =>
  `${(g.currency_code || "").toUpperCase()}|${(g.country_of_destination || "")
    .trim()
    .toLowerCase()}`;

const SelectSoLines = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [rawGroups, setRawGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  // picks: { [po_line_id]: { selected, qty } }
  const [picks, setPicks] = useState({});
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  // Customer dropdown.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await instance.get(API_ENDPOINTS.customers.dropdown);
        const rows = resp?.data?.data || [];
        if (!cancelled) {
          setCustomerOptions(
            rows.map((c) => ({
              value: c._id,
              label: c.company_name || c.name || c._id,
            }))
          );
        }
      } catch {
        if (!cancelled) setCustomerOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch invoiceable SO groups for the chosen customer.
  useEffect(() => {
    if (!customerId) {
      setRawGroups([]);
      setPicks({});
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setPage(0);
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
  const pageCount = Math.max(1, Math.ceil(totalLines / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageItems = flatLines.slice(pageStart, pageStart + pageSize);
  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [pageCount, page]);

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
          uqc_code: mapUomToUqc(l.unit),
          qty: String(qty),
          unit_price: String(l.unit_price || 0),
          discount_pct: "0",
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
              <Select
                classNamePrefix="select"
                isClearable
                options={customerOptions}
                value={
                  customerOptions.find((o) => o.value === customerId) || null
                }
                onChange={(opt) => setCustomerId(opt ? opt.value : "")}
                placeholder={t("Pick a customer")}
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
                {t("No invoiceable (dispatched) SO lines for this customer.")}
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
