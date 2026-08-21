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
  Row,
  Col,
} from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import { CheckCircle, ArrowLeft, Plus, Trash2 } from "react-feather";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import DateInput from "@components/date-input";
import LocationSelect from "@src/views/_shared/LocationSelect";
import {
  createPoVendorStandalone,
  createPoVendorFromPo,
} from "@src/views/po-vendors/store";
import { getVendor } from "@src/views/vendors/store";
import { getProductDropdown } from "@src/views/products/store";
import { getExpenseDropdown } from "@src/views/expenses/store";
import { getCurrencySymbol } from "@src/utility/currency";
import ExpenseGrid from "@src/views/_shared/po-vendor/ExpenseGrid";
import { confirmAndCreateMissingPrices } from "@src/views/_shared/price-list/confirmMissingPrices";
import EntitySearchSelect from "@components/entity-select";
import { getPurchaseOrder } from "@src/views/purchase-orders/store";
import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";
import { appsRoot } from "@constant/defaultValues";
import { REBATE_EXPENSE_TYPE_OPTIONS } from "@constant/options";

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const round2 = (n) =>
  !isFinite(n) ? 0 : Math.round((n + Number.EPSILON) * 100) / 100;
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
  discount: "",
});
const newCharge = () => ({
  key: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
  expense_id: "",
  type: "percent",
  value: "",
  gst_pct: "",
});

const CreatePoVendor = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const vendorStore = useSelector((s) => s.vendor);
  const productStore = useSelector((s) => s.product);
  const expenseStore = useSelector((s) => s.expense);
  const poFromStore = useSelector((s) => s.purchaseOrder?.purchaseOrderItem);
  const companyStore = useSelector((s) => s.company);

  const [creating, setCreating] = useState(false);
  const [vendorId, setVendorId] = useState("");
  // Vendor's invoice number — required free text on the POV header.
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [deliveryAddressId, setDeliveryAddressId] = useState("");
  const [notes, setNotes] = useState("");
  // Vendor-side terms printed on the POV PDF. Free text, typed per POV — the
  // Sales Order's terms belong to the customer and are never inherited here.
  const [dispatchedThrough, setDispatchedThrough] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");

  // Currency the SAVED POV renders in. Line prices stay in INR (₹); this only
  // sets how the stored POV's detail view + PDF present amounts (all native to
  // the vendor's currency — no INR conversion rate on the POV anymore).
  const [currencyCode, setCurrencyCode] = useState("INR");

  // Standalone manual lines.
  const [lines, setLines] = useState([newRow()]);
  // Optional vendor charges (expenses): [{ expense_id, type, value }].
  const [charges, setCharges] = useState([]);

  // Optional Sales Order link.
  const [soOptions, setSoOptions] = useState([]);
  const [soLoading, setSoLoading] = useState(false);
  const [pickedSoId, setPickedSoId] = useState("");
  // Standalone: optional soft links to one or more Sales Orders (traceability
  // only — does not switch the form into linked/coverage mode). Array of SO ids.
  const [pickedSoIds, setPickedSoIds] = useState([]);
  const [coverage, setCoverage] = useState(null);
  const [coverByLine, setCoverByLine] = useState({});
  const [priceByLine, setPriceByLine] = useState({});
  const [discountByLine, setDiscountByLine] = useState({});

  // Optional advance paid to the vendor (standalone only).
  const [advance, setAdvance] = useState({
    payment_date: new Date().toISOString().slice(0, 10),
    amount: "",
    invoice_number: "",
    notes: "",
  });

  const linkedMode = !!pickedSoId;
  // GST is an Indian (INR) tax — it does not apply on a foreign-currency POV.
  // When the POV is in a foreign currency the GST is treated as 0 and the GST%
  // inputs are disabled/blanked.
  const gstApplies = currencyCode === "INR";

  // ── Dropdowns ───────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(getProductDropdown());
    dispatch(getExpenseDropdown());
    dispatch(getCompanyDetails());
  }, [dispatch]);

  // Pre-fill Remarks from the company's default POV remarks (new POV only).
  // Only seeds when the field is still empty so it never clobbers typing.
  useEffect(() => {
    const def =
      companyStore?.companyItem?.pov_default_remarks ||
      companyStore?.companyItem?.default_remarks;
    if (def && !notes) setNotes(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    companyStore?.companyItem?.pov_default_remarks,
    companyStore?.companyItem?.default_remarks,
  ]);

  // Same for the three vendor terms — seeded from the company defaults, blank-only.
  useEffect(() => {
    const c = companyStore?.companyItem;
    if (!c) return;
    if (c.pov_default_dispatched_through && !dispatchedThrough) {
      setDispatchedThrough(c.pov_default_dispatched_through);
    }
    if (c.pov_default_payment_terms && !paymentTerms) {
      setPaymentTerms(c.pov_default_payment_terms);
    }
    if (c.pov_default_delivery_terms && !deliveryTerms) {
      setDeliveryTerms(c.pov_default_delivery_terms);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    companyStore?.companyItem?.pov_default_dispatched_through,
    companyStore?.companyItem?.pov_default_payment_terms,
    companyStore?.companyItem?.pov_default_delivery_terms,
  ]);

  const expenseOptions = useMemo(
    () =>
      (expenseStore?.expenseDropdown || []).map((e) => ({
        value: e._id,
        label: e.code ? `${e.code} - ${e.name}` : e.name,
        raw: e,
      })),
    [expenseStore?.expenseDropdown]
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

  // Linked (generate-from-SO) mode uses the SO's own vendors (scoped). Standalone
  // mode uses the searchable <EntitySearchSelect> below, so no full vendor list
  // is built here.
  const vendorOptions = useMemo(() => {
    if (linkedMode && poFromStore?._id === pickedSoId) return soVendorOptions;
    return [];
  }, [linkedMode, poFromStore, pickedSoId, soVendorOptions]);
  // Standalone: the picked vendor's full row (name + currency for the payload).
  const [selectedVendorRaw, setSelectedVendorRaw] = useState(null);

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
      setDiscountByLine({});
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

  // Linked-mode: default the POV currency from the source SO.
  useEffect(() => {
    if (linkedMode && poFromStore?._id === pickedSoId && poFromStore?.currency_code) {
      setCurrencyCode(poFromStore.currency_code);
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

  const vendorLabel = () =>
    (linkedMode
      ? vendorOptions.find((o) => o.value === vendorId)?.label
      : selectedVendorRaw?.company_name) || t("the selected vendor");

  const onPickProduct = async (key, opt) => {
    // Cleared selection — reset the row.
    if (!opt) {
      setRow(key, {
        product_id: "",
        product_name: "",
        part_no: "",
        hsn_code: "",
        unit: "",
        tax_pct: "0",
        unit_price: "",
      });
      return;
    }
    // A vendor is required first — the product must exist in ITS price list.
    if (!vendorId) {
      Notification(
        "Validation",
        t("Select a vendor first, then add products."),
        "warning"
      );
      return;
    }
    // Then the delivery destination — flow is Vendor → Deliver To → Product.
    if (!linkedMode && !deliveryAddressId) {
      Notification(
        "Validation",
        t("Select Deliver To first, then add products."),
        "warning"
      );
      return;
    }
    // Block the same product on two lines — a POV has ONE vendor, so a
    // duplicate product is just a merged quantity. Keep this row's current
    // selection unchanged.
    if (lines.some((r) => r.key !== key && r.product_id === opt.value)) {
      Notification(
        "Validation",
        t("This product is already added — edit that line's quantity instead."),
        "warning"
      );
      return;
    }
    // Auto-fill the rate from the vendor's price list when it exists. When it
    // doesn't, DON'T block — add the product with a blank rate for the user to
    // enter; on save we offer to add it to the price list (effective today).
    const price = await fetchVendorPrice(opt.value, vendorId);
    const raw = opt.raw || {};
    setRow(key, {
      product_id: opt.value,
      product_name: raw.name || "",
      part_no: raw.part_no || "",
      hsn_code: raw.hsn_code || "",
      unit: raw.unit_of_measure || "",
      tax_pct: raw.tax_pct != null ? String(raw.tax_pct) : "0",
      unit_price: price != null ? price : "",
    });
  };

  // On vendor change (standalone): re-fill each line's rate from the new
  // vendor's price list. Products are KEPT even when the new vendor doesn't
  // quote them — the rate is cleared for manual entry, and on save we offer to
  // add the (vendor, product) to the price list.
  useEffect(() => {
    if (linkedMode || !vendorId) return;
    const rows = lines.filter((r) => r.product_id);
    if (!rows.length) return;
    Promise.all(
      rows.map((r) =>
        fetchVendorPrice(r.product_id, vendorId).then((price) => ({ r, price }))
      )
    ).then((results) => {
      for (const { r, price } of results) {
        setRow(r.key, { unit_price: price != null ? price : "" });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  // The vendor dropdown only carries id + name, but the GST split needs the
  // vendor's GSTIN (its state code). Pull the detail record when one is picked.
  useEffect(() => {
    if (vendorId) dispatch(getVendor(vendorId));
  }, [vendorId, dispatch]);

  // Per-line vendor discount reduces the taxable base (before GST).
  const discFactor = (disc) => 1 - num(disc) / 100;
  const standaloneTotal = useMemo(
    () =>
      lines.reduce(
        (s, r) => s + num(r.qty) * num(r.unit_price) * discFactor(r.discount),
        0
      ),
    [lines]
  );
  const linkedTotal = useMemo(
    () =>
      filteredCoverLines.reduce(
        (s, l) =>
          s +
          num(coverByLine[l.purchase_order_line_id]) *
            num(priceByLine[l.purchase_order_line_id]) *
            discFactor(discountByLine[l.purchase_order_line_id]),
        0
      ),
    [filteredCoverLines, coverByLine, priceByLine, discountByLine]
  );

  // ── GST (live) ───────────────────────────────────────────────────────
  //
  // Mirrors po-vendor-pdf.service.ts exactly, or the number on screen would not
  // be the number on the PDF:
  //   per line   gst = line_total × tax_pct/100   (tax_pct from the line, or the
  //                                                PO line / product master)
  //   intra-state → CGST + SGST (half each);  inter-state → IGST (full)
  //   grand      = goods + charges + goods GST
  //
  // Charges carry their own `gst_pct` on the PDF, but this form has no field for
  // it (newCharge() has no gst_pct), so charge GST is 0 here — same as what gets
  // saved. Add the field and this must gain a charge-GST term too.
  const lineGst = (qty, price, taxPct, disc) =>
    (num(qty) * num(price) * discFactor(disc) * num(taxPct)) / 100;

  // NATIVE model (plan §6.3): POV line amounts are stored in the POV's own
  // currency, so the tables render them AS-IS — no conversion. dispRate is 1;
  // toDisp / rateToInr are identity. (exchange_rate is now INR-per-unit, used
  // only for INR stock/books valuation, frozen server-side.)
  const sym = getCurrencySymbol(currencyCode) || "₹";
  const dispRate = 1;
  const toDisp = (native) => num(native);
  const dispStr = (native) => round2(toDisp(native)).toLocaleString();
  // Editable Rate input helpers — value shown/stored directly in the POV currency.
  const rateInputVal = (native) =>
    native === "" || native == null
      ? ""
      : String(Math.round(num(native) * 10000) / 10000);
  const rateToInr = (disp) => (disp === "" ? "" : String(num(disp)));

  const goodsGst = useMemo(() => {
    if (!gstApplies) return 0;
    if (linkedMode) {
      return filteredCoverLines.reduce((s, l) => {
        const id = l.purchase_order_line_id;
        return (
          s +
          lineGst(coverByLine[id], priceByLine[id], l.tax_pct, discountByLine[id])
        );
      }, 0);
    }
    return lines.reduce(
      (s, r) => s + lineGst(r.qty, r.unit_price, r.tax_pct, r.discount),
      0
    );
  }, [gstApplies, linkedMode, filteredCoverLines, coverByLine, priceByLine, discountByLine, lines]);

  // GST state code = first two digits of the GSTIN (the GST convention the PDF
  // uses). Both sides must be known — guessing the split would print CGST/SGST
  // on an inter-state purchase, which is a real compliance error. When either
  // GSTIN is missing we show a single "GST" row instead of a wrong split.
  const gstStateCode = (gstin) =>
    gstin && /^\d{2}/.test(String(gstin)) ? String(gstin).slice(0, 2) : "";

  const companyGstin = useMemo(() => {
    const addrs = companyStore?.companyItem?.addresses || [];
    const corp =
      addrs.find((a) => a.type === "corporate" && a.is_default) ||
      addrs.find((a) => a.type === "corporate") ||
      addrs.find((a) => a.is_default) ||
      addrs[0];
    return corp?.gstin || "";
  }, [companyStore?.companyItem]);

  const vendorGstin =
    vendorStore?.vendorItem?._id === vendorId
      ? vendorStore?.vendorItem?.gstin || ""
      : "";

  const cc = gstStateCode(companyGstin);
  const vc = gstStateCode(vendorGstin);
  const gstSplitKnown = !!cc && !!vc;
  const interState = gstSplitKnown && cc !== vc;
  const cgst = interState ? 0 : goodsGst / 2;
  const sgst = interState ? 0 : goodsGst - cgst;
  const igst = interState ? goodsGst : 0;

  // ── Vendor charges (expenses) ────────────────────────────────────────
  const goodsTotal = linkedMode ? linkedTotal : standaloneTotal;
  // Charges apply on top of goods — gate "Add Charge" until a product line
  // exists (linked: pending lines for the vendor; standalone: a picked product).
  const hasProductLine = linkedMode
    ? filteredCoverLines.length > 0
    : lines.some((r) => r.product_id);
  // percent → % of goods total; fixed → flat amount. Each charge also carries
  // its own GST% (operator-entered); the charge Amount shown is charge + GST.
  const chargeTaxable = (c) =>
    !c.expense_id
      ? 0
      : c.type === "percent"
        ? (goodsTotal * num(c.value)) / 100
        : num(c.value);
  const chargeGross = (c) =>
    chargeTaxable(c) +
    (gstApplies ? (chargeTaxable(c) * num(c.gst_pct)) / 100 : 0);
  const chargesTotal = useMemo(
    () => charges.reduce((s, c) => s + chargeGross(c), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [charges, goodsTotal, gstApplies]
  );
  // Expenses NET of their own GST (the "Without GST" figure in the summary).
  const expensesBase = useMemo(
    () => charges.reduce((s, c) => s + chargeTaxable(c), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [charges, goodsTotal]
  );
  // Total GST shown on the summary = goods GST + the charges' own GST.
  const chargeGst = chargesTotal - expensesBase;
  const totalGst = goodsGst + chargeGst;
  // charges (incl. their own GST) + goods + goods GST. Matches the PDF.
  const grandTotal = goodsTotal + goodsGst + chargesTotal;

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
        gst_pct: gstApplies ? String(num(c.gst_pct)) : "0",
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
            discount_pct: String(
              num(discountByLine[l.purchase_order_line_id])
            ),
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
              invoice_number: invoiceNumber.trim(),
              lines: poLines,
              delivery_address_id: deliveryAddressId || undefined,
              notes: notes?.trim() || undefined,
              dispatched_through: dispatchedThrough?.trim() || undefined,
              payment_terms: paymentTerms?.trim() || undefined,
              delivery_terms: deliveryTerms?.trim() || undefined,
              expenses: expensesPayload.length ? expensesPayload : undefined,
              currency_code: currencyCode || undefined,
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
            discount_pct: String(num(r.discount)),
            description: r.product_name || undefined,
            part_no: r.part_no || undefined,
            hsn_code: r.hsn_code || undefined,
            unit: r.unit || undefined,
            tax_pct: gstApplies
              ? r.tax_pct != null
                ? String(r.tax_pct)
                : undefined
              : "0",
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
        // Offer to add any (vendor, product) not yet in the price list, using
        // the entered rate + today's date. Cancel aborts the save.
        const proceed = await confirmAndCreateMissingPrices({
          lines: lines
            .filter((r) => r.product_id)
            .map((r) => ({
              product_id: r.product_id,
              product_name: r.product_name,
              vendor_id: vendorId,
              vendor_name: vendorLabel(),
              unit_price: r.unit_price,
            })),
          t,
          currencySymbol: sym,
        });
        if (!proceed) {
          setCreating(false);
          return;
        }

        const advanceAmt = num(advance.amount);
        // Native model: the advance (a vendor payment) is recorded in the POV's
        // own currency and stored as-is — no INR conversion.
        const advanceAmtInr = round2(advanceAmt);
        result = await dispatch(
          createPoVendorStandalone({
            vendor_id: vendorId,
            invoice_number: invoiceNumber.trim(),
            lines: payloadLines,
            delivery_address_id: deliveryAddressId || undefined,
            notes: notes?.trim() || undefined,
            dispatched_through: dispatchedThrough?.trim() || undefined,
            payment_terms: paymentTerms?.trim() || undefined,
            delivery_terms: deliveryTerms?.trim() || undefined,
            expenses: expensesPayload.length ? expensesPayload : undefined,
            currency_code: currencyCode || undefined,
            linked_sales_order_ids: pickedSoIds.length ? pickedSoIds : undefined,
            advance:
              advanceAmt > 0
                ? {
                    payment_date:
                      advance.payment_date ||
                      new Date().toISOString().slice(0, 10),
                    amount: String(advanceAmtInr),
                    invoice_number: advance.invoice_number?.trim() || undefined,
                    notes: advance.notes?.trim() || undefined,
                  }
                : undefined,
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
              {/* Delivery address — first field; auto-selects the company's
                  default location (is_default, else first). In linked mode the
                  SO's deliver-to still wins (set once the source SO loads). */}
              <div className="col-md-3">
                <Label className="form-label">
                  {t("Deliver To")}{" "}
                  {!linkedMode && <span className="text-danger">*</span>}
                </Label>
                <LocationSelect
                  value={deliveryAddressId}
                  onChange={setDeliveryAddressId}
                  autoSelectDefault={true}
                />
              </div>

              {/* Vendor */}
              <div className="col-md-3">
                <Label className="form-label">
                  {t("Vendor")} <span className="text-danger">*</span>
                </Label>
                {linkedMode ? (
                  <Select
                    classNamePrefix="select"
                    options={vendorOptions}
                    value={
                      vendorOptions.find((o) => o.value === vendorId) || null
                    }
                    onChange={(opt) => setVendorId(opt ? opt.value : "")}
                    placeholder={t("Select vendor")}
                  />
                ) : (
                  <EntitySearchSelect
                    kind="vendor"
                    value={vendorId || null}
                    isClearable={false}
                    onChange={(opt) => {
                      setVendorId(opt ? opt.value : "");
                      setSelectedVendorRaw(opt?.raw || null);
                      // Auto-select the vendor's preferred currency; changing it
                      // triggers the rate auto-fetch effect.
                      if (opt?.raw?.currency_code) {
                        setCurrencyCode(opt.raw.currency_code);
                      }
                    }}
                    placeholder={t("Search vendor")}
                  />
                )}
              </div>

              {/* Currency the SAVED POV renders in (lines stay in ₹) — follows
                  the selected vendor's preferred currency (auto-set above),
                  not independently editable. */}
              <div className="col-md-3">
                <Label className="form-label">{t("Currency")}</Label>
                <div
                  className="form-control bg-light d-flex align-items-center"
                  style={{ minHeight: 38 }}
                >
                  {currencyCode ? `${currencyCode} (${sym})` : "-"}
                </div>
                <small className="text-muted">
                  {t("Follows the selected vendor's currency")}
                </small>
              </div>

              {/* Exchange Rate field removed — a Vendor PO is settled in the
                  vendor's own currency (native), and inventory now values stock
                  per-currency, so no INR conversion rate is needed here. */}

              {/* Optional: soft-link one or more Sales Orders for traceability.
                  Reference only — does not pull SO lines or switch to linked
                  mode. Options are confirmed / in-process Sales Orders. */}
              {!linkedMode && (
                <div className="col-md-3">
                  <Label className="form-label">{t("Link Sales Order(s)")}</Label>
                  <Select
                    isMulti
                    isClearable
                    classNamePrefix="select"
                    options={soOptions}
                    value={soOptions.filter((o) => pickedSoIds.includes(o.value))}
                    onChange={(opts) =>
                      setPickedSoIds((opts || []).map((o) => o.value))
                    }
                    isLoading={soLoading}
                    placeholder={t("Select sales order(s)")}
                    noOptionsMessage={() => t("No sales orders")}
                  />
                </div>
              )}
            </div>

            {/* Lines */}
            <div className="d-flex justify-content-between align-items-center mb-1">
              <Label className="form-label mb-0">{t("Line Items")}</Label>
              {!linkedMode && (
                <Button
                  size="sm"
                  color="outline-primary"
                  disabled={!vendorId || !deliveryAddressId}
                  title={
                    !vendorId
                      ? t("Select a vendor first")
                      : !deliveryAddressId
                      ? t("Select Deliver To first")
                      : undefined
                  }
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
                <Table responsive bordered size="sm" className="align-middle mb-0">
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
                        {t("Rate")} ({sym})
                      </th>
                      <th style={{ width: 80 }} className="text-end">
                        {t("Disc")} %
                      </th>
                      <th style={{ width: 70 }} className="text-end">
                        {t("GST")} %
                      </th>
                      <th style={{ width: 110 }} className="text-end">
                        {t("GST Amt")} ({sym})
                      </th>
                      <th style={{ width: 120 }} className="text-end">
                        {t("Amount")} ({sym})
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCoverLines.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center text-muted py-2">
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
                                value={rateInputVal(priceByLine[id])}
                                onChange={(e) =>
                                  setPriceByLine((s) => ({
                                    ...s,
                                    [id]: rateToInr(e.target.value),
                                  }))
                                }
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                bsSize="sm"
                                className="text-end"
                                disabled={max <= 1e-6}
                                value={discountByLine[id] ?? ""}
                                onChange={(e) =>
                                  setDiscountByLine((s) => ({
                                    ...s,
                                    [id]: e.target.value,
                                  }))
                                }
                              />
                            </td>
                            <td className="text-end text-muted">
                              {gstApplies ? num(l.tax_pct) || 0 : 0}
                            </td>
                            <td className="text-end">
                              {sym}
                              {dispStr(
                                gstApplies
                                  ? lineGst(
                                      coverByLine[id],
                                      priceByLine[id],
                                      l.tax_pct,
                                      discountByLine[id]
                                    )
                                  : 0
                              )}
                            </td>
                            <td className="text-end fw-bold">
                              {sym}
                              {dispStr(q * price * discFactor(discountByLine[id]))}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="table-light fw-bold">
                      {/* 7 = # · Product · UOM · Pending · Qty · Rate · Disc%. The
                          two cells after it land under GST Amt and Amount. */}
                      <td colSpan={7} className="text-end">
                        {t("Total")}
                      </td>
                      <td className="text-end">
                        {sym}
                        {dispStr(goodsGst)}
                      </td>
                      <td className="text-end">
                        {sym}
                        {dispStr(linkedTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </Table>
              )
            ) : (
              <Table responsive bordered size="sm" className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 30 }}>#</th>
                    <th>
                      {t("Product")} <span className="text-danger">*</span>
                    </th>
                    <th style={{ width: 120 }}>{t("Part No")}</th>
                    <th style={{ width: 100 }}>{t("HSN")}</th>
                    <th style={{ width: 70 }}>{t("UOM")}</th>
                    <th style={{ width: 100 }} className="text-end">
                      {t("Qty")} <span className="text-danger">*</span>
                    </th>
                    <th style={{ width: 110 }} className="text-end">
                      {t("Rate")} ({sym}) <span className="text-danger">*</span>
                    </th>
                    <th style={{ width: 80 }} className="text-end">
                      {t("Disc")} %
                    </th>
                    {gstApplies && (
                      <th style={{ width: 120 }} className="text-end">
                        {t("Taxable")} ({sym})
                      </th>
                    )}
                    {gstApplies && (
                      <Fragment>
                        <th style={{ width: 80 }} className="text-end">
                          {t("GST")} %
                        </th>
                        <th style={{ width: 110 }} className="text-end">
                          {t("GST Amt")} ({sym})
                        </th>
                      </Fragment>
                    )}
                    <th style={{ width: 120 }} className="text-end">
                      {t("Total")} ({sym})
                    </th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((r, idx) => (
                    <tr key={r.key}>
                      <td>{idx + 1}</td>
                      <td>
                        <EntitySearchSelect
                          kind="product"
                          eager={false}
                          menuPortalTarget={
                            typeof document !== "undefined" ? document.body : null
                          }
                          styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                          isClearable={false}
                          isDisabled={!vendorId || !deliveryAddressId}
                          value={r.product_id || null}
                          onChange={(opt) => onPickProduct(r.key, opt)}
                          placeholder={
                            !vendorId
                              ? t("Select a vendor first")
                              : !deliveryAddressId
                              ? t("Select Deliver To first")
                              : t("Search product")
                          }
                        />
                      </td>
                      <td>
                        <Input
                          type="text"
                          bsSize="sm"
                          disabled={!r.product_id}
                          value={r.part_no}
                          onChange={(e) =>
                            setRow(r.key, { part_no: e.target.value })
                          }
                        />
                      </td>
                      <td>
                        <Input
                          type="text"
                          bsSize="sm"
                          disabled={!r.product_id}
                          value={r.hsn_code}
                          onChange={(e) =>
                            setRow(r.key, { hsn_code: e.target.value })
                          }
                        />
                      </td>
                      <td className="text-muted">{r.unit || "-"}</td>
                      <td>
                        <Input
                          type="number"
                          min="0"
                          step="0.0001"
                          bsSize="sm"
                          className="text-end"
                          disabled={!r.product_id}
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
                          disabled={!r.product_id}
                          value={rateInputVal(r.unit_price)}
                          onChange={(e) =>
                            setRow(r.key, { unit_price: rateToInr(e.target.value) })
                          }
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          bsSize="sm"
                          className="text-end"
                          disabled={!r.product_id}
                          value={r.discount ?? ""}
                          onChange={(e) =>
                            setRow(r.key, { discount: e.target.value })
                          }
                        />
                      </td>
                      {/* Taxable = Qty × Rate − Disc (auto). Hidden when GST
                          doesn't apply — it'd be identical to Total. */}
                      {gstApplies && (
                        <td className="text-end">
                          {sym}
                          {dispStr(
                            num(r.qty) * num(r.unit_price) * discFactor(r.discount)
                          )}
                        </td>
                      )}
                      {gstApplies && (
                        <Fragment>
                          <td>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              bsSize="sm"
                              className="text-end"
                              disabled={!r.product_id}
                              value={r.tax_pct ?? ""}
                              onChange={(e) =>
                                setRow(r.key, { tax_pct: e.target.value })
                              }
                            />
                          </td>
                          <td className="text-end">
                            {sym}
                            {dispStr(
                              lineGst(r.qty, r.unit_price, r.tax_pct, r.discount)
                            )}
                          </td>
                        </Fragment>
                      )}
                      {/* Total = Taxable + GST (auto, final line amount). */}
                      <td className="text-end fw-bold">
                        {sym}
                        {dispStr(
                          num(r.qty) *
                            num(r.unit_price) *
                            discFactor(r.discount) +
                            (gstApplies
                              ? lineGst(
                                  r.qty,
                                  r.unit_price,
                                  r.tax_pct,
                                  r.discount
                                )
                              : 0)
                        )}
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
                    {/* 8 = # · Product · Part No · HSN · UOM · Qty · Rate · Disc%.
                        The cells after it land under Taxable · (GST%) · GST Amt ·
                        Total. */}
                    <td colSpan={8} className="text-end">
                      {t("Totals")}
                    </td>
                    {gstApplies && (
                      <td className="text-end">
                        {sym}
                        {dispStr(standaloneTotal)}
                      </td>
                    )}
                    {gstApplies && (
                      <Fragment>
                        <td />
                        <td className="text-end">
                          {sym}
                          {dispStr(goodsGst)}
                        </td>
                      </Fragment>
                    )}
                    <td className="text-end">
                      {sym}
                      {dispStr(standaloneTotal + (gstApplies ? goodsGst : 0))}
                    </td>
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
                disabled={!hasProductLine}
                title={
                  !hasProductLine ? t("Select a product first") : undefined
                }
                onClick={() => setCharges((c) => [...c, newCharge()])}
              >
                <Plus size={14} className="me-25" /> {t("Add Charge")}
              </Button>
            </div>

            {charges.length === 0 ? (
              <div className="text-muted small">{t("No charges added.")}</div>
            ) : (
              // Shared GST-enabled charges grid (Charge · Type · Value · GST% ·
              // Amount). % charges are valued on the goods total; each charge's
              // Amount shown includes its own GST.
              <ExpenseGrid
                rows={charges}
                expenseOptions={expenseOptions}
                typeOptions={REBATE_EXPENSE_TYPE_OPTIONS}
                percentBase={goodsTotal}
                sym={sym}
                // Amount column renders in the POV currency (× rate) so it agrees
                // with the Charges Total; the VALUE column stays the raw INR /
                // percent entry — same pattern as the detail Expenses tab and the
                // Generate-POV modal.
                rate={dispRate}
                gstApplies={gstApplies}
                onUpdateRow={(idx, patch) =>
                  setCharges((rows) =>
                    rows.map((r, i) => (i === idx ? { ...r, ...patch } : r))
                  )
                }
                onRemoveRow={(idx) =>
                  setCharges((rows) => rows.filter((_, i) => i !== idx))
                }
              />
            )}

            {/* Totals summary — charges (incl. their GST), goods GST, grand
                total. Shown whenever there are goods or charges. */}
            {(goodsTotal > 0 || charges.length > 0) && (
              <Table
                borderless
                size="sm"
                className="mb-0 mt-1 ms-auto"
                style={{ maxWidth: 360 }}
              >
                <tbody>
                  {/* Clean breakdown: goods (ex-GST) → expenses (ex-GST) →
                      total GST (goods GST + any charge GST) → grand total.
                      The "(Without GST)" qualifiers and the GST row itself
                      only make sense when GST applies at all (INR) — a
                      foreign-currency POV never carries GST, so skip both. */}
                  <tr>
                    <td className="text-end">
                      {t("Goods Total")}{" "}
                      {gstApplies && (
                        <small className="text-muted fw-normal">
                          ({t("Without GST")})
                        </small>
                      )}
                    </td>
                    <td className="text-end" style={{ width: 130 }}>
                      {sym}
                      {dispStr(goodsTotal)}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-end">
                      {t("Expenses")}{" "}
                      {gstApplies && (
                        <small className="text-muted fw-normal">
                          ({t("Without GST")})
                        </small>
                      )}
                    </td>
                    <td className="text-end">
                      {sym}
                      {dispStr(expensesBase)}
                    </td>
                  </tr>
                  {gstApplies && (
                    <tr>
                      <td className="text-end">
                        {t("GST")}
                        {chargeGst > 0 && (
                          <small className="text-muted ms-50 fw-normal">
                            ({sym}
                            {dispStr(goodsGst)} + {sym}
                            {dispStr(chargeGst)})
                          </small>
                        )}
                      </td>
                      <td className="text-end">
                        {sym}
                        {dispStr(totalGst)}
                      </td>
                    </tr>
                  )}
                  <tr className="table-light fw-bold">
                    <td className="text-end">{t("Grand Total")} ({sym})</td>
                    <td className="text-end">
                      {sym}
                      {dispStr(grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </Table>
            )}

            {/* Vendor's invoice number — optional header field. */}
            <Row className="mt-2">
              <Col md="6" className="mb-1">
                <Label className="form-label">{t("Invoice Number")}</Label>
                <Input
                  maxLength={120}
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder={t("Vendor's invoice number")}
                />
              </Col>
            </Row>

            {/* Vendor-side terms printed on the POV PDF. */}
            <Row className="mt-2">
              <Col md="6" className="mb-1">
                <Label className="form-label">{t("Dispatched Through")}</Label>
                <Input
                  maxLength={150}
                  value={dispatchedThrough}
                  onChange={(e) => setDispatchedThrough(e.target.value)}
                  placeholder={t("e.g. By Sea")}
                />
              </Col>
              <Col md="6" className="mb-1">
                <Label className="form-label">
                  {t("Mode/Terms of Payment")}
                </Label>
                <Input
                  maxLength={500}
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder={t("e.g. 50% ADVANCE & 50% AT DISPATCH TIME")}
                />
              </Col>
            </Row>

            <Row>
              <Col md="12" className="mb-1">
                <Label className="form-label">{t("Terms of Delivery")}</Label>
                <Input
                  type="textarea"
                  rows="3"
                  maxLength={1000}
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  placeholder={t(
                    "e.g. OUR PFI NO:…, DELIVERY TERM: 4 TO 5 WEEKS"
                  )}
                />
              </Col>
            </Row>

            <div className="mt-2">
              <Label className="form-label">{t("Remarks (optional)")}</Label>
              <Input
                type="textarea"
                rows="3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t(
                  "Printed on the Vendor PO PDF. Leave blank to use the company's default POV remarks."
                )}
              />
            </div>

            {/* Optional advance paid to the vendor (standalone only) */}
            {!linkedMode && (
              <div className="mt-3">
                <Label className="form-label mb-1 d-block">
                  {t("Advance Paid to Vendor")}{" "}
                  <span className="text-muted small">({t("optional")})</span>
                </Label>
                <div className="border rounded p-2">
                  <div className="row g-2">
                    <div className="col-md-4">
                      <Label className="form-label">{t("Payment Date")}</Label>
                      <DateInput
                        id="pov-advance-date"
                        value={advance.payment_date}
                        onChange={(_d, _s, iso) =>
                          setAdvance((s) => ({ ...s, payment_date: iso || "" }))
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <Label className="form-label">
                        {t("Amount")}
                        {currencyCode && currencyCode !== "INR"
                          ? ` (${currencyCode})`
                          : ""}
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={advance.amount}
                        placeholder="0.00"
                        onChange={(e) =>
                          setAdvance((s) => ({ ...s, amount: e.target.value }))
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <Label className="form-label">{t("Invoice Number")}</Label>
                      <Input
                        value={advance.invoice_number}
                        maxLength={120}
                        placeholder={t("Vendor's invoice number")}
                        onChange={(e) =>
                          setAdvance((s) => ({
                            ...s,
                            invoice_number: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="col-12">
                      <Label className="form-label">{t("Notes")}</Label>
                      <Input
                        type="textarea"
                        rows="2"
                        value={advance.notes}
                        onChange={(e) =>
                          setAdvance((s) => ({ ...s, notes: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <small className="text-muted">
                    {t(
                      "Leave the amount blank to skip. The advance is recorded as a vendor payment on the new PO."
                    )}
                  </small>
                </div>
              </div>
            )}
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
