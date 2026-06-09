import { Fragment, useState, useEffect, useRef } from "react";
import ReactPaginate from "react-paginate";
import {
  Card,
  CardBody,
  Col,
  Row,
  Button,
  Input,
  Label,
  Table,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  UncontrolledPopover,
  PopoverBody,
} from "reactstrap";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import { Plus, Trash2, Edit, Check } from "react-feather";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import instance from "@src/utility/AxiosConfig";
import Notification from "@components/toast/notification";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import {
  PRODUCT_UOM_OPTIONS,
  UOM_INTEGER_ONLY,
  REBATE_EXPENSE_TYPE_OPTIONS,
} from "@constant/options";
import {
  num,
  fmt,
  round2,
  formatVendorOption,
  currencySymbol,
  computeLineCosting,
} from "./_helpers";
import LineItemImportExportBar from "./import-export/LineItemImportExportBar";

/**
 * Line items section - compact summary table with Add / Edit / Delete actions.
 * Editing happens in a Modal that hosts the full input layout (Product, Vendor,
 * Qty, Unit, Price, Disc%, Tax%, Description). Modal edits go live to the
 * underlying field-array row; closing a freshly-added empty row auto-removes it.
 *
 * Shared across Quotation / PFI / PO. Pass:
 *   - control, setValue from parent useForm
 *   - productOptions: full list (already filtered by header-level category, if any)
 *   - allProductOptions: unfiltered product list (the modal's searchable
 *     Product dropdown uses this - no category pre-filter inside the modal)
 *   - initLineItem (module-specific empty row shape)
 */
const SalesDocLineItems = ({
  control,
  setValue,
  productOptions,
  allProductOptions,
  initLineItem,
  rebateOptions = [],
  expenseOptions = [],
  currencyCode = "",
  baseCurrencyCode = "",
  exchangeRate = 1,
  readOnly = false,
  /** When true, line-table money cells render the raw INR values with the
   *  base-currency symbol (no exchange-rate conversion). Used on the
   *  Quotation/PFI Step 2 where the user works in base currency. */
  displayInBase = false,
  /** PFI (and future Commercial Invoice) only: render HS code + per-line
   *  weight / package fields in the modal and auto-fill them from the
   *  product master. Off for Quotation / PO. */
  showExportFields = false,
  /** Table column layout. "compact" (default) → 6-col table used in the
   *  Quotation/PFI/PO wizards' edit step. "detailed" → 10-col breakdown
   *  (qty / price / disc% / expenses / rebates / GST% / margin% / total)
   *  shown on the Review step. */
  tableLayout = "compact",
  /** "quotation" | "pfi" | "po" — drives the Excel import/export toolbar.
   *  When omitted the bar is hidden (e.g. read-only review steps). */
  docType = "",
  docNumber = "",
  /** Quotation: capture per-line GST in the modal but don't show the
   *  GST column in the table or the GST row in the per-line breakdown. */
  hideGst = false,
  /** Lead requirement lines only: capture product + qty + unit + HSN +
   *  specs ONLY. No vendor selection, no price/discount, no costing — the
   *  vendor + price are decided later at the Quotation via auto-pick. */
  requirementMode = false,
}) => {
  const { t } = useTranslation();
  const mySwal = withReactContent(Swal);

  const confirmDelete = () =>
    mySwal.fire({
      title: t("Are you sure?"),
      text: t("You won't be able to revert this!"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("Yes, delete it!"),
      customClass: {
        confirmButton: "btn btn-primary",
        cancelButton: "btn btn-outline-danger ms-1",
      },
      buttonsStyling: false,
    });

  const lineFA = useFieldArray({ control, name: "lines" });
  const liveLines = useWatch({ control, name: "lines" }) || [];

  // ── Pagination for the line-items table ───────────────────────────────
  // Client-side only — the rows live in form state, not the server. The
  // paginator only renders when there are more rows than fit in one page,
  // so short tables (the common case) stay unchanged.
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0); // zero-indexed
  const totalRows = lineFA.fields.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageEnd = pageStart + pageSize;
  // Clamp `page` if rows were deleted past the current page boundary.
  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [pageCount, page]);

  const [vendorOptionsByLine, setVendorOptionsByLine] = useState({});
  const [modal, setModal] = useState({ open: false, idx: null, isNew: false });
  // Sub-stepper inside the line-item modal:
  //   0 → Product + vendor selection (radio cards w/ price)
  //   1 → Qty / Price / Disc / Tax / Margin / Description + costing breakdown
  const [modalStep, setModalStep] = useState(0);
  // Product picker mode: false = AsyncSelect server-side search (default),
  // true = browse the full client-side list (for "I don't know the name").
  const [browseAll, setBrowseAll] = useState(false);
  const productSearchTimer = useRef(null);

  // Debounced server-side product search - feeds the AsyncSelect. Hits the
  // /dropdown endpoint so the picked option still carries selling_price /
  // tax_pct / margin_pct / product_rebates / product_expenses for auto-fill.
  const loadProductOptions = (input) =>
    new Promise((resolve) => {
      if (productSearchTimer.current) {
        clearTimeout(productSearchTimer.current);
      }
      const term = (input || "").trim();
      if (term.length < 2) {
        resolve([]);
        return;
      }
      productSearchTimer.current = setTimeout(async () => {
        try {
          const resp = await instance.get(API_ENDPOINTS.products.dropdown, {
            params: { search: term, limit: 20 },
          });
          const rows = resp?.data?.data || [];
          resolve(
            rows.map((p) => ({
              value: p._id,
              label: `${p.code ? p.code + " - " : ""}${p.name}`,
              raw: p,
            })),
          );
        } catch {
          resolve([]);
        }
      }, 300);
    });

  // On Edit hydration: fetch vendor options for each existing line so the
  // table shows full labels and the modal Vendor select is ready to use.
  // Requirement-mode (lead) lines carry no vendor/price, so skip the fetch.
  useEffect(() => {
    if (requirementMode) return;
    (liveLines || []).forEach((l, idx) => {
      if (l?.product_id && !vendorOptionsByLine[idx]) {
        fetchVendorPrices(idx, l.product_id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveLines.length]);

  // Stamp a price-list "best price" row onto a line: vendor + price +
  // discount + provenance (price_list_id / source_rfq_*). Shared by the
  // cheapest auto-pick and the manual vendor radio pick.
  const applyPriceRow = (idx, r) => {
    setValue(`lines.${idx}.vendor_id`, r.vendor_id || "");
    setValue(`lines.${idx}.unit_price`, String(r.unit_price ?? ""));
    if (r.discount_pct !== undefined && r.discount_pct !== null) {
      setValue(`lines.${idx}.discount_pct`, String(r.discount_pct));
    }
    setValue(`lines.${idx}.price_list_id`, r.price_list_id || "");
    setValue(
      `lines.${idx}.source_rfq_id`,
      r.source_type === "rfq" ? r.source_rfq_id || "" : ""
    );
    setValue(
      `lines.${idx}.source_rfq_voucher_no`,
      r.source_type === "rfq" ? r.source_rfq_voucher_no || "" : ""
    );
  };

  const fetchVendorPrices = async (idx, productId) => {
    if (!productId) {
      setVendorOptionsByLine((m) => ({ ...m, [idx]: [] }));
      return [];
    }
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.priceList.byProduct}/${productId}`,
      );
      const rows = resp?.data?.data || [];
      // Sort vendors by unit price ascending so the cheapest seller surfaces
      // first in the radio-card list (and in the auto-pick fallback below).
      const sortedRows = [...rows].sort(
        (a, b) => num(a?.unit_price) - num(b?.unit_price)
      );
      const vOpts = sortedRows.map((r) => ({
        value: r.vendor_id,
        label: formatVendorOption(r),
        raw: r,
      }));
      setVendorOptionsByLine((m) => ({ ...m, [idx]: vOpts }));

      // If the line doesn't have a vendor selected yet, default to the
      // lowest-price one. Don't override a user's existing pick.
      const currentVendorId = liveLines?.[idx]?.vendor_id;
      if (!currentVendorId && sortedRows.length) {
        applyPriceRow(idx, sortedRows[0]);
      }
      return sortedRows;
    } catch (_e) {
      setVendorOptionsByLine((m) => ({ ...m, [idx]: [] }));
      return [];
    }
  };

  const onPickProduct = async (idx, opt) => {
    // Block duplicate products in the same document — every PFI /
    // Quotation / PO line must reference a distinct product, otherwise
    // costing / coverage roll-ups double-count the same SKU.
    if (opt?.value) {
      const dupe = (liveLines || []).some(
        (ln, i) => i !== idx && ln?.product_id === opt.value
      );
      if (dupe) {
        Notification(
          t("Duplicate product"),
          t(
            "This product is already added as a line. Edit the existing line instead."
          ),
          "warning"
        );
        return;
      }
    }
    setValue(`lines.${idx}.product_id`, opt?.value || "");
    if (opt?.raw) {
      setValue(`lines.${idx}.unit`, opt.raw.unit_of_measure || "");
      // Lead requirement lines capture no price/costing — vendor + price are
      // decided later at the Quotation via auto-pick.
      if (!requirementMode) {
        setValue(
          `lines.${idx}.unit_price`,
          String(opt.raw.selling_price ?? ""),
        );
        // Product is the source of truth for GST % and Margin % (and the
        // rebate/expense snapshots below). All overridable per line.
        if (opt.raw.tax_pct !== undefined && opt.raw.tax_pct !== null) {
          setValue(`lines.${idx}.tax_pct`, String(opt.raw.tax_pct));
        }
        if (opt.raw.margin_pct !== undefined && opt.raw.margin_pct !== null) {
          setValue(`lines.${idx}.margin_pct`, String(opt.raw.margin_pct));
        }
      }
      // PFI / export documents: auto-fill HS code + per-line weights from
      // product master. qty defaults to 1 if blank so the weight math has
      // a starting value; user can override any of these.
      if (showExportFields) {
        if (opt.raw.hsn_code != null) {
          setValue(`lines.${idx}.hs_code`, String(opt.raw.hsn_code));
        }
        const liveQty = num(liveLines?.[idx]?.qty);
        const nwpu = num(opt.raw.net_weight_per_unit);
        const gwpu = num(opt.raw.gross_weight_per_unit);
        const pSize = num(opt.raw.pack_size);
        // Stash per-unit values on the line so a later qty change can
        // recompute weights / packages without re-fetching the product.
        setValue(`lines.${idx}._nwpu`, String(nwpu));
        setValue(`lines.${idx}._gwpu`, String(gwpu));
        setValue(`lines.${idx}._pack_size`, String(pSize));
        if (liveQty > 0) {
          setValue(
            `lines.${idx}.net_weight_kg`,
            String(round2(liveQty * nwpu)),
          );
          setValue(
            `lines.${idx}.gross_weight_kg`,
            String(round2(liveQty * gwpu)),
          );
          if (pSize > 0) {
            setValue(
              `lines.${idx}.package_count`,
              String(Math.ceil(liveQty / pSize)),
            );
          }
        }
      }
    }
    setValue(`lines.${idx}.vendor_id`, "");

    // Replace per-line rebate/expense snapshots with the new product's
    // master defaults. Any prior customizations on the previous product
    // are dropped (silent reset - matches user direction).
    const masterRebates = (opt?.raw?.product_rebates || []).map((r) => ({
      rebate_id: r.rebate_id,
      code: r.code,
      name: r.name,
      type: r.type ?? "percent",
      pct: String(r.pct ?? "0"),
    }));
    const masterExpenses = (opt?.raw?.product_expenses || []).map((e) => ({
      expense_id: e.expense_id,
      code: e.code,
      name: e.name,
      type: e.type ?? "fixed",
      value: String(e.value ?? "0"),
    }));
    setValue(`lines.${idx}.product_rebates_snapshot`, masterRebates);
    setValue(`lines.${idx}.product_expenses_snapshot`, masterExpenses);

    // Lead requirement lines never carry a vendor/price — pricing is decided
    // later at the Quotation via auto-pick. Skip the price-list fetch entirely.
    if (requirementMode) return;

    const rows = await fetchVendorPrices(idx, opt?.value);
    if (rows.length) {
      // Auto-pick the cheapest vendor by default (rows are sorted ascending).
      // Stamps vendor + price + discount + provenance; user can override.
      applyPriceRow(idx, rows[0]);
    }
  };

  const onPickVendor = (idx, opt) => {
    setValue(`lines.${idx}.vendor_id`, opt?.value || "");
    if (opt?.raw) {
      // Vendor price list drives Price and Discount %. GST % / Margin %
      // stay product-level - not touched here.
      setValue(`lines.${idx}.unit_price`, String(opt.raw.unit_price ?? ""));
      if (opt.raw.discount_pct !== undefined && opt.raw.discount_pct !== null) {
        setValue(`lines.${idx}.discount_pct`, String(opt.raw.discount_pct));
      }
      // Stash vendor display fields on the line so the table badge renders
      // from line data — independent of `vendorOptionsByLine` (which only
      // populates after the price-list-by-product fetch lands).
      setValue(
        `lines.${idx}.vendor_code`,
        opt.raw.vendor_code || "",
      );
      setValue(
        `lines.${idx}.vendor_name`,
        opt.raw.vendor_name || "",
      );
      // Carry pricing provenance from the picked price-list row.
      setValue(`lines.${idx}.price_list_id`, opt.raw.price_list_id || "");
      setValue(
        `lines.${idx}.source_rfq_id`,
        opt.raw.source_type === "rfq" ? opt.raw.source_rfq_id || "" : ""
      );
      setValue(
        `lines.${idx}.source_rfq_voucher_no`,
        opt.raw.source_type === "rfq" ? opt.raw.source_rfq_voucher_no || "" : ""
      );
    } else {
      setValue(`lines.${idx}.vendor_code`, "");
      setValue(`lines.${idx}.vendor_name`, "");
      setValue(`lines.${idx}.price_list_id`, "");
      setValue(`lines.${idx}.source_rfq_id`, "");
      setValue(`lines.${idx}.source_rfq_voucher_no`, "");
    }
  };

  const openAdd = () => {
    lineFA.append({ ...initLineItem });
    const newIdx = lineFA.fields.length;
    setModal({ open: true, idx: newIdx, isNew: true });
    setModalStep(0);
    // Jump to the page that holds the freshly-added row.
    setPage(Math.floor(newIdx / pageSize));
  };

  const openEdit = (idx) => {
    setModal({ open: true, idx, isNew: false });
    setModalStep(0);
  };

  const closeModal = () => {
    const { idx, isNew } = modal;
    if (isNew && idx !== null) {
      const row = liveLines[idx];
      // Drop the row if the user backed out without entering enough to make
      // a valid line (no product, OR missing qty / price). Prevents zero-
      // value placeholder rows from sticking around in the line items table.
      // Requirement (lead) lines carry no price, so price isn't required.
      const hasValidData =
        !!row?.product_id &&
        num(row?.qty) > 0 &&
        (requirementMode || num(row?.unit_price) > 0);
      if (!hasValidData) {
        lineFA.remove(idx);
        setVendorOptionsByLine((m) => {
          const next = { ...m };
          delete next[idx];
          return next;
        });
      }
    }
    setModal({ open: false, idx: null, isNew: false });
  };

  const removeLine = (idx) => {
    confirmDelete().then((result) => {
      if (!result.isConfirmed) return;
      lineFA.remove(idx);
      setVendorOptionsByLine((m) => {
        const next = { ...m };
        delete next[idx];
        return next;
      });
    });
  };

  // Hydrate vendor dropdown for a line if its options aren't loaded yet
  // (e.g. when opening Edit for a saved line on first render).
  const ensureVendorOpts = (idx, productId) => {
    if (vendorOptionsByLine[idx] || !productId) return;
    fetchVendorPrices(idx, productId);
  };

  const editingIdx = modal.idx;
  const editingLine = editingIdx != null ? liveLines[editingIdx] || {} : {};
  const editingVendorOpts =
    editingIdx != null ? vendorOptionsByLine[editingIdx] || [] : [];
  // Per-line costing for the modal breakdown - shared helper, so the modal,
  // the Step 2 table, and the Step 3 review all use identical math.
  const editingCosting = computeLineCosting(editingLine, { excludeGst: hideGst });

  // Costing figures are in the company's home currency (set by the
  // is_default flag in the Currency module). The converted row only shows
  // when the document currency differs from the home currency.
  const baseSym = currencySymbol(baseCurrencyCode);
  // Symbol of the doc's own currency — same as the detail page uses, so the
  // edit table reads in the foreign currency the user picked at Step 1.
  const docSym =
    displayInBase ? baseSym : currencySymbol(currencyCode) || baseSym;
  const docRate = displayInBase ? 1 : num(exchangeRate) || 1;
  const toDocCcy = (v) => num(v) * docRate;
  const showConverted =
    !!currencyCode && !!baseCurrencyCode && currencyCode !== baseCurrencyCode;

  // Full product list - the Product dropdown is searchable, no category
  // pre-filter inside the modal.
  const modalProductOptions = allProductOptions || productOptions || [];

  // Always refresh vendor options when the Edit modal opens for a line.
  // The on-mount effect (`useEffect` on liveLines.length) caches per-line
  // options, but if the price list was empty when that initial fetch ran —
  // and the user has since added a vendor — the cached `[]` would stick
  // forever. Re-fetching on modal-open guarantees fresh data each time.
  useEffect(() => {
    if (modal.open && editingIdx != null && editingLine?.product_id) {
      fetchVendorPrices(editingIdx, editingLine.product_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal.open, editingIdx, editingLine?.product_id]);

  // Saved lines don't carry the per-unit weight/pack stash (_nwpu/_gwpu/
  // _pack_size) since those aren't persisted. Re-seed them from the product
  // master when an existing line opens for edit so a later qty change can
  // recompute net/gross weight and package count exactly like the new-line
  // flow does.
  useEffect(() => {
    if (
      !modal.open ||
      !showExportFields ||
      editingIdx == null ||
      !editingLine?.product_id
    ) {
      return;
    }
    const opt = (allProductOptions || productOptions || []).find(
      (o) => o.value === editingLine.product_id,
    );
    const raw = opt?.raw;
    if (!raw) return;
    if (editingLine?._nwpu == null || editingLine?._nwpu === "") {
      setValue(
        `lines.${editingIdx}._nwpu`,
        String(num(raw.net_weight_per_unit)),
      );
    }
    if (editingLine?._gwpu == null || editingLine?._gwpu === "") {
      setValue(
        `lines.${editingIdx}._gwpu`,
        String(num(raw.gross_weight_per_unit)),
      );
    }
    if (editingLine?._pack_size == null || editingLine?._pack_size === "") {
      setValue(
        `lines.${editingIdx}._pack_size`,
        String(num(raw.pack_size)),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal.open, editingIdx, editingLine?.product_id, showExportFields]);

  // Buyer's Requirement # = Quotation voucher (TKT-0). For quotations only,
  // the buyer-ref defaults to the quotation voucher when left empty. Prefill
  // the form value on modal open so a readonly field still submits the
  // voucher. Fallback-only: a real ref the user typed is never overwritten.
  const lockBuyerRef = docType === "quotation";
  useEffect(() => {
    if (
      !modal.open ||
      !lockBuyerRef ||
      editingIdx == null ||
      !docNumber
    ) {
      return;
    }
    const current = editingLine?.customer_reference;
    if (current == null || current === "") {
      setValue(`lines.${editingIdx}.customer_reference`, docNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal.open, editingIdx, lockBuyerRef, docNumber]);

  return (
    <Card>
      <CardBody>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="mb-0 fw-bold text-uppercase text-muted">
            {t("Line Items")} <span className="text-danger">*</span>
          </h5>
          {!readOnly && (
            <div className="d-flex flex-wrap gap-1 align-items-center">
              {docType ? (
                <LineItemImportExportBar
                  docType={docType}
                  control={control}
                  lineFA={lineFA}
                  initLineItem={initLineItem}
                  currencyCode={currencyCode}
                  exchangeRate={exchangeRate}
                  docNumber={docNumber}
                  // Smart-jump: only move to the last page when at least one
                  // brand-new row was appended; pure updates stay in place so
                  // the user can see the row that just changed.
                  onAfterImport={({ added, totalAfter }) => {
                    if (added > 0) {
                      setPage(
                        Math.max(0, Math.ceil(totalAfter / pageSize) - 1),
                      );
                    }
                  }}
                />
              ) : null}
              <Button
                size="sm"
                color="primary"
                type="button"
                onClick={openAdd}
              >
                <Plus size={14} /> {t("Add Line")}
              </Button>
            </div>
          )}
        </div>

        {(() => {
          // Treat the in-progress Add row as "not yet there" when deciding
          // whether to show the empty-state hint.
          const visibleCount =
            lineFA.fields.length - (modal.isNew && modal.idx !== null ? 1 : 0);
          return visibleCount === 0;
        })() ? (
          <div className="border rounded p-3 text-center text-muted">
            {t('No line items yet - click "Add Line".')}
          </div>
        ) : (
          <Table
            responsive
            bordered
            className="mb-0 align-top table-dense"
          >
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>{t("Product")}</th>
                {requirementMode ? (
                  <>
                    <th className="text-end">{t("Qty")}</th>
                    <th>{t("HSN")}</th>
                  </>
                ) : tableLayout === "detailed" ? (
                  <>
                    <th className="text-end">{t("Qty")}</th>
                    <th className="text-end">{t("Price")}</th>
                    <th className="text-end">{t("Disc")}</th>
                    <th className="text-end">{t("Expenses")}</th>
                    <th className="text-end">{t("Rebates")}</th>
                    {!hideGst && <th className="text-end">{t("GST")}</th>}
                    <th className="text-end">{t("Margin")}</th>
                    <th className="text-end">{t("Total")}</th>
                  </>
                ) : (
                  <>
                    <th className="text-end">{t("Qty")}</th>
                    <th className="text-end">{t("Price")}</th>
                    <th className="text-end">{t("Total")}</th>
                  </>
                )}
                {!readOnly && (
                  <th className="text-center" style={{ width: 90 }}>
                    {t("Actions")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {lineFA.fields.slice(pageStart, pageEnd).map((field, i) => {
                const idx = pageStart + i;
                // While a brand-new line is being entered in the modal,
                // hide it from the visible list so the user doesn't see
                // an empty placeholder row in the table behind the modal.
                if (modal.isNew && modal.idx === idx) return null;
                const l = liveLines[idx] || {};
                const c = computeLineCosting(l, { excludeGst: hideGst });
                const productLabel =
                  productOptions.find((o) => o.value === l.product_id)?.label ||
                  (allProductOptions || []).find(
                    (o) => o.value === l.product_id,
                  )?.label ||
                  (l.product_code
                    ? `${l.product_code}${l.product_name ? ` - ${l.product_name}` : ""}`
                    : l.product_id
                    ? "-"
                    : t("(not set)"));
                const vendorOpts = vendorOptionsByLine[idx] || [];
                // Fallback chain: live price-list options → line-stored vendor
                // data → "-". The line data (vendor_code/vendor_name) keeps the
                // badge visible even when the product's current price list
                // doesn't list that vendor (expired/changed).
                const vendorOptLabel =
                  vendorOpts
                    .find((o) => o.value === l.vendor_id)
                    ?.label?.split(" - ")[0] || "";
                const vendorLabel =
                  vendorOptLabel ||
                  (l.vendor_name && l.vendor_code
                    ? `${l.vendor_name} [${l.vendor_code}]`
                    : l.vendor_name || l.vendor_code || "-");
                return (
                  <Fragment key={field.id}>
                    <tr>
                      <td className="text-muted">{idx + 1}</td>
                      <td className="text-start">
                        <div>{productLabel}</div>
                        {!requirementMode && vendorLabel && vendorLabel !== "-" ? (
                          <span
                            className="badge d-inline-block mt-50"
                            style={{
                              background: "#eef0f3",
                              color: "#1a2238",
                              fontWeight: 500,
                            }}
                          >
                            {vendorLabel}
                          </span>
                        ) : null}
                        {!requirementMode && l.source_rfq_voucher_no ? (
                          <span
                            className="badge d-inline-block mt-50 ms-50"
                            style={{
                              background: "#eef7ff",
                              color: "#0b5ed7",
                              fontWeight: 500,
                            }}
                            title={t("Price sourced from this RFQ")}
                          >
                            {t("from RFQ")} {l.source_rfq_voucher_no}
                          </span>
                        ) : null}
                        {/* Inline vendor compare/switch — quotation (detailed)
                            only. Lists every vendor that prices this product
                            (cheapest first); click a row to switch the line's
                            vendor + price. */}
                        {!requirementMode &&
                        !readOnly &&
                        tableLayout === "detailed" &&
                        l.product_id &&
                        (vendorOptionsByLine[idx] || []).length > 0 ? (
                          <div className="mt-25">
                            <Button
                              id={`vcmp-${idx}`}
                              color="link"
                              size="sm"
                              className="p-0 text-decoration-none small"
                            >
                              {t("Compare")} (
                              {(vendorOptionsByLine[idx] || []).length})
                            </Button>
                            <UncontrolledPopover
                              target={`vcmp-${idx}`}
                              trigger="legacy"
                              placement="bottom-start"
                            >
                              <PopoverBody className="p-1" style={{ minWidth: 240 }}>
                                <div className="text-uppercase text-muted fw-bold mb-1" style={{ fontSize: "0.65rem" }}>
                                  {t("Vendor prices (cheapest first)")}
                                </div>
                                {(vendorOptionsByLine[idx] || []).map((opt, vi) => {
                                  const r = opt.raw || {};
                                  const isSel = r.vendor_id === l.vendor_id;
                                  return (
                                    <div
                                      key={opt.value}
                                      role="button"
                                      className={`d-flex align-items-center justify-content-between px-1 py-50 rounded ${
                                        isSel ? "bg-light-primary" : ""
                                      }`}
                                      style={{ cursor: "pointer" }}
                                      onClick={() => applyPriceRow(idx, r)}
                                    >
                                      <div className="me-1">
                                        <div className="small fw-semibold">
                                          {r.vendor_name || r.vendor_code || "-"}
                                          {vi === 0 ? (
                                            <span className="badge bg-light-success ms-50">
                                              {t("Cheapest")}
                                            </span>
                                          ) : null}
                                        </div>
                                        {r.source_type === "rfq" &&
                                        r.source_rfq_voucher_no ? (
                                          <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                                            {t("from RFQ")}{" "}
                                            {r.source_rfq_voucher_no}
                                          </div>
                                        ) : null}
                                      </div>
                                      <div className="text-end text-nowrap">
                                        <div className="small fw-bold">
                                          {docSym}
                                          {fmt(toDocCcy(r.unit_price))}
                                        </div>
                                        {num(r.discount_pct) > 0 ? (
                                          <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                                            -{num(r.discount_pct)}%
                                          </div>
                                        ) : null}
                                      </div>
                                      {isSel ? (
                                        <Check size={14} className="text-primary ms-50" />
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </PopoverBody>
                            </UncontrolledPopover>
                          </div>
                        ) : null}
                        {l.customer_reference ? (
                          <div className="small text-muted mt-25">
                            {t("Buyer Ref")}: {l.customer_reference}
                          </div>
                        ) : null}
                      </td>
                      {requirementMode ? (
                        <>
                          <td className="text-end">
                            {l.qty
                              ? `${num(l.qty).toFixed(2)}${
                                  l.unit ? ` ${l.unit}` : ""
                                }`
                              : "-"}
                          </td>
                          <td>{l.hs_code || "-"}</td>
                        </>
                      ) : tableLayout === "detailed" ? (
                        <>
                          <td className="text-end">
                            {l.qty ? (
                              <Fragment>
                                <div>{num(l.qty).toFixed(2)}</div>
                                {l.unit ? (
                                  <small className="text-muted">{l.unit}</small>
                                ) : null}
                              </Fragment>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="text-end">
                            {l.unit_price
                              ? `${docSym}${fmt(toDocCcy(l.unit_price))}`
                              : "-"}
                          </td>
                          <td className="text-end">
                            {num(l.discount_pct) || 0}
                          </td>
                          <td className="text-end">
                            {c.expenses > 0
                              ? `${docSym}${fmt(toDocCcy(c.expenses))}`
                              : "-"}
                          </td>
                          <td className="text-end">
                            {c.rebates > 0
                              ? `${docSym}${fmt(toDocCcy(c.rebates))}`
                              : "-"}
                          </td>
                          {!hideGst && (
                            <td className="text-end">{l.tax_pct || 0}</td>
                          )}
                          <td className="text-end">{l.margin_pct || 0}</td>
                          <td className="text-end fw-bold">
                            {docSym}
                            {fmt(toDocCcy(c.lineTotal))}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="text-end">
                            {l.qty
                              ? `${num(l.qty).toFixed(2)}${
                                  l.unit ? ` ${l.unit}` : ""
                                }`
                              : "-"}
                          </td>
                          <td className="text-end">
                            {num(l.qty) > 0
                              ? `${docSym}${fmt(
                                  toDocCcy(c.lineTotal) / num(l.qty)
                                )}`
                              : l.unit_price
                              ? `${docSym}${fmt(toDocCcy(l.unit_price))}`
                              : "-"}
                          </td>
                          <td className="text-end fw-bold">
                            {docSym}
                            {fmt(toDocCcy(c.lineTotal))}
                          </td>
                        </>
                      )}
                      {!readOnly && (
                        <td>
                          <div
                            className="d-flex justify-content-center align-items-center"
                            style={{ gap: "2px" }}
                          >
                            <Edit
                              size={16}
                              className="cursor-pointer text-primary"
                              onClick={() => openEdit(idx)}
                            />
                            <Trash2
                              size={16}
                              className="cursor-pointer text-danger"
                              onClick={() => removeLine(idx)}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
        )}

        {/* Paginator + per-page selector — shown whenever there's at least
            one row, so the "Show N / of N rows" control is always visible
            (even for a single item). The ReactPaginate widget itself
            collapses to a single page when `pageCount === 1`. */}
        {totalRows > 0 && (
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
                {t("of")} {totalRows} {t("rows")}
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
      </CardBody>

      {/* ── Edit modal ── */}
      <Modal
        isOpen={modal.open}
        toggle={closeModal}
        size="lg"
        backdrop="static"
        style={{ maxWidth: 960 }}
      >
        <ModalHeader toggle={closeModal}>
          {modal.isNew
            ? t("Add Line Item")
            : `${t("Edit Line")} #${(editingIdx ?? 0) + 1}`}
        </ModalHeader>
        <ModalBody>
          {editingIdx != null && (
            <>
              {/* ── Inline 2-step nav (single step in requirement mode) ── */}
              {!requirementMode && (
              <div className="d-flex align-items-center justify-content-center mb-2">
                {[
                  { i: 0, label: t("Product & Vendor") },
                  { i: 1, label: t("Pricing & Details") },
                ].map((s, idx) => (
                  <Fragment key={s.i}>
                    {idx > 0 && (
                      <div
                        style={{
                          width: 56,
                          height: 2,
                          background:
                            modalStep > s.i - 1 ? "#28c76f" : "#dcdbe5",
                          margin: "0 8px",
                          borderRadius: 2,
                        }}
                      />
                    )}
                    <div
                      className="d-flex align-items-center"
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        // Don't allow jumping forward without a product OR
                        // when the product has no vendors on file.
                        if (s.i > 0) {
                          if (!editingLine.product_id) return;
                          const hasFetched =
                            editingIdx != null &&
                            editingIdx in vendorOptionsByLine;
                          if (
                            hasFetched &&
                            (vendorOptionsByLine[editingIdx] || []).length ===
                              0
                          ) {
                            return;
                          }
                        }
                        setModalStep(s.i);
                      }}
                    >
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle me-1"
                        style={{
                          width: 28,
                          height: 28,
                          background:
                            modalStep === s.i
                              ? "#7367f0"
                              : modalStep > s.i
                              ? "#28c76f"
                              : "#fff",
                          color:
                            modalStep === s.i || modalStep > s.i
                              ? "#fff"
                              : "#8c8b97",
                          border:
                            modalStep === s.i || modalStep > s.i
                              ? "none"
                              : "1.5px solid #dcdbe5",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                        }}
                      >
                        {s.i + 1}
                      </div>
                      <span
                        className="fw-semibold"
                        style={{
                          color: modalStep === s.i ? "#1a2238" : "#6e6b7b",
                          fontSize: "0.85rem",
                        }}
                      >
                        {s.label}
                      </span>
                    </div>
                  </Fragment>
                ))}
              </div>
              )}

              {/* ── Step 1: Product + Vendor selection ──────────────── */}
              {(requirementMode || modalStep === 0) && (
              <>
              <Row>
                <Col md="12" className="mb-2">
                  <Label className="form-label d-flex justify-content-between align-items-center">
                    <span>
                      {t("Product")} <span className="text-danger">*</span>
                    </span>
                    <small>
                      <a
                        href="#"
                        className="text-decoration-none"
                        onClick={(e) => {
                          e.preventDefault();
                          setBrowseAll((s) => !s);
                        }}
                      >
                        {browseAll
                          ? t("Search instead")
                          : t("Don't know the name? Browse all")}
                      </a>
                    </small>
                  </Label>
                  <Controller
                    name={`lines.${editingIdx}.product_id`}
                    control={control}
                    render={({ field: f }) => {
                      const selected =
                        (allProductOptions || productOptions || []).find(
                          (o) => o.value === f.value,
                        ) || null;
                      const portalStyles = {
                        menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                      };
                      return browseAll ? (
                        <Select
                          classNamePrefix="select"
                          isSearchable
                          options={modalProductOptions}
                          value={selected}
                          onChange={(opt) => onPickProduct(editingIdx, opt)}
                          placeholder={t("Browse all products…")}
                          menuPortalTarget={document.body}
                          styles={portalStyles}
                        />
                      ) : (
                        <AsyncSelect
                          classNamePrefix="select"
                          cacheOptions
                          defaultOptions={false}
                          loadOptions={loadProductOptions}
                          value={selected}
                          onChange={(opt) => onPickProduct(editingIdx, opt)}
                          placeholder={t("Type 2+ letters to search…")}
                          loadingMessage={() => t("Searching…")}
                          noOptionsMessage={({ inputValue }) =>
                            inputValue && inputValue.length >= 2
                              ? t("No products found")
                              : t("Type to search")
                          }
                          menuPortalTarget={document.body}
                          styles={portalStyles}
                        />
                      );
                    }}
                  />
                </Col>
              </Row>
              {!requirementMode && (
              <Row>
                <Col md="12" className="mb-2">
                  <Label className="form-label">{t("Vendor")}</Label>
                  <Controller
                    name={`lines.${editingIdx}.vendor_id`}
                    control={control}
                    render={({ field: f }) => {
                      if (!editingLine.product_id) {
                        return (
                          <div className="border rounded p-2 text-muted small">
                            {t("Pick a product first to see its vendors.")}
                          </div>
                        );
                      }
                      if (!editingVendorOpts.length) {
                        // Distinguish "still loading" from "no vendors at all".
                        const hasFetched =
                          editingIdx in vendorOptionsByLine;
                        if (!hasFetched) {
                          return (
                            <div className="border rounded p-2 text-muted small">
                              {t("Loading vendors…")}
                            </div>
                          );
                        }
                        return (
                          <div
                            className="rounded p-2 small"
                            style={{
                              background: "#fff3e0",
                              color: "#7a4a00",
                              border: "1px solid #ffe0b2",
                            }}
                          >
                            {t(
                              "No vendor sells this product yet. Add this product to a vendor's price list before quoting it."
                            )}
                          </div>
                        );
                      }
                      const multipleVendors = editingVendorOpts.length > 1;
                      return (
                        <div className="d-flex flex-column gap-1">
                          {multipleVendors && (
                            <div className="text-muted small mb-50">
                              {t(
                                "Cheapest current price is selected by default — pick another vendor to override."
                              )}
                            </div>
                          )}
                          {editingVendorOpts.map((opt, vIdx) => {
                            const r = opt.raw || {};
                            const checked = f.value === opt.value;
                            const id = `vendor-radio-${editingIdx}-${opt.value}`;
                            return (
                              <label
                                key={opt.value}
                                htmlFor={id}
                                className="d-flex align-items-center justify-content-between rounded p-2 mb-0"
                                style={{
                                  cursor: "pointer",
                                  border: checked
                                    ? "1.5px solid #7367f0"
                                    : "1px solid #dcdbe5",
                                  background: checked ? "#f4f3ff" : "#fff",
                                }}
                              >
                                <div className="d-flex align-items-center">
                                  <input
                                    id={id}
                                    type="radio"
                                    name={`vendor-radio-${editingIdx}`}
                                    checked={checked}
                                    onChange={() =>
                                      onPickVendor(editingIdx, opt)
                                    }
                                    className="form-check-input me-2 mt-0"
                                    style={{ cursor: "pointer" }}
                                  />
                                  <div>
                                    <div className="fw-semibold" style={{ color: "#1a2238" }}>
                                      {r.vendor_name ||
                                        opt.label?.split(" - ")[0] ||
                                        opt.label}
                                    </div>
                                    {r.vendor_code && (
                                      <small className="text-muted">
                                        [{r.vendor_code}]
                                      </small>
                                    )}
                                    <div className="mt-25">
                                      {multipleVendors && vIdx === 0 && (
                                        <span
                                          className="badge d-inline-block me-50"
                                          style={{
                                            background: "#e6f7ee",
                                            color: "#1a7f4b",
                                            fontWeight: 500,
                                          }}
                                          title={t(
                                            "Lowest current price — selected by default"
                                          )}
                                        >
                                          {t("Cheapest")}
                                        </span>
                                      )}
                                      {r.source_rfq_voucher_no && (
                                        <span
                                          className="badge d-inline-block"
                                          style={{
                                            background: "#eef7ff",
                                            color: "#0b5ed7",
                                            fontWeight: 500,
                                          }}
                                          title={t(
                                            "Price sourced from this RFQ"
                                          )}
                                        >
                                          {t("from RFQ")}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-end">
                                  <div className="fw-bold" style={{ color: "#1a2238" }}>
                                    {baseSym}
                                    {fmt(r.unit_price)}
                                  </div>
                                  {num(r.discount_pct) > 0 && (
                                    <small className="text-muted">
                                      − {num(r.discount_pct)}%
                                    </small>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      );
                    }}
                  />
                </Col>
              </Row>
              )}

              {/* ── Requirement mode: qty + UOM right under the product ── */}
              {requirementMode && (
              <Row>
                <Col md="4" sm="6" className="mb-2">
                  <Label className="form-label">
                    {t("Qty")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name={`lines.${editingIdx}.qty`}
                    control={control}
                    render={({ field: f }) => {
                      const isInt = UOM_INTEGER_ONLY.has(editingLine.unit);
                      const v = num(f.value);
                      const empty = f.value === "" || f.value == null;
                      const showError = empty
                        ? !!editingLine.product_id
                        : v <= 0 || (isInt && !Number.isInteger(v));
                      return (
                        <>
                          <Input
                            type="number"
                            step={isInt ? "1" : "0.001"}
                            min={isInt ? "1" : "0.001"}
                            invalid={showError}
                            {...f}
                            value={f.value ?? ""}
                          />
                          {showError && (
                            <small className="text-danger d-block">
                              {empty
                                ? t("Qty is required")
                                : v <= 0
                                  ? t("Qty must be greater than 0")
                                  : t(
                                      "This unit ({{unit}}) does not allow decimals",
                                      { unit: editingLine.unit },
                                    )}
                            </small>
                          )}
                        </>
                      );
                    }}
                  />
                </Col>
                <Col md="4" sm="6" className="mb-2">
                  <Label className="form-label">{t("UOM")}</Label>
                  <Controller
                    name={`lines.${editingIdx}.unit`}
                    control={control}
                    render={({ field: f }) => (
                      <Select
                        classNamePrefix="select"
                        isClearable
                        options={PRODUCT_UOM_OPTIONS}
                        value={
                          PRODUCT_UOM_OPTIONS.find(
                            (o) => o.value === f.value,
                          ) || null
                        }
                        onChange={(opt) => f.onChange(opt ? opt.value : "")}
                      />
                    )}
                  />
                </Col>
              </Row>
              )}
              </>
              )}

              {/* ── Step 2: Pricing & description ───────────────────── */}
              {!requirementMode && modalStep === 1 && (
              <>
              <Row>
                <Col md="4" sm="6" className="mb-2">
                  <Label className="form-label">
                    {t("Qty")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name={`lines.${editingIdx}.qty`}
                    control={control}
                    render={({ field: f }) => {
                      const isInt = UOM_INTEGER_ONLY.has(editingLine.unit);
                      const v = num(f.value);
                      const empty = f.value === "" || f.value == null;
                      // Once the line has been started (product or price set),
                      // an empty / invalid qty is flagged inline here - not by
                      // the Done button.
                      const lineStarted =
                        !!editingLine.product_id || !!editingLine.unit_price;
                      const showError = empty
                        ? lineStarted
                        : v <= 0 || (isInt && !Number.isInteger(v));
                      return (
                        <>
                          <Input
                            type="number"
                            step={isInt ? "1" : "0.001"}
                            min={isInt ? "1" : "0.001"}
                            invalid={showError}
                            {...f}
                            value={f.value ?? ""}
                            onChange={(e) => {
                              f.onChange(e);
                              if (showExportFields) {
                                const q = num(e.target.value);
                                const nwpu = num(
                                  liveLines?.[editingIdx]?._nwpu,
                                );
                                const gwpu = num(
                                  liveLines?.[editingIdx]?._gwpu,
                                );
                                const pSize = num(
                                  liveLines?.[editingIdx]?._pack_size,
                                );
                                if (q > 0 && nwpu > 0) {
                                  setValue(
                                    `lines.${editingIdx}.net_weight_kg`,
                                    String(round2(q * nwpu)),
                                  );
                                }
                                if (q > 0 && gwpu > 0) {
                                  setValue(
                                    `lines.${editingIdx}.gross_weight_kg`,
                                    String(round2(q * gwpu)),
                                  );
                                }
                                if (q > 0 && pSize > 0) {
                                  setValue(
                                    `lines.${editingIdx}.package_count`,
                                    String(Math.ceil(q / pSize)),
                                  );
                                }
                              }
                            }}
                          />
                          {showError && (
                            <small className="text-danger d-block">
                              {empty
                                ? t("Qty is required")
                                : v <= 0
                                  ? t("Qty must be greater than 0")
                                  : t(
                                      "This unit ({{unit}}) does not allow decimals",
                                      { unit: editingLine.unit },
                                    )}
                            </small>
                          )}
                        </>
                      );
                    }}
                  />
                </Col>
                <Col md="4" sm="6" className="mb-2">
                  <Label className="form-label">{t("UOM")}</Label>
                  <Controller
                    name={`lines.${editingIdx}.unit`}
                    control={control}
                    render={({ field: f }) => (
                      <Select
                        classNamePrefix="select"
                        isClearable
                        options={PRODUCT_UOM_OPTIONS}
                        value={
                          PRODUCT_UOM_OPTIONS.find(
                            (o) => o.value === f.value,
                          ) || null
                        }
                        onChange={(opt) => {
                          const newUnit = opt ? opt.value : "";
                          f.onChange(newUnit);
                          // If switching to an integer UOM, floor any
                          // decimal qty so the field becomes valid.
                          if (
                            newUnit &&
                            UOM_INTEGER_ONLY.has(newUnit) &&
                            editingLine.qty &&
                            !Number.isInteger(num(editingLine.qty))
                          ) {
                            setValue(
                              `lines.${editingIdx}.qty`,
                              String(Math.floor(num(editingLine.qty))),
                            );
                          }
                        }}
                      />
                    )}
                  />
                </Col>
                <Col md="4" sm="6" className="mb-2">
                  <Label className="form-label">
                    {t("Price")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name={`lines.${editingIdx}.unit_price`}
                    control={control}
                    render={({ field: f }) => {
                      const p = num(f.value);
                      const empty = f.value === "" || f.value == null;
                      const lineStarted =
                        !!editingLine.product_id || !!editingLine.qty;
                      const showError = empty ? lineStarted : p <= 0;
                      return (
                        <>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            invalid={showError}
                            {...f}
                            value={f.value ?? ""}
                          />
                          {showError && (
                            <small className="text-danger d-block">
                              {empty
                                ? t("Price is required")
                                : t("Price must be greater than 0")}
                            </small>
                          )}
                        </>
                      );
                    }}
                  />
                </Col>
              </Row>
              <Row>
                <Col md="4" sm="6" className="mb-2">
                  <Label className="form-label">{t("Disc %")}</Label>
                  <Controller
                    name={`lines.${editingIdx}.discount_pct`}
                    control={control}
                    render={({ field: f }) => (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...f}
                        value={f.value ?? ""}
                      />
                    )}
                  />
                </Col>
                <Col md="4" sm="6" className="mb-2">
                  <Label className="form-label">{t("GST %")}</Label>
                  <Controller
                    name={`lines.${editingIdx}.tax_pct`}
                    control={control}
                    render={({ field: f }) => (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...f}
                        value={f.value ?? ""}
                      />
                    )}
                  />
                </Col>
                <Col md="4" sm="6" className="mb-2">
                  <Label className="form-label">{t("Margin %")}</Label>
                  <Controller
                    name={`lines.${editingIdx}.margin_pct`}
                    control={control}
                    render={({ field: f }) => (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        {...f}
                        value={f.value ?? ""}
                      />
                    )}
                  />
                </Col>
              </Row>

              <hr className="my-2" />

              {/* Rebates editor - pre-filled from product master, fully editable.
                  Edits are scoped to THIS quotation only; product master untouched. */}
              <Row>
                <Col md="12" className="mb-1">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <Label className="form-label mb-0 fw-bold">
                      {t("Rebates")}
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      color="info"
                      outline
                      onClick={() => {
                        const cur = (
                          liveLines?.[editingIdx]?.product_rebates_snapshot ||
                          []
                        ).slice();
                        cur.push({
                          rebate_id: null,
                          code: "",
                          name: "",
                          type: "percent",
                          pct: "0",
                        });
                        setValue(
                          `lines.${editingIdx}.product_rebates_snapshot`,
                          cur,
                        );
                      }}
                    >
                      + {t("Add Rebate")}
                    </Button>
                  </div>
                  {(
                    liveLines?.[editingIdx]?.product_rebates_snapshot || []
                  ).map((row, ri) => (
                    <Row
                      key={`reb-${ri}`}
                      className="align-items-center g-1 mb-1"
                    >
                      <Col md="6">
                        <Controller
                          name={`lines.${editingIdx}.product_rebates_snapshot.${ri}.name`}
                          control={control}
                          defaultValue={row.name || ""}
                          render={() => (
                            <Select
                              classNamePrefix="select"
                              isClearable
                              options={rebateOptions}
                              value={
                                rebateOptions.find(
                                  (o) =>
                                    o.value ===
                                    liveLines?.[editingIdx]
                                      ?.product_rebates_snapshot?.[ri]
                                      ?.rebate_id,
                                ) ||
                                (row.name
                                  ? { value: null, label: row.name }
                                  : null)
                              }
                              onChange={(opt) => {
                                const cur = (
                                  liveLines?.[editingIdx]
                                    ?.product_rebates_snapshot || []
                                ).slice();
                                cur[ri] = {
                                  ...cur[ri],
                                  rebate_id: opt?.value || null,
                                  code: opt?.raw?.code || cur[ri]?.code || "",
                                  name: opt?.raw?.name || opt?.label || "",
                                  type:
                                    opt?.raw?.type ||
                                    cur[ri]?.type ||
                                    "percent",
                                  pct:
                                    opt?.raw?.pct != null
                                      ? String(opt.raw.pct)
                                      : cur[ri]?.pct || "0",
                                };
                                setValue(
                                  `lines.${editingIdx}.product_rebates_snapshot`,
                                  cur,
                                );
                              }}
                              placeholder={t("Pick a rebate")}
                            />
                          )}
                        />
                      </Col>
                      <Col md="3">
                        <Select
                          classNamePrefix="select"
                          options={REBATE_EXPENSE_TYPE_OPTIONS}
                          value={
                            REBATE_EXPENSE_TYPE_OPTIONS.find(
                              (o) => o.value === (row.type || "percent"),
                            ) || REBATE_EXPENSE_TYPE_OPTIONS[0]
                          }
                          onChange={(opt) => {
                            const cur = (
                              liveLines?.[editingIdx]
                                ?.product_rebates_snapshot || []
                            ).slice();
                            cur[ri] = {
                              ...cur[ri],
                              type: opt?.value || "percent",
                            };
                            setValue(
                              `lines.${editingIdx}.product_rebates_snapshot`,
                              cur,
                            );
                          }}
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                          }}
                        />
                      </Col>
                      <Col md="2">
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          placeholder="0"
                          value={row.pct ?? ""}
                          onChange={(e) => {
                            const cur = (
                              liveLines?.[editingIdx]
                                ?.product_rebates_snapshot || []
                            ).slice();
                            cur[ri] = { ...cur[ri], pct: e.target.value };
                            setValue(
                              `lines.${editingIdx}.product_rebates_snapshot`,
                              cur,
                            );
                          }}
                        />
                      </Col>
                      <Col md="1" className="text-end">
                        <Trash2
                          size={16}
                          className="cursor-pointer text-danger"
                          onClick={() => {
                            const cur = (
                              liveLines?.[editingIdx]
                                ?.product_rebates_snapshot || []
                            ).slice();
                            cur.splice(ri, 1);
                            setValue(
                              `lines.${editingIdx}.product_rebates_snapshot`,
                              cur,
                            );
                          }}
                        />
                      </Col>
                    </Row>
                  ))}
                </Col>
              </Row>

              <Row>
                <Col md="12" className="mb-1 mt-2">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <Label className="form-label mb-0 fw-bold">
                      {t("Expenses")}
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      color="info"
                      outline
                      onClick={() => {
                        const cur = (
                          liveLines?.[editingIdx]?.product_expenses_snapshot ||
                          []
                        ).slice();
                        cur.push({
                          expense_id: null,
                          code: "",
                          name: "",
                          type: "fixed",
                          value: "0",
                        });
                        setValue(
                          `lines.${editingIdx}.product_expenses_snapshot`,
                          cur,
                        );
                      }}
                    >
                      + {t("Add Expense")}
                    </Button>
                  </div>
                  {(
                    liveLines?.[editingIdx]?.product_expenses_snapshot || []
                  ).map((row, ei) => (
                    <Row
                      key={`exp-${ei}`}
                      className="align-items-center g-1 mb-1"
                    >
                      <Col md="5">
                        <Controller
                          name={`lines.${editingIdx}.product_expenses_snapshot.${ei}.name`}
                          control={control}
                          defaultValue={row.name || ""}
                          render={() => (
                            <Select
                              classNamePrefix="select"
                              isClearable
                              options={expenseOptions}
                              value={
                                expenseOptions.find(
                                  (o) =>
                                    o.value ===
                                    liveLines?.[editingIdx]
                                      ?.product_expenses_snapshot?.[ei]
                                      ?.expense_id,
                                ) ||
                                (row.name
                                  ? { value: null, label: row.name }
                                  : null)
                              }
                              onChange={(opt) => {
                                const cur = (
                                  liveLines?.[editingIdx]
                                    ?.product_expenses_snapshot || []
                                ).slice();
                                cur[ei] = {
                                  ...cur[ei],
                                  expense_id: opt?.value || null,
                                  code: opt?.raw?.code || cur[ei]?.code || "",
                                  name: opt?.raw?.name || opt?.label || "",
                                  type:
                                    opt?.raw?.type || cur[ei]?.type || "fixed",
                                  value:
                                    opt?.raw?.value != null
                                      ? String(opt.raw.value)
                                      : cur[ei]?.value || "0",
                                };
                                setValue(
                                  `lines.${editingIdx}.product_expenses_snapshot`,
                                  cur,
                                );
                              }}
                              placeholder={t("Pick an expense")}
                            />
                          )}
                        />
                      </Col>
                      <Col md="3">
                        <Select
                          classNamePrefix="select"
                          options={REBATE_EXPENSE_TYPE_OPTIONS}
                          value={
                            REBATE_EXPENSE_TYPE_OPTIONS.find(
                              (o) => o.value === (row.type || "fixed"),
                            ) || REBATE_EXPENSE_TYPE_OPTIONS[1]
                          }
                          onChange={(opt) => {
                            const cur = (
                              liveLines?.[editingIdx]
                                ?.product_expenses_snapshot || []
                            ).slice();
                            cur[ei] = {
                              ...cur[ei],
                              type: opt?.value || "fixed",
                            };
                            setValue(
                              `lines.${editingIdx}.product_expenses_snapshot`,
                              cur,
                            );
                          }}
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                          }}
                        />
                      </Col>
                      <Col md="3">
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          placeholder="0"
                          value={row.value ?? ""}
                          onChange={(e) => {
                            const cur = (
                              liveLines?.[editingIdx]
                                ?.product_expenses_snapshot || []
                            ).slice();
                            cur[ei] = {
                              ...cur[ei],
                              value: e.target.value,
                            };
                            setValue(
                              `lines.${editingIdx}.product_expenses_snapshot`,
                              cur,
                            );
                          }}
                        />
                      </Col>
                      <Col md="1" className="text-end">
                        <Trash2
                          size={16}
                          className="cursor-pointer text-danger"
                          onClick={() => {
                            const cur = (
                              liveLines?.[editingIdx]
                                ?.product_expenses_snapshot || []
                            ).slice();
                            cur.splice(ei, 1);
                            setValue(
                              `lines.${editingIdx}.product_expenses_snapshot`,
                              cur,
                            );
                          }}
                        />
                      </Col>
                    </Row>
                  ))}
                </Col>
              </Row>

              {showExportFields && (
                <>
                  <hr className="my-2" />
                  <Row>
                    <Col md="12" className="mb-1">
                      <Label className="form-label fw-bold">
                        {t("Export / Shipping")}
                      </Label>
                      <small className="text-muted d-block mb-2">
                        {t(
                          "HS code and weights auto-fill from the product master; weights are qty × per-unit and update with qty. Override any value as needed.",
                        )}
                      </small>
                    </Col>
                    <Col md="3" sm="6" className="mb-2">
                      <Label className="form-label">{t("HS Code")}</Label>
                      <Controller
                        name={`lines.${editingIdx}.hs_code`}
                        control={control}
                        render={({ field: f }) => (
                          <Input {...f} value={f.value ?? ""} maxLength={15} />
                        )}
                      />
                    </Col>
                    <Col md="3" sm="6" className="mb-2">
                      <Label className="form-label">
                        {t("Net Weight (kg)")}
                      </Label>
                      <Controller
                        name={`lines.${editingIdx}.net_weight_kg`}
                        control={control}
                        render={({ field: f }) => (
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            {...f}
                            value={f.value ?? ""}
                          />
                        )}
                      />
                    </Col>
                    <Col md="3" sm="6" className="mb-2">
                      <Label className="form-label">
                        {t("Gross Weight (kg)")}
                      </Label>
                      <Controller
                        name={`lines.${editingIdx}.gross_weight_kg`}
                        control={control}
                        render={({ field: f }) => (
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            {...f}
                            value={f.value ?? ""}
                          />
                        )}
                      />
                    </Col>
                    <Col md="3" sm="6" className="mb-2">
                      <Label className="form-label">{t("Packages")}</Label>
                      <Controller
                        name={`lines.${editingIdx}.package_count`}
                        control={control}
                        render={({ field: f }) => (
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            {...f}
                            value={f.value ?? ""}
                          />
                        )}
                      />
                    </Col>
                  </Row>
                </>
              )}

              <hr className="my-2" />

              <Row>
                <Col md="12" className="mb-1">
                  <Label className="form-label">{t("Description")}</Label>
                  <Controller
                    name={`lines.${editingIdx}.description`}
                    control={control}
                    render={({ field: f }) => (
                      <Input
                        type="textarea"
                        rows="2"
                        {...f}
                        value={f.value || ""}
                        placeholder={t(
                          "Optional - overrides product description on the quote",
                        )}
                      />
                    )}
                  />
                </Col>
                <Col md="12" className="mb-1">
                  <Label className="form-label">
                    {t("Buyer's Requirement #")}
                  </Label>
                  <Controller
                    name={`lines.${editingIdx}.customer_reference`}
                    control={control}
                    render={({ field: f }) => (
                      <Input
                        {...f}
                        value={
                          lockBuyerRef
                            ? f.value || docNumber || ""
                            : f.value || ""
                        }
                        readOnly={lockBuyerRef}
                        maxLength={120}
                        placeholder={
                          lockBuyerRef
                            ? t("Auto-fills with the quotation number")
                            : t(
                                "Buyer's internal part code or requisition (e.g. BOSCH PUMP REQUISITION)",
                              )
                        }
                      />
                    )}
                  />
                  <small className="text-muted">
                    {lockBuyerRef
                      ? t(
                          "Auto-fills with the quotation number. Flows forward to PFI, PO, and Invoice. Appears on the Export Invoice PDF.",
                        )
                      : t(
                          "Optional. Flows forward to PFI, PO, and Invoice. Appears on the Export Invoice PDF.",
                        )}
                  </small>
                </Col>
              </Row>

              <hr className="my-2" />

              {/* Per-line costing breakdown - mirrors the backend recompute.
                  Base figures are in the home currency (INR); the final row
                  converts the line total to the document currency via the
                  exchange rate. */}
              <Row>
                <Col md="12">
                  <Label className="form-label fw-bold">
                    {t("Costing Breakdown")}
                  </Label>
                  <ul className="list-unstyled mb-0 border rounded p-2 bg-light">
                    <li className="d-flex justify-content-between py-25">
                      <span className="text-muted">
                        {t("Gross")}{" "}
                        <small>
                          ({t("Qty")} × {t("Price")})
                        </small>
                      </span>
                      <span>
                        {baseSym}
                        {fmt(editingCosting.gross)}
                      </span>
                    </li>
                    {editingCosting.discountAmt > 0 && (
                      <li className="d-flex justify-content-between py-25">
                        <span className="text-muted">
                          − {t("Discount")} ({editingCosting.discountPct}%)
                        </span>
                        <span>
                          {baseSym}
                          {fmt(editingCosting.discountAmt)}
                        </span>
                      </li>
                    )}
                    <li className="d-flex justify-content-between py-25">
                      <span className="text-muted">= {t("Taxable")}</span>
                      <span>
                        {baseSym}
                        {fmt(editingCosting.taxable)}
                      </span>
                    </li>
                    <li className="d-flex justify-content-between py-25">
                      <span className="text-muted">+ {t("Expenses")}</span>
                      <span>
                        {baseSym}
                        {fmt(editingCosting.expenses)}
                      </span>
                    </li>
                    {editingCosting.expensesPctAmt > 0 && (
                      <li className="d-flex justify-content-between ps-2 small text-muted">
                        <span>
                          · {editingCosting.expensesPctRate}% {t("of value")}
                        </span>
                        <span>
                          {baseSym}
                          {fmt(editingCosting.expensesPctAmt)}
                        </span>
                      </li>
                    )}
                    {editingCosting.expensesFixedAmt > 0 && (
                      <li className="d-flex justify-content-between ps-2 small text-muted">
                        <span>· {t("Flat amount")}</span>
                        <span>
                          {baseSym}
                          {fmt(editingCosting.expensesFixedAmt)}
                        </span>
                      </li>
                    )}
                    <li className="d-flex justify-content-between py-25">
                      <span className="text-muted">− {t("Rebates")}</span>
                      <span>
                        {baseSym}
                        {fmt(editingCosting.rebates)}
                      </span>
                    </li>
                    {editingCosting.rebatesPctAmt > 0 && (
                      <li className="d-flex justify-content-between ps-2 small text-muted">
                        <span>
                          · {editingCosting.rebatesPctRate}% {t("of value")}
                        </span>
                        <span>
                          {baseSym}
                          {fmt(editingCosting.rebatesPctAmt)}
                        </span>
                      </li>
                    )}
                    {editingCosting.rebatesFixedAmt > 0 && (
                      <li className="d-flex justify-content-between ps-2 small text-muted">
                        <span>· {t("Flat amount")}</span>
                        <span>
                          {baseSym}
                          {fmt(editingCosting.rebatesFixedAmt)}
                        </span>
                      </li>
                    )}
                    <li className="d-flex justify-content-between py-25">
                      <span className="text-muted">
                        + {t("Margin")} ({num(editingLine.margin_pct)}%)
                      </span>
                      <span>
                        {baseSym}
                        {fmt(editingCosting.margin)}
                      </span>
                    </li>
                    {!hideGst && (
                      <li className="d-flex justify-content-between py-25">
                        <span className="text-muted">
                          + {t("GST")} ({num(editingLine.tax_pct)}%)
                        </span>
                        <span>
                          {baseSym}
                          {fmt(editingCosting.gst)}
                        </span>
                      </li>
                    )}
                    <li className="d-flex justify-content-between pt-50 mt-25 border-top fw-bold">
                      <span>{t("Line Total")}</span>
                      <span>
                        {baseSym}
                        {fmt(editingCosting.lineTotal)}
                      </span>
                    </li>
                    {showConverted && (
                      <li className="d-flex justify-content-between pt-25 fw-bold text-primary">
                        <span>
                          {t("Line Total")} ({currencyCode}){" "}
                          <small className="text-muted fw-normal">
                            @ {exchangeRate}
                          </small>
                        </span>
                        <span>
                          {currencySymbol(currencyCode)}
                          {fmt(
                            round2(
                              editingCosting.lineTotal * num(exchangeRate),
                            ),
                          )}
                        </span>
                      </li>
                    )}
                  </ul>
                </Col>
              </Row>
              </>
              )}

              {/* ── Requirement mode: HSN + specs + buyer-ref only ──── */}
              {requirementMode && (
              <>
              <hr className="my-2" />
              <Row>
                <Col md="4" sm="6" className="mb-2">
                  <Label className="form-label">{t("HS Code")}</Label>
                  <Controller
                    name={`lines.${editingIdx}.hs_code`}
                    control={control}
                    render={({ field: f }) => (
                      <Input {...f} value={f.value ?? ""} maxLength={15} />
                    )}
                  />
                </Col>
              </Row>
              <Row>
                <Col md="12" className="mb-1">
                  <Label className="form-label">
                    {t("Specifications / Description")}
                  </Label>
                  <Controller
                    name={`lines.${editingIdx}.description`}
                    control={control}
                    render={({ field: f }) => (
                      <Input
                        type="textarea"
                        rows="2"
                        {...f}
                        value={f.value || ""}
                        placeholder={t(
                          "Product specs / requirement notes for this line",
                        )}
                      />
                    )}
                  />
                </Col>
                <Col md="12" className="mb-1">
                  <Label className="form-label">
                    {t("Buyer's Requirement #")}
                  </Label>
                  <Controller
                    name={`lines.${editingIdx}.customer_reference`}
                    control={control}
                    render={({ field: f }) => (
                      <Input
                        {...f}
                        value={f.value || ""}
                        maxLength={120}
                        placeholder={t(
                          "Buyer's internal part code or requisition (optional)",
                        )}
                      />
                    )}
                  />
                </Col>
              </Row>
              </>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          {(() => {
            const q = num(editingLine.qty);
            const p = num(editingLine.unit_price);
            const isInt = UOM_INTEGER_ONLY.has(editingLine.unit);
            const hasAnyData =
              !!editingLine.product_id ||
              !!editingLine.qty ||
              !!editingLine.unit_price;
            const qtyInvalid =
              hasAnyData && (q <= 0 || (isInt && !Number.isInteger(q)));
            // Lead requirement lines carry no price — don't gate on it.
            const priceInvalid = !requirementMode && hasAnyData && p <= 0;
            const productMissing = hasAnyData && !editingLine.product_id;
            const blocked = qtyInvalid || priceInvalid || productMissing;
            // Requirement mode is a single step → always behave like "Done".
            const onStep1 = !requirementMode && modalStep === 0;
            const hasFetchedVendors =
              editingIdx != null && editingIdx in vendorOptionsByLine;
            const noVendors =
              !!editingLine.product_id &&
              hasFetchedVendors &&
              editingVendorOpts.length === 0;
            const cannotAdvance =
              onStep1 && (!editingLine.product_id || noVendors);
            const step1Hint = onStep1
              ? !editingLine.product_id
                ? t("Pick a product to continue")
                : !hasFetchedVendors
                ? t("Loading vendors…")
                : noVendors
                ? t(
                    "No vendor sells this product yet — add it to a vendor's price list first."
                  )
                : null
              : null;
            return (
              <>
                {step1Hint && (
                  <small
                    className={
                      noVendors ? "text-warning me-auto" : "text-muted me-auto"
                    }
                  >
                    {step1Hint}
                  </small>
                )}
                {blocked && !onStep1 && (
                  <small className="text-danger me-auto">
                    {productMissing
                      ? t("Pick a product")
                      : t("Fix the highlighted fields to continue")}
                  </small>
                )}
                {!onStep1 && (
                  <Button
                    color="secondary"
                    outline
                    onClick={() => setModalStep(0)}
                  >
                    {t("Back")}
                  </Button>
                )}
                {onStep1 ? (
                  <Button
                    color="primary"
                    onClick={() => setModalStep(1)}
                    disabled={cannotAdvance}
                  >
                    {t("Next")}
                  </Button>
                ) : (
                  <Button
                    color="primary"
                    onClick={closeModal}
                    disabled={blocked}
                  >
                    {t("Done")}
                  </Button>
                )}
              </>
            );
          })()}
        </ModalFooter>
      </Modal>
    </Card>
  );
};

export default SalesDocLineItems;
