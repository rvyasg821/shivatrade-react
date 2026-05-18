import { Fragment, useState, useEffect, useRef } from "react";
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
} from "reactstrap";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import { Plus, Trash2, Edit } from "react-feather";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import instance from "@src/utility/AxiosConfig";
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
  /** PFI (and future Commercial Invoice) only: render HS code + per-line
   *  weight / package fields in the modal and auto-fill them from the
   *  product master. Off for Quotation / PO. */
  showExportFields = false,
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

  const [vendorOptionsByLine, setVendorOptionsByLine] = useState({});
  const [modal, setModal] = useState({ open: false, idx: null, isNew: false });
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
  useEffect(() => {
    (liveLines || []).forEach((l, idx) => {
      if (l?.product_id && !vendorOptionsByLine[idx]) {
        fetchVendorPrices(idx, l.product_id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveLines.length]);

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
      const vOpts = rows.map((r) => ({
        value: r.vendor_id,
        label: formatVendorOption(r),
        raw: r,
      }));
      setVendorOptionsByLine((m) => ({ ...m, [idx]: vOpts }));
      return rows;
    } catch (_e) {
      setVendorOptionsByLine((m) => ({ ...m, [idx]: [] }));
      return [];
    }
  };

  const onPickProduct = async (idx, opt) => {
    setValue(`lines.${idx}.product_id`, opt?.value || "");
    if (opt?.raw) {
      setValue(`lines.${idx}.unit`, opt.raw.unit_of_measure || "");
      setValue(`lines.${idx}.unit_price`, String(opt.raw.selling_price ?? ""));
      // Product is the source of truth for GST % and Margin % (and the
      // rebate/expense snapshots below). All overridable per line.
      if (opt.raw.tax_pct !== undefined && opt.raw.tax_pct !== null) {
        setValue(`lines.${idx}.tax_pct`, String(opt.raw.tax_pct));
      }
      if (opt.raw.margin_pct !== undefined && opt.raw.margin_pct !== null) {
        setValue(`lines.${idx}.margin_pct`, String(opt.raw.margin_pct));
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
        // Stash per-unit values on the line so a later qty change can
        // recompute weights without re-fetching the product.
        setValue(`lines.${idx}._nwpu`, String(nwpu));
        setValue(`lines.${idx}._gwpu`, String(gwpu));
        if (liveQty > 0) {
          setValue(
            `lines.${idx}.net_weight_kg`,
            String(round2(liveQty * nwpu)),
          );
          setValue(
            `lines.${idx}.gross_weight_kg`,
            String(round2(liveQty * gwpu)),
          );
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

    const rows = await fetchVendorPrices(idx, opt?.value);
    if (rows.length) {
      // Vendor price list is the source of truth for Price and Discount %.
      const first = rows[0];
      setValue(`lines.${idx}.vendor_id`, first.vendor_id || "");
      setValue(`lines.${idx}.unit_price`, String(first.unit_price ?? ""));
      if (first.discount_pct !== undefined && first.discount_pct !== null) {
        setValue(`lines.${idx}.discount_pct`, String(first.discount_pct));
      }
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
    }
  };

  const openAdd = () => {
    lineFA.append({ ...initLineItem });
    const newIdx = lineFA.fields.length;
    setModal({ open: true, idx: newIdx, isNew: true });
  };

  const openEdit = (idx) => {
    setModal({ open: true, idx, isNew: false });
  };

  const closeModal = () => {
    const { idx, isNew } = modal;
    if (isNew && idx !== null) {
      const row = liveLines[idx];
      // Drop the row if the user backed out without entering enough to make
      // a valid line (no product, OR missing qty / price). Prevents zero-
      // value placeholder rows from sticking around in the line items table.
      const hasValidData =
        !!row?.product_id && num(row?.qty) > 0 && num(row?.unit_price) > 0;
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
  const editingCosting = computeLineCosting(editingLine);

  // Costing figures are in the company's home currency (set by the
  // is_default flag in the Currency module). The converted row only shows
  // when the document currency differs from the home currency.
  const baseSym = currencySymbol(baseCurrencyCode);
  const showConverted =
    !!currencyCode && !!baseCurrencyCode && currencyCode !== baseCurrencyCode;

  // Full product list - the Product dropdown is searchable, no category
  // pre-filter inside the modal.
  const modalProductOptions = allProductOptions || productOptions || [];

  if (modal.open && editingIdx != null) {
    ensureVendorOpts(editingIdx, editingLine.product_id);
  }

  return (
    <Card>
      <CardBody>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="mb-0 fw-bold text-uppercase text-muted">
            {t("Line Items")} <span className="text-danger">*</span>
          </h5>
          {!readOnly && (
            <Button size="sm" color="primary" type="button" onClick={openAdd}>
              <Plus size={14} /> {t("Add Line")}
            </Button>
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
          <Table responsive bordered className="mb-0 align-middle">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>{t("Product")}</th>
                <th>{t("Vendor")}</th>
                <th className="text-end">{t("Qty")}</th>
                <th>{t("UOM")}</th>
                <th className="text-end">{t("Price")}</th>
                <th className="text-end">{t("Disc %")}</th>
                <th className="text-end">{t("Expenses")}</th>
                <th className="text-end">{t("Rebates")}</th>
                <th className="text-end">{t("GST %")}</th>
                <th className="text-end">{t("Margin %")}</th>
                <th className="text-end">{t("Line Total")}</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {lineFA.fields.map((field, idx) => {
                // While a brand-new line is being entered in the modal,
                // hide it from the visible list so the user doesn't see
                // an empty placeholder row in the table behind the modal.
                if (modal.isNew && modal.idx === idx) return null;
                const l = liveLines[idx] || {};
                const c = computeLineCosting(l);
                const lineNet = c.taxable;
                const productLabel =
                  productOptions.find((o) => o.value === l.product_id)?.label ||
                  (l.product_id ? "-" : t("(not set)"));
                const vendorOpts = vendorOptionsByLine[idx] || [];
                const vendorLabel =
                  vendorOpts
                    .find((o) => o.value === l.vendor_id)
                    ?.label?.split(" - ")[0] || "-";
                // Pull rebates/expenses from the line snapshot (which may
                // be edited per-line), not from the product master.
                const lineRebates = l?.product_rebates_snapshot || [];
                const lineExpenses = l?.product_expenses_snapshot || [];
                const hasChips = lineRebates.length || lineExpenses.length;
                return (
                  <Fragment key={field.id}>
                    <tr>
                      <td className="text-muted">{idx + 1}</td>
                      <td>{productLabel}</td>
                      <td>{vendorLabel}</td>
                      <td className="text-end">{l.qty || "-"}</td>
                      <td>{l.unit || "-"}</td>
                      <td className="text-end">
                        {l.unit_price ? `${baseSym}${fmt(l.unit_price)}` : "-"}
                      </td>
                      <td className="text-end">{num(l.discount_pct) || 0}</td>
                      <td className="text-end">
                        {c.expenses > 0 ? `${baseSym}${fmt(c.expenses)}` : "-"}
                      </td>
                      <td className="text-end">
                        {c.rebates > 0 ? `${baseSym}${fmt(c.rebates)}` : "-"}
                      </td>
                      <td className="text-end">{num(l.tax_pct) || 0}</td>
                      <td className="text-end">{num(l.margin_pct) || 0}</td>
                      <td className="text-end fw-bold">
                        {baseSym}
                        {fmt(c.lineTotal)}
                      </td>
                      <td>
                        <div
                          className="d-flex justify-content-center align-items-center"
                          style={{ gap: "2px" }}
                        >
                          <Edit
                            size={16}
                            className={
                              readOnly
                                ? "text-muted opacity-50"
                                : "cursor-pointer text-primary"
                            }
                            onClick={() => !readOnly && openEdit(idx)}
                          />
                          <Trash2
                            size={16}
                            className={
                              readOnly
                                ? "text-muted opacity-50"
                                : "cursor-pointer text-danger"
                            }
                            onClick={() => !readOnly && removeLine(idx)}
                          />
                        </div>
                      </td>
                    </tr>
                    {hasChips && (
                      <tr className="bg-light">
                        <td></td>
                        <td colSpan={12} className="py-1">
                          <small className="text-muted me-2">
                            {t("Auto-applied:")}
                          </small>
                          {lineRebates.map((r) => {
                            const isFixed = r.type === "fixed";
                            const amt = isFixed
                              ? num(r.pct)
                              : (lineNet * num(r.pct)) / 100;
                            return (
                              <span
                                key={`r-${idx}-${r.rebate_id}`}
                                className="badge bg-success text-white me-1"
                              >
                                {r.code || r.name}{" "}
                                {isFixed
                                  ? fmt(num(r.pct))
                                  : `${num(r.pct)}% = ${fmt(amt)}`}
                              </span>
                            );
                          })}
                          {lineExpenses.map((e) => {
                            const amt =
                              e.type === "percent"
                                ? (lineNet * num(e.value)) / 100
                                : num(e.value);
                            return (
                              <span
                                key={`e-${idx}-${e.expense_id}`}
                                className="badge bg-warning text-dark me-1"
                              >
                                {e.code || e.name}{" "}
                                {e.type === "percent" ? `${num(e.value)}%` : ""}{" "}
                                = {fmt(amt)}
                              </span>
                            );
                          })}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
        )}
      </CardBody>

      {/* ── Edit modal ── */}
      <Modal
        isOpen={modal.open}
        toggle={closeModal}
        size="xl"
        backdrop="static"
      >
        <ModalHeader toggle={closeModal}>
          {modal.isNew
            ? t("Add Line Item")
            : `${t("Edit Line")} #${(editingIdx ?? 0) + 1}`}
        </ModalHeader>
        <ModalBody>
          {editingIdx != null && (
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
              <Row>
                <Col md="12" className="mb-2">
                  <Label className="form-label">{t("Vendor")}</Label>
                  <Controller
                    name={`lines.${editingIdx}.vendor_id`}
                    control={control}
                    render={({ field: f }) => (
                      <Select
                        classNamePrefix="select"
                        isClearable
                        options={editingVendorOpts}
                        value={
                          editingVendorOpts.find((o) => o.value === f.value) ||
                          null
                        }
                        onChange={(opt) => onPickVendor(editingIdx, opt)}
                        placeholder={
                          editingVendorOpts.length
                            ? t("Pick vendor")
                            : t("No vendor prices")
                        }
                        isDisabled={!editingVendorOpts.length}
                      />
                    )}
                  />
                </Col>
              </Row>
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
                    <li className="d-flex justify-content-between py-25">
                      <span className="text-muted">
                        + {t("GST")} ({num(editingLine.tax_pct)}%)
                      </span>
                      <span>
                        {baseSym}
                        {fmt(editingCosting.gst)}
                      </span>
                    </li>
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
        </ModalBody>
        <ModalFooter>
          {(() => {
            // Block "Done" when this line has data but qty / unit_price are
            // missing or invalid. Empty rows still close (auto-removed).
            const q = num(editingLine.qty);
            const p = num(editingLine.unit_price);
            const isInt = UOM_INTEGER_ONLY.has(editingLine.unit);
            const hasAnyData =
              !!editingLine.product_id ||
              !!editingLine.qty ||
              !!editingLine.unit_price;
            const qtyInvalid =
              hasAnyData && (q <= 0 || (isInt && !Number.isInteger(q)));
            const priceInvalid = hasAnyData && p <= 0;
            const productMissing = hasAnyData && !editingLine.product_id;
            const blocked = qtyInvalid || priceInvalid || productMissing;
            return (
              <>
                {blocked && (
                  <small className="text-danger me-auto">
                    {productMissing
                      ? t("Pick a product")
                      : t("Fix the highlighted fields to continue")}
                  </small>
                )}
                <Button color="primary" onClick={closeModal} disabled={blocked}>
                  {t("Done")}
                </Button>
              </>
            );
          })()}
        </ModalFooter>
      </Modal>
    </Card>
  );
};

export default SalesDocLineItems;
