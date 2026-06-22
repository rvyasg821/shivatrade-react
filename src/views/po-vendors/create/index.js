// Full-page "Create Vendor PO (POV)" flow. Two modes in one page:
//   • Standalone (default) — enter product lines manually; no Sales Order.
//     Submits POST /admin/po-vendor/create.
//   • Linked — optionally pick a confirmed Sales Order; its pending lines
//     pre-fill (filtered by the chosen vendor) and it submits via the
//     existing POST /admin/po-vendor/from-po/:poId (participates in PO
//     coverage). Mirrors the old "Create POV" popup, now as a page modelled
//     on the Generate Sales Order page.

import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Input,
  Label,
  Table,
  Spinner,
} from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import { CheckCircle, ArrowLeft, Plus, Trash2 } from "react-feather";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import LocationSelect from "@src/views/_shared/LocationSelect";
import {
  createPoVendorStandalone,
  createPoVendorFromPo,
} from "@src/views/po-vendors/store";
import { getVendorDropdown } from "@src/views/vendors/store";
import { getProductDropdown } from "@src/views/products/store";
import { getExpenseDropdown } from "@src/views/expenses/store";
import { getPurchaseOrder } from "@src/views/purchase-orders/store";
import { appsRoot } from "@constant/defaultValues";
import { REBATE_EXPENSE_TYPE_OPTIONS } from "@constant/options";

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const POV_SOURCE_STATUSES = ["confirmed", "in_process"];
const newRow = () => ({
  key: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
  product_id: "",
  product_name: "",
  part_no: "",
  hsn_code: "",
  unit: "",
  tax_pct: "0",
  qty: "",
  unit_price: "",
});
const newCharge = () => ({
  key: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
  expense_id: "",
  type: "percent",
  value: "",
});

const CreatePoVendor = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const vendorStore = useSelector((s) => s.vendor);
  const productStore = useSelector((s) => s.product);
  const expenseStore = useSelector((s) => s.expense);
  const poFromStore = useSelector((s) => s.purchaseOrder?.purchaseOrderItem);

  const [creating, setCreating] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [deliveryAddressId, setDeliveryAddressId] = useState("");
  const [notes, setNotes] = useState("");

  // Standalone manual lines.
  const [lines, setLines] = useState([newRow()]);
  // Optional vendor charges (expenses): [{ expense_id, type, value }].
  const [charges, setCharges] = useState([]);

  // Optional Sales Order link.
  const [soOptions, setSoOptions] = useState([]);
  const [soLoading, setSoLoading] = useState(false);
  const [pickedSoId, setPickedSoId] = useState("");
  const [coverage, setCoverage] = useState(null);
  const [coverByLine, setCoverByLine] = useState({});
  const [priceByLine, setPriceByLine] = useState({});

  const linkedMode = !!pickedSoId;

  // ── Dropdowns ───────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(getVendorDropdown());
    dispatch(getProductDropdown());
    dispatch(getExpenseDropdown());
  }, [dispatch]);

  const expenseOptions = useMemo(
    () =>
      (expenseStore?.expenseDropdown || []).map((e) => ({
        value: e._id,
        label: e.code ? `${e.code} - ${e.name}` : e.name,
        raw: e,
      })),
    [expenseStore?.expenseDropdown]
  );

  const productOptions = useMemo(
    () =>
      (productStore?.productDropdown || []).map((p) => ({
        value: p._id,
        label: `${p.code ? p.code + " - " : ""}${p.name}`,
        raw: p,
      })),
    [productStore?.productDropdown]
  );

  // product_id → part_no, so linked-mode lines (coverage has no part_no)
  // can show the part number from the product master.
  const partNoByProductId = useMemo(() => {
    const m = new Map();
    for (const p of productStore?.productDropdown || [])
      if (p?.part_no) m.set(p._id, p.part_no);
    return m;
  }, [productStore?.productDropdown]);

  // Vendor options: full dropdown (standalone) or the SO's line vendors (linked).
  const soVendorOptions = useMemo(() => {
    const seen = new Map();
    for (const ln of poFromStore?.lines || []) {
      const vid = ln?.vendor_id;
      if (!vid || seen.has(vid)) continue;
      seen.set(vid, ln?.vendor_name || vid);
    }
    return Array.from(seen.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [poFromStore?.lines]);

  const vendorOptions = useMemo(() => {
    if (linkedMode && poFromStore?._id === pickedSoId) return soVendorOptions;
    return (vendorStore?.vendorDropdown || []).map((v) => {
      const name = v.company_name || v.name || "";
      return {
        value: v._id,
        label: v.vendor_code ? `${v.vendor_code} - ${name}` : name,
      };
    });
  }, [linkedMode, poFromStore, pickedSoId, soVendorOptions, vendorStore?.vendorDropdown]);

  // ── Sales Order picker options ───────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setSoLoading(true);
    instance
      .get(API_ENDPOINTS.purchaseOrders.list, {
        params: { orderBy: "createdAt", orderDirection: "desc", page: 1, perPage: 300 },
      })
      .then((resp) => {
        if (!mounted) return;
        const items = (resp?.data?.data || []).filter((p) =>
          POV_SOURCE_STATUSES.includes(p?.status)
        );
        setSoOptions(
          items.map((p) => ({
            value: p._id,
            label: [p.voucher_no, p.customer_name].filter(Boolean).join(" — "),
          }))
        );
      })
      .catch(() => mounted && setSoOptions([]))
      .finally(() => mounted && setSoLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  // On picking an SO: load detail (for vendor list) + coverage (pending qty).
  useEffect(() => {
    if (!pickedSoId) {
      setCoverage(null);
      setCoverByLine({});
      setPriceByLine({});
      return;
    }
    setVendorId("");
    dispatch(getPurchaseOrder(pickedSoId));
    let mounted = true;
    instance
      .get(`${API_ENDPOINTS.purchaseOrders.coverage}/${pickedSoId}/coverage`)
      .then((resp) => {
        if (!mounted) return;
        setCoverage(resp?.data?.data || null);
      })
      .catch(() => mounted && setCoverage(null));
    return () => {
      mounted = false;
    };
  }, [pickedSoId, dispatch]);

  // Inherit the SO's delivery address as the default pick.
  useEffect(() => {
    if (linkedMode && poFromStore?._id === pickedSoId && poFromStore?.delivery_address_id) {
      setDeliveryAddressId(poFromStore.delivery_address_id);
    }
  }, [linkedMode, poFromStore, pickedSoId]);

  // PO line _id → vendor_id, to filter coverage lines by the chosen vendor.
  const vendorByLineId = useMemo(() => {
    const m = new Map();
    for (const ln of poFromStore?.lines || []) m.set(ln._id, ln?.vendor_id || null);
    return m;
  }, [poFromStore?.lines]);

  // PO line _id → INR unit_price (coverage has no price; the PO line does).
  const poLinePriceById = useMemo(() => {
    const m = new Map();
    for (const ln of poFromStore?.lines || [])
      m.set(ln._id, ln?.unit_price != null ? String(ln.unit_price) : "");
    return m;
  }, [poFromStore?.lines]);

  const filteredCoverLines = useMemo(() => {
    if (!coverage?.lines) return [];
    if (!vendorId) return coverage.lines;
    return coverage.lines.filter(
      (l) => vendorByLineId.get(l.purchase_order_line_id) === vendorId
    );
  }, [coverage, vendorId, vendorByLineId]);

  // Seed cover qty (= pending) + price (= PO line price) when lines resolve.
  useEffect(() => {
    if (!coverage?.lines) return;
    const seedQty = {};
    const seedPrice = {};
    for (const l of coverage.lines) {
      seedQty[l.purchase_order_line_id] = String(num(l.pending));
      seedPrice[l.purchase_order_line_id] =
        poLinePriceById.get(l.purchase_order_line_id) || "";
    }
    setCoverByLine(seedQty);
    setPriceByLine(seedPrice);
  }, [coverage, poLinePriceById]);

  // ── Standalone line helpers ──────────────────────────────────────────
  const setRow = (key, patch) =>
    setLines((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // Vendor's INR rate for a product, from its price list (null if none).
  const fetchVendorPrice = (productId, vId) =>
    new Promise((resolve) => {
      if (!productId || !vId) return resolve(null);
      instance
        .get(`${API_ENDPOINTS.priceList.byProduct}/${productId}`)
        .then((resp) => {
          const match = (resp?.data?.data || []).find((r) => r.vendor_id === vId);
          resolve(match?.unit_price != null ? String(match.unit_price) : null);
        })
        .catch(() => resolve(null));
    });

  const onPickProduct = async (key, opt) => {
    const raw = opt?.raw || {};
    setRow(key, {
      product_id: opt ? opt.value : "",
      product_name: raw.name || "",
      part_no: raw.part_no || "",
      hsn_code: raw.hsn_code || "",
      unit: raw.unit_of_measure || "",
      tax_pct: raw.tax_pct != null ? String(raw.tax_pct) : "0",
      unit_price: "",
    });
    // Auto-fill the rate from the selected vendor's price list.
    if (opt && vendorId) {
      const price = await fetchVendorPrice(opt.value, vendorId);
      if (price != null) setRow(key, { unit_price: price });
    }
  };

  // Re-fill rates for product rows when the vendor changes (standalone mode).
  useEffect(() => {
    if (linkedMode || !vendorId) return;
    lines.forEach((r) => {
      if (!r.product_id) return;
      fetchVendorPrice(r.product_id, vendorId).then((price) => {
        if (price != null) setRow(r.key, { unit_price: price });
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  const standaloneTotal = useMemo(
    () => lines.reduce((s, r) => s + num(r.qty) * num(r.unit_price), 0),
    [lines]
  );
  const linkedTotal = useMemo(
    () =>
      filteredCoverLines.reduce(
        (s, l) =>
          s +
          num(coverByLine[l.purchase_order_line_id]) *
            num(priceByLine[l.purchase_order_line_id]),
        0
      ),
    [filteredCoverLines, coverByLine, priceByLine]
  );

  // ── Vendor charges (expenses) ────────────────────────────────────────
  const goodsTotal = linkedMode ? linkedTotal : standaloneTotal;
  const setCharge = (key, patch) =>
    setCharges((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const onPickExpense = (key, opt) => {
    const raw = opt?.raw || {};
    setCharge(key, {
      expense_id: opt ? opt.value : "",
      type: raw.type || "percent",
      value: raw.value != null ? String(raw.value) : "",
    });
  };
  // percent → % of goods total; fixed → flat amount.
  const chargeAmount = (c) =>
    !c.expense_id
      ? 0
      : c.type === "percent"
        ? (goodsTotal * num(c.value)) / 100
        : num(c.value);
  const chargesTotal = useMemo(
    () => charges.reduce((s, c) => s + chargeAmount(c), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [charges, goodsTotal]
  );
  const grandTotal = goodsTotal + chargesTotal;

  const backToList = () => navigate(`${appsRoot}/po-vendors`);

  const onCreate = async () => {
    if (creating) return;
    if (!vendorId) {
      Notification("Validation", t("Pick a vendor for this POV."), "warning");
      return;
    }

    const expensesPayload = charges
      .filter((c) => c.expense_id)
      .map((c) => ({
        expense_id: c.expense_id,
        type: c.type || "percent",
        value: String(num(c.value)),
      }));

    try {
      setCreating(true);
      let result;

      if (linkedMode) {
        // Linked → from-po flow (validated against PO pending).
        const poLines = [];
        for (const l of filteredCoverLines) {
          const q = num(coverByLine[l.purchase_order_line_id]);
          const max = num(l.pending);
          if (q <= 0) continue;
          if (q > max + 1e-6) {
            Notification(
              "Validation",
              t(`Line "${l.product_name || ""}": qty exceeds pending (${max}).`),
              "warning"
            );
            return;
          }
          poLines.push({
            purchase_order_line_id: l.purchase_order_line_id,
            ordered_qty: String(q),
            unit_price: String(num(priceByLine[l.purchase_order_line_id])),
          });
        }
        if (!poLines.length) {
          Notification(
            "Validation",
            t("Set at least one line to a non-zero quantity."),
            "warning"
          );
          return;
        }
        result = await dispatch(
          createPoVendorFromPo({
            purchase_order_id: pickedSoId,
            payload: {
              vendor_id: vendorId,
              lines: poLines,
              delivery_address_id: deliveryAddressId || undefined,
              notes: notes?.trim() || undefined,
              expenses: expensesPayload.length ? expensesPayload : undefined,
            },
          })
        ).unwrap();
      } else {
        // Standalone → /create.
        if (!deliveryAddressId) {
          Notification(
            "Validation",
            t("Pick a delivery address."),
            "warning"
          );
          return;
        }
        const payloadLines = [];
        for (const r of lines) {
          if (!r.product_id) continue;
          if (num(r.qty) <= 0 || num(r.unit_price) < 0 || r.unit_price === "") {
            Notification(
              "Validation",
              t("Each line needs a product, quantity and unit price."),
              "warning"
            );
            return;
          }
          payloadLines.push({
            product_id: r.product_id,
            ordered_qty: String(num(r.qty)),
            unit_price: String(num(r.unit_price)),
            description: r.product_name || undefined,
            hsn_code: r.hsn_code || undefined,
            unit: r.unit || undefined,
            tax_pct: r.tax_pct != null ? String(r.tax_pct) : undefined,
          });
        }
        if (!payloadLines.length) {
          Notification(
            "Validation",
            t("Add at least one product line."),
            "warning"
          );
          return;
        }
        result = await dispatch(
          createPoVendorStandalone({
            vendor_id: vendorId,
            lines: payloadLines,
            delivery_address_id: deliveryAddressId || undefined,
            notes: notes?.trim() || undefined,
            expenses: expensesPayload.length ? expensesPayload : undefined,
          })
        ).unwrap();
      }

      const created = result?.poVendorItem;
      if (created?._id) {
        Notification("Success", t(`${created.voucher_no} created.`), "success");
        navigate(`${appsRoot}/po-vendors/view/${created._id}`);
      }
    } catch (err) {
      Notification(
        "Error",
        (typeof err === "string" && err) || t("Failed to create POV"),
        "warning"
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Fragment>
      <div className="app-user-view">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t("Create Vendor PO")}</h3>
          <Button color="secondary" outline onClick={backToList}>
            <ArrowLeft size={16} />
          </Button>
        </div>

        <Card className="mb-1">
          <CardHeader>
            <h4 className="mb-0">{t("Vendor PO details")}</h4>
          </CardHeader>
          <CardBody>
            <div className="row g-2 mb-2">
              {/* Optional Sales Order link */}
              <div className="col-md-4">
                <Label className="form-label">
                  {t("Link Sales Order")}{" "}
                  <span className="text-muted small">({t("optional")})</span>
                </Label>
                <Select
                  isClearable
                  classNamePrefix="select"
                  isLoading={soLoading}
                  options={soOptions}
                  value={soOptions.find((o) => o.value === pickedSoId) || null}
                  onChange={(opt) => setPickedSoId(opt ? opt.value : "")}
                  placeholder={t("Standalone — or pick an SO to pre-fill")}
                />
                <small className="text-muted">
                  {linkedMode
                    ? t("Lines come from the SO's pending quantities.")
                    : t("Leave empty to create a standalone Vendor PO.")}
                </small>
              </div>

              {/* Vendor */}
              <div className="col-md-4">
                <Label className="form-label">
                  {t("Vendor")} <span className="text-danger">*</span>
                </Label>
                <Select
                  classNamePrefix="select"
                  options={vendorOptions}
                  value={vendorOptions.find((o) => o.value === vendorId) || null}
                  onChange={(opt) => setVendorId(opt ? opt.value : "")}
                  placeholder={t("Select vendor")}
                />
              </div>

              {/* Delivery address */}
              <div className="col-md-4">
                <Label className="form-label">
                  {t("Deliver To")}{" "}
                  {!linkedMode && <span className="text-danger">*</span>}
                </Label>
                <LocationSelect
                  value={deliveryAddressId}
                  onChange={setDeliveryAddressId}
                  autoSelectDefault={false}
                />
              </div>
            </div>

            {/* Lines */}
            <div className="d-flex justify-content-between align-items-center mb-1">
              <Label className="form-label mb-0">{t("Line Items")}</Label>
              {!linkedMode && (
                <Button
                  size="sm"
                  color="outline-primary"
                  onClick={() => setLines((r) => [...r, newRow()])}
                >
                  <Plus size={14} className="me-25" /> {t("Add Product")}
                </Button>
              )}
            </div>

            {linkedMode ? (
              !coverage ? (
                <div className="text-center py-3">
                  <Spinner size="sm" />{" "}
                  <span className="ms-1">{t("Loading SO lines…")}</span>
                </div>
              ) : (
                <Table bordered size="sm" className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 30 }}>#</th>
                      <th>{t("Product")}</th>
                      <th style={{ width: 80 }}>{t("UOM")}</th>
                      <th style={{ width: 80 }} className="text-end">
                        {t("Pending")}
                      </th>
                      <th style={{ width: 120 }} className="text-end">
                        {t("Qty")}
                      </th>
                      <th style={{ width: 130 }} className="text-end">
                        {t("Rate")} (₹)
                      </th>
                      <th style={{ width: 120 }} className="text-end">
                        {t("Amount")} (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCoverLines.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center text-muted py-2">
                          {vendorId
                            ? t("No pending lines for this vendor.")
                            : t("Pick a vendor to load lines.")}
                        </td>
                      </tr>
                    ) : (
                      filteredCoverLines.map((l, idx) => {
                        const id = l.purchase_order_line_id;
                        const max = num(l.pending);
                        const q = num(coverByLine[id]);
                        const price = num(priceByLine[id]);
                        return (
                          <tr key={id} style={max <= 1e-6 ? { opacity: 0.4 } : {}}>
                            <td>{idx + 1}</td>
                            <td>
                              <div className="fw-semibold">{l.product_name || "-"}</div>
                              {(() => {
                                const part = partNoByProductId.get(l.product_id);
                                return part || l.hsn_code ? (
                                  <small className="text-muted">
                                    {part ? `${t("Part")}: ${part}` : ""}
                                    {part && l.hsn_code ? " · " : ""}
                                    {l.hsn_code ? `HSN: ${l.hsn_code}` : ""}
                                  </small>
                                ) : null;
                              })()}
                            </td>
                            <td className="text-muted">{l.unit || "-"}</td>
                            <td className="text-end fw-semibold">
                              {max.toLocaleString()}
                            </td>
                            <td>
                              <Input
                                type="number"
                                min="0"
                                max={max}
                                bsSize="sm"
                                className="text-end"
                                disabled={max <= 1e-6}
                                value={coverByLine[id] ?? ""}
                                onChange={(e) =>
                                  setCoverByLine((s) => ({ ...s, [id]: e.target.value }))
                                }
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                bsSize="sm"
                                className="text-end"
                                value={priceByLine[id] ?? ""}
                                onChange={(e) =>
                                  setPriceByLine((s) => ({ ...s, [id]: e.target.value }))
                                }
                              />
                            </td>
                            <td className="text-end fw-bold">
                              {(q * price).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="table-light fw-bold">
                      <td colSpan={6} className="text-end">
                        {t("Total")}
                      </td>
                      <td className="text-end">{linkedTotal.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </Table>
              )
            ) : (
              <Table bordered size="sm" className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 30 }}>#</th>
                    <th>
                      {t("Product")} <span className="text-danger">*</span>
                    </th>
                    <th style={{ width: 80 }}>{t("UOM")}</th>
                    <th style={{ width: 120 }} className="text-end">
                      {t("Qty")} <span className="text-danger">*</span>
                    </th>
                    <th style={{ width: 130 }} className="text-end">
                      {t("Rate")} (₹) <span className="text-danger">*</span>
                    </th>
                    <th style={{ width: 120 }} className="text-end">
                      {t("Amount")} (₹)
                    </th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((r, idx) => (
                    <tr key={r.key}>
                      <td>{idx + 1}</td>
                      <td>
                        <Select
                          classNamePrefix="select"
                          menuPortalTarget={
                            typeof document !== "undefined" ? document.body : null
                          }
                          styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                          options={productOptions}
                          value={
                            productOptions.find((o) => o.value === r.product_id) || null
                          }
                          onChange={(opt) => onPickProduct(r.key, opt)}
                          placeholder={t("Select product")}
                        />
                        {(r.part_no || r.hsn_code) && (
                          <small className="text-muted">
                            {r.part_no ? `${t("Part")}: ${r.part_no}` : ""}
                            {r.part_no && r.hsn_code ? " · " : ""}
                            {r.hsn_code ? `HSN: ${r.hsn_code}` : ""}
                          </small>
                        )}
                      </td>
                      <td className="text-muted">{r.unit || "-"}</td>
                      <td>
                        <Input
                          type="number"
                          min="0"
                          step="0.0001"
                          bsSize="sm"
                          className="text-end"
                          value={r.qty}
                          onChange={(e) => setRow(r.key, { qty: e.target.value })}
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          bsSize="sm"
                          className="text-end"
                          value={r.unit_price}
                          onChange={(e) => setRow(r.key, { unit_price: e.target.value })}
                        />
                      </td>
                      <td className="text-end fw-bold">
                        {(num(r.qty) * num(r.unit_price)).toLocaleString()}
                      </td>
                      <td className="text-center">
                        {lines.length > 1 && (
                          <Trash2
                            size={16}
                            className="cursor-pointer text-danger"
                            onClick={() =>
                              setLines((rows) => rows.filter((x) => x.key !== r.key))
                            }
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="table-light fw-bold">
                    <td colSpan={5} className="text-end">
                      {t("Total")}
                    </td>
                    <td className="text-end">{standaloneTotal.toLocaleString()}</td>
                    <td />
                  </tr>
                </tfoot>
              </Table>
            )}

            {/* Vendor charges (optional) — packing, freight, etc. */}
            <div className="d-flex justify-content-between align-items-center mt-2 mb-1">
              <Label className="form-label mb-0">
                {t("Vendor Charges")}{" "}
                <span className="text-muted small">({t("optional")})</span>
              </Label>
              <Button
                size="sm"
                color="outline-primary"
                onClick={() => setCharges((c) => [...c, newCharge()])}
              >
                <Plus size={14} className="me-25" /> {t("Add Charge")}
              </Button>
            </div>

            {charges.length === 0 ? (
              <div className="text-muted small">{t("No charges added.")}</div>
            ) : (
              <Table bordered size="sm" className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t("Charge")}</th>
                    <th style={{ width: 150 }}>{t("Type")}</th>
                    <th style={{ width: 120 }} className="text-end">
                      {t("Value")}
                    </th>
                    <th style={{ width: 120 }} className="text-end">
                      {t("Amount")} (₹)
                    </th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {charges.map((c) => (
                    <tr key={c.key}>
                      <td>
                        <Select
                          classNamePrefix="select"
                          menuPortalTarget={
                            typeof document !== "undefined" ? document.body : null
                          }
                          styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                          options={expenseOptions}
                          value={
                            expenseOptions.find((o) => o.value === c.expense_id) || null
                          }
                          onChange={(opt) => onPickExpense(c.key, opt)}
                          placeholder={t("Select charge")}
                        />
                      </td>
                      <td>
                        <Select
                          classNamePrefix="select"
                          menuPortalTarget={
                            typeof document !== "undefined" ? document.body : null
                          }
                          styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                          options={REBATE_EXPENSE_TYPE_OPTIONS}
                          value={
                            REBATE_EXPENSE_TYPE_OPTIONS.find((o) => o.value === c.type) ||
                            null
                          }
                          onChange={(opt) =>
                            setCharge(c.key, { type: opt ? opt.value : "percent" })
                          }
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          bsSize="sm"
                          className="text-end"
                          value={c.value}
                          onChange={(e) => setCharge(c.key, { value: e.target.value })}
                        />
                      </td>
                      <td className="text-end fw-semibold">
                        {chargeAmount(c).toLocaleString()}
                      </td>
                      <td className="text-center">
                        <Trash2
                          size={16}
                          className="cursor-pointer text-danger"
                          onClick={() =>
                            setCharges((rows) => rows.filter((x) => x.key !== c.key))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="fw-bold">
                    <td colSpan={3} className="text-end">
                      {t("Charges Total")}
                    </td>
                    <td className="text-end">{chargesTotal.toLocaleString()}</td>
                    <td />
                  </tr>
                  <tr className="table-light fw-bold">
                    <td colSpan={3} className="text-end">
                      {t("Grand Total")} (₹)
                    </td>
                    <td className="text-end">{grandTotal.toLocaleString()}</td>
                    <td />
                  </tr>
                </tfoot>
              </Table>
            )}

            <div className="mt-2" style={{ maxWidth: 640 }}>
              <Label className="form-label">{t("Notes (optional)")}</Label>
              <Input
                type="textarea"
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardBody>
          <CardFooter className="d-flex justify-content-end gap-1">
            <Button color="secondary" outline onClick={backToList} disabled={creating}>
              <ArrowLeft size={15} className="me-25" /> {t("Cancel")}
            </Button>
            <Button color="success" onClick={onCreate} disabled={creating || !vendorId}>
              {creating ? <Spinner size="sm" /> : <CheckCircle size={15} />}{" "}
              {t("Create POV")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Fragment>
  );
};

export default CreatePoVendor;
