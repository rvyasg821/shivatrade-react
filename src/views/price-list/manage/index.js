// Manage Vendor Pricing by Product.
// Product is fixed (from the URL); the grid below holds one row per vendor with
// that vendor's CURRENT price (newest effective_date). Editing a saved row marks
// it dirty and bumps its effective date to today; on Save each dirty/new row is
// inserted as a NEW VERSION (POST /price-list/bulk) — the prior price
// auto-expires via the effective_date logic. History per vendor is on demand.

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardBody,
  Row,
  Col,
  Button,
  Table,
  Input,
  InputGroup,
  InputGroupText,
  Spinner,
  Badge,
} from "reactstrap";
import EntitySearchSelect from "@components/entity-select";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
} from "react-feather";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import Notification from "@components/toast/notification";
import DateInput from "@components/date-input";
import { getCurrencyDropdown } from "@src/views/currencies/store";
import {
  usePagination,
  TablePaginationBar,
} from "@src/views/_shared/table/TablePagination";

const todayISO = () => new Date().toISOString().slice(0, 10);

// Editable fields compared for dirty detection.
const EDITABLE = [
  "vendor_id",
  "unit_price",
  "lead_time_days",
  "effective_date",
];

let keySeq = 0;
const nextKey = () => `row-${++keySeq}`;

const ManageVendorPricing = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const vendorStore = useSelector((s) => s.vendor);
  const currencyStore = useSelector((s) => s.currency);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [rows, setRows] = useState([]);
  const [historyByVendor, setHistoryByVendor] = useState({});
  const [expanded, setExpanded] = useState({});

  // Same pagination as the other line-item grids — a widely-sourced product
  // can have far more than 10 pricing vendors.
  const pg = usePagination(rows.length);

  // Fallback (default) currency — used when a vendor has no currency set.
  const currency = useMemo(() => {
    const list = currencyStore?.currencyDropdown || [];
    return (
      list.find((c) => c.is_default) ||
      list.find((c) => (c.code || "").toUpperCase() === "INR") ||
      list[0] ||
      null
    );
  }, [currencyStore?.currencyDropdown]);

  // Multi-currency: each vendor prices in ITS OWN currency (vendor.currency_code).
  // Map code→currency row and vendor→code so every grid line resolves its own
  // currency id + symbol; fall back to the default currency. (Plan §6.2.)
  const currencyByCode = useMemo(() => {
    const m = {};
    for (const c of currencyStore?.currencyDropdown || []) {
      if (c.code) m[(c.code || "").toUpperCase()] = c;
    }
    return m;
  }, [currencyStore?.currencyDropdown]);

  const vendorCurrencyCodeById = useMemo(() => {
    const m = {};
    for (const v of vendorStore?.vendorDropdown || []) {
      if (v._id) m[v._id] = (v.currency_code || "").toUpperCase();
    }
    return m;
  }, [vendorStore?.vendorDropdown]);

  const rowCurrency = useCallback(
    (r) => {
      // Existing rows keep the currency their price was stored in; new rows
      // default to the vendor's currency. Fall back to the app default.
      const code = (
        r?.currency_code ||
        vendorCurrencyCodeById[r?.vendor_id] ||
        ""
      ).toUpperCase();
      return (code && currencyByCode[code]) || currency;
    },
    [vendorCurrencyCodeById, currencyByCode, currency]
  );


  // Vendor ids already represented by a current row — keep the add-dropdown clean.
  const usedVendorIds = useMemo(
    () => new Set(rows.map((r) => r.vendor_id).filter(Boolean)),
    [rows]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, curRes, listRes] = await Promise.all([
        instance.get(`${API_ENDPOINTS.products.get}/${productId}`),
        instance.get(`${API_ENDPOINTS.priceList.byProduct}/${productId}`),
        instance.get(API_ENDPOINTS.priceList.list, {
          params: { product_id: productId, perPage: 500, page: 1 },
        }),
      ]);
      setProduct(prodRes?.data?.data || null);

      const current = curRes?.data?.data || [];
      setRows(
        current.map((r) => {
          const base = {
            _key: nextKey(),
            price_list_id: r._id,
            vendor_id: r.vendor_id,
            vendor_name: r.vendor_name,
            vendor_code: r.vendor_code,
            // Currency this row's price is stored in (kept on edit).
            currency_code: r.currency_code,
            currency_symbol: r.currency_symbol,
            unit_price: r.unit_price ?? "",
            lead_time_days: r.lead_time_days ?? "",
            effective_date: (r.effective_date || "").slice(0, 10),
            _isNew: false,
          };
          base._original = EDITABLE.reduce(
            (o, f) => ({ ...o, [f]: base[f] }),
            {}
          );
          return base;
        })
      );

      const all = listRes?.data?.data || [];
      const grouped = {};
      for (const r of all) {
        const vid = r?.vendor_id?.toString();
        if (!vid) continue;
        (grouped[vid] ||= []).push(r);
      }
      for (const vid of Object.keys(grouped)) {
        grouped[vid].sort((a, b) =>
          String(b.effective_date || "").localeCompare(
            String(a.effective_date || "")
          )
        );
      }
      setHistoryByVendor(grouped);
      pg.resetPage();
    } catch (e) {
      Notification("Error", t("Could not load vendor pricing."), "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    dispatch(getCurrencyDropdown());
    if (productId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // ── Row helpers ──────────────────────────────────────────────────────────
  const isDirty = (r) =>
    r._isNew || (r._original && EDITABLE.some((f) => `${r[f] ?? ""}` !== `${r._original[f] ?? ""}`));

  const setField = (key, field, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r;
        const next = { ...r, [field]: value };
        // Editing a saved row auto-bumps the effective date to today (a new
        // version) — unless the user is editing the date itself, or already
        // changed it from the saved value.
        if (
          !r._isNew &&
          field !== "effective_date" &&
          r.effective_date === r._original?.effective_date
        ) {
          next.effective_date = todayISO();
        }
        return next;
      })
    );
  };

  const revertRow = (key) =>
    setRows((prev) =>
      prev.map((r) =>
        r._key === key && r._original
          ? { ...r, ...r._original }
          : r
      )
    );

  const removeRow = (key) =>
    setRows((prev) => prev.filter((r) => r._key !== key));

  const addRow = () => {
    // Jump to the page that will hold the appended row, so "Add Vendor"
    // doesn't silently land on a page the user isn't looking at.
    pg.jumpToEnd(rows.length);
    setRows((prev) => [
      ...prev,
      {
        _key: nextKey(),
        price_list_id: null,
        vendor_id: "",
        unit_price: "",
        lead_time_days: "",
        effective_date: todayISO(),
        _isNew: true,
        _original: null,
      },
    ]);
  };

  const toggleHistory = (vid) =>
    setExpanded((m) => ({ ...m, [vid]: !m[vid] }));

  // ── Save ─────────────────────────────────────────────────────────────────
  const dirtyRows = rows.filter(isDirty);

  const onSave = async () => {
    if (!currency?._id) {
      Notification("Error", t("Base currency not found."), "warning");
      return;
    }
    // Validate the rows we're about to save.
    for (const r of dirtyRows) {
      if (!r.vendor_id) {
        Notification("Validation", t("Select a vendor for every new row."), "warning");
        return;
      }
      if (r.unit_price === "" || Number.isNaN(Number(r.unit_price))) {
        Notification("Validation", t("Enter a valid price for each changed row."), "warning");
        return;
      }
      if (!r.effective_date) {
        Notification("Validation", t("Effective date is required."), "warning");
        return;
      }
    }
    const items = dirtyRows.map((r) => ({
      vendor_id: r.vendor_id,
      product_id: productId,
      // Price is native to the VENDOR's currency (falls back to default).
      currency_id: (rowCurrency(r) || currency)._id,
      unit_price: Number(r.unit_price).toFixed(2),
      lead_time_days:
        r.lead_time_days !== "" ? Number(r.lead_time_days) : undefined,
      effective_date: r.effective_date,
    }));

    setSaving(true);
    try {
      await instance.post(API_ENDPOINTS.priceList.bulk, { items });
      Notification(
        "Success",
        t("Saved {{n}} price update(s).").replace("{{n}}", items.length),
        "success"
      );
      await loadData();
      setExpanded({});
    } catch (e) {
      Notification(
        "Error",
        e?.response?.data?.message || t("Could not save pricing."),
        "warning"
      );
    } finally {
      setSaving(false);
    }
  };

  const totalRows = rows.length;
  const pageRows = rows.slice(pg.pageStart, pg.pageStart + pg.pageSize);

  const sym = currency?.symbol || "₹";

  const money2 = (v, symArg = sym) =>
    v === "" || v === null || v === undefined || Number.isNaN(Number(v))
      ? "-"
      : `${symArg}${Number(v).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

  return (
    <Fragment>
      <div className="main-content price-list">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
          <h3 className="mb-0">{t("Manage Vendor Pricing")}</h3>
          <Button
            color="flat-secondary"
            size="sm"
            onClick={() => navigate(`${appsRoot}/products`)}
          >
            <ArrowLeft size={14} className="me-25" /> {t("Back to Products")}
          </Button>
        </div>

        {/* ── Product context (read-only) ── */}
        <Card className="mb-1">
          <CardBody>
            {loading && !product ? (
              <div className="d-flex justify-content-center py-2">
                <Spinner color="primary" size="sm" />
              </div>
            ) : (
              <Row className="align-items-center gy-1">
                <Col md="5">
                  <div
                    className="fw-bold text-capitalize"
                    style={{ color: "#09418B", fontSize: "1.05rem" }}
                  >
                    {product?.name || "-"}
                  </div>
                  {product?.code ? (
                    <span className="small text-muted text-uppercase">
                      {product.code}
                    </span>
                  ) : null}
                </Col>
                <Col md="7">
                  <div className="d-flex flex-wrap gap-1 justify-content-md-end align-items-center">
                    {product?.hsn_code ? (
                      <span className="small">
                        <span className="text-muted">{t("HSN")}: </span>
                        <span className="fw-semibold">{product.hsn_code}</span>
                      </span>
                    ) : null}
                    {product?.tax_pct != null && product?.tax_pct !== "" ? (
                      <span className="small">
                        <span className="text-muted">{t("GST")}: </span>
                        <span className="fw-semibold">
                          {Number(product.tax_pct)}%
                        </span>
                      </span>
                    ) : null}
                    {product?.part_no ? (
                      <span className="small">
                        <span className="text-muted">{t("Part No")}: </span>
                        <span className="fw-semibold">{product.part_no}</span>
                      </span>
                    ) : null}
                    {!product?.hsn_code &&
                    (product?.tax_pct == null || product?.tax_pct === "") &&
                    !product?.part_no ? (
                      <span className="small text-muted fst-italic">
                        {t("No HSN / GST / Part No set on this product")}
                      </span>
                    ) : null}
                    <Badge color="light-primary" className="text-nowrap">
                      {t("Each price is in the vendor's currency")}
                    </Badge>
                  </div>
                </Col>
              </Row>
            )}
          </CardBody>
        </Card>

        {/* ── Vendor pricing grid ── */}
        <Card>
          <CardBody>
            <div className="d-flex align-items-center justify-content-between mb-1 flex-wrap gap-1">
              <h5 className="mb-0">{t("Vendor Prices")}</h5>
              <div className="d-flex gap-1">
                <Button color="outline-primary" size="sm" onClick={addRow}>
                  <Plus size={14} className="me-25" /> {t("Add Vendor")}
                </Button>
                <Button
                  color="primary"
                  size="sm"
                  disabled={saving || dirtyRows.length === 0}
                  onClick={onSave}
                >
                  {saving ? (
                    <Spinner size="sm" className="me-25" />
                  ) : null}
                  {dirtyRows.length > 0
                    ? t("Save {{n}} changes").replace(
                        "{{n}}",
                        dirtyRows.length
                      )
                    : t("Save Changes")}
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="d-flex justify-content-center py-4">
                <Spinner color="primary" />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center text-muted py-4">
                {t("No vendor pricing yet. Add a vendor to set the first price.")}
              </div>
            ) : (
              <div className="table-responsive">
                <Table bordered size="sm" className="mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 28 }} />
                      <th style={{ minWidth: 200 }}>{t("Vendor")}</th>
                      <th className="text-end" style={{ width: 170 }}>
                        {t("Unit Price")}
                      </th>
                      <th className="text-end" style={{ width: 110 }}>
                        {t("Lead (days)")}
                      </th>
                      <th style={{ width: 150 }}>{t("Effective")}</th>
                      <th style={{ width: 80 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => {
                      const dirty = isDirty(r);
                      const vid = r.vendor_id;
                      const rc = rowCurrency(r);
                      const rcSym = rc?.symbol || sym;
                      const hist = historyByVendor[vid] || [];
                      const hasHistory = hist.length > 0;
                      const open = !!expanded[vid];
                      const accent = r._isNew
                        ? "#198754"
                        : dirty
                          ? "#fd7e14"
                          : "transparent";
                      return (
                        <Fragment key={r._key}>
                          <tr
                            style={{
                              borderLeft: `3px solid ${accent}`,
                            }}
                          >
                            <td className="text-center">
                              {hasHistory ? (
                                <span
                                  role="button"
                                  className="text-muted"
                                  onClick={() => toggleHistory(vid)}
                                >
                                  {open ? (
                                    <ChevronDown size={16} />
                                  ) : (
                                    <ChevronRight size={16} />
                                  )}
                                </span>
                              ) : null}
                            </td>
                            <td>
                              {r._isNew ? (
                                <EntitySearchSelect
                                  kind="vendor"
                                  menuPortalTarget={document.body}
                                  styles={{
                                    menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                                  }}
                                  isClearable={false}
                                  value={vid || null}
                                  onChange={(opt) => {
                                    const v = opt ? opt.value : "";
                                    // No duplicate vendor for this product.
                                    if (v && v !== vid && usedVendorIds.has(v)) {
                                      Notification(
                                        "Validation",
                                        t("This vendor is already in the list."),
                                        "warning"
                                      );
                                      return;
                                    }
                                    setField(r._key, "vendor_id", v);
                                    // Stamp the vendor's currency so the row
                                    // resolves it without loading all vendors.
                                    setField(
                                      r._key,
                                      "currency_code",
                                      opt?.raw?.currency_code || ""
                                    );
                                  }}
                                  placeholder={t("Search vendor")}
                                />
                              ) : (
                                <div>
                                  <div className="fw-semibold text-capitalize">
                                    {r.vendor_name || "-"}
                                  </div>
                                  <div className="d-flex align-items-center gap-50">
                                    {r.vendor_code ? (
                                      <span className="small text-muted text-uppercase">
                                        {r.vendor_code}
                                      </span>
                                    ) : null}
                                    {dirty ? (
                                      <Badge color="light-warning" pill>
                                        {t("Modified")}
                                      </Badge>
                                    ) : null}
                                  </div>
                                </div>
                              )}
                              {r._isNew ? (
                                <Badge color="light-success" pill className="mt-25">
                                  {t("New")}
                                </Badge>
                              ) : null}
                            </td>
                            <td>
                              <InputGroup size="sm">
                                <InputGroupText
                                  className="px-50 text-uppercase"
                                  title={rc?.code || ""}
                                >
                                  {rcSym}
                                </InputGroupText>
                                <Input
                                  bsSize="sm"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  inputMode="decimal"
                                  className="text-end"
                                  value={r.unit_price}
                                  onChange={(e) =>
                                    setField(r._key, "unit_price", e.target.value)
                                  }
                                  onBlur={(e) => {
                                    const v = e.target.value;
                                    if (v !== "" && !Number.isNaN(Number(v)))
                                      setField(
                                        r._key,
                                        "unit_price",
                                        Number(v).toFixed(2)
                                      );
                                  }}
                                />
                              </InputGroup>
                              {dirty &&
                              !r._isNew &&
                              r._original?.unit_price !== "" &&
                              `${r.unit_price}` !==
                                `${r._original?.unit_price}` ? (
                                <small className="text-muted">
                                  {t("was")} {money2(r._original.unit_price, rcSym)}
                                </small>
                              ) : null}
                            </td>
                            <td>
                              <Input
                                bsSize="sm"
                                type="number"
                                min="0"
                                className="text-end"
                                value={r.lead_time_days}
                                onChange={(e) =>
                                  setField(
                                    r._key,
                                    "lead_time_days",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td>
                              <DateInput
                                value={r.effective_date || ""}
                                onChange={(dates, str, iso) =>
                                  setField(r._key, "effective_date", iso)
                                }
                              />
                            </td>
                            <td className="text-center">
                              {r._isNew ? (
                                <Trash2
                                  size={16}
                                  className="cursor-pointer text-danger"
                                  onClick={() => removeRow(r._key)}
                                />
                              ) : dirty ? (
                                <RotateCcw
                                  size={16}
                                  className="cursor-pointer text-muted"
                                  title={t("Revert")}
                                  onClick={() => revertRow(r._key)}
                                />
                              ) : null}
                            </td>
                          </tr>

                          {open
                            ? hist.slice(0, 5).map((h) => (
                                <tr key={h._id} className="bg-light">
                                  <td />
                                  <td className="small text-muted">
                                    {t("History")}
                                  </td>
                                  <td className="text-end small fw-semibold">
                                    {money2(h.unit_price, rcSym)}
                                  </td>
                                  <td className="text-end small">
                                    {h.lead_time_days ?? "-"}
                                  </td>
                                  <td className="small" colSpan={2}>
                                    {formatDate(h.effective_date)}
                                    {h.effective_until ? (
                                      <span className="text-muted">
                                        {" "}
                                        → {formatDate(h.effective_until)}
                                      </span>
                                    ) : (
                                      <span className="text-muted">
                                        {" "}
                                        → {t("current")}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
            <TablePaginationBar {...pg} totalRows={totalRows} />
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default ManageVendorPricing;
