// ── PO Line Items ────────────────────────────────────────────────────
// Compact summary table with Add / Edit / Delete actions, matching the
// Quotation + PFI UX (SalesDocLineItems) but tailored to PO:
//   - single-vendor (vendor is locked at PO header — no per-line picker)
//   - no rebates / expenses / margin per line (sales-side concepts)
//   - vendor-specific price list (priceByProduct from wizard) as the
//     default product source; "Browse all" toggle falls back to global
//     async search (no auto-price-fill in that mode)
//   - CGST/SGST/IGST live preview inside the modal
//
// Backed by `useFieldArray({ name: "lines" })` — identical underlying
// shape to the old inline-grid Step2Items, so no DTO change needed.

import { Fragment, useRef, useState } from "react";
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form";
import {
  Card,
  CardBody,
  Row,
  Col,
  Label,
  Input,
  Button,
  Table,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import { useTranslation } from "react-i18next";
import { Plus, Edit, Trash2, AlertTriangle } from "react-feather";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import {
  PRODUCT_UOM_OPTIONS,
  UOM_INTEGER_ONLY,
} from "@constant/options";
import { currencySymbol } from "./_helpers";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);
const round2 = (n) =>
  !isFinite(n) ? 0 : Math.round((n + Number.EPSILON) * 100) / 100;

// Mirror the backend tax engine for live preview. Kept identical to
// PO's BE engine so totals never diverge between FE preview and BE save.
function computeLine({ qty, unit_price, discount_pct, tax_pct, intraState }) {
  const q = num(qty);
  const p = num(unit_price);
  const d = num(discount_pct);
  const tp = num(tax_pct);
  const gross = q * p;
  const discount_amount = (gross * d) / 100;
  const taxable = gross - discount_amount;
  const tax_amount = (taxable * tp) / 100;
  const cgst = intraState ? round2(tax_amount / 2) : 0;
  const sgst = intraState ? round2(tax_amount / 2) : 0;
  const igst = intraState ? 0 : round2(tax_amount);
  return {
    gross: round2(gross),
    discount_amount: round2(discount_amount),
    taxable: round2(taxable),
    cgst,
    sgst,
    igst,
    total_tax: round2(tax_amount),
    line_total: round2(taxable + tax_amount),
  };
}

const fmt = (v) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString();

const PoLineItems = ({
  isLocked,
  vendorProductOptions,
  productById,
  priceByProduct,
  intraState,
  initLineItem,
}) => {
  const { t } = useTranslation();
  const mySwal = withReactContent(Swal);
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext();

  const lineFA = useFieldArray({ control, name: "lines" });
  const liveLines = useWatch({ control, name: "lines" }) || [];
  // Currency symbol — driven by the form's currency_code (set on Step 1).
  // Falls back to the code itself if not in our static symbol map.
  const formCurrencyCode = useWatch({ control, name: "currency_code" });
  const sym = currencySymbol(formCurrencyCode);

  const [modal, setModal] = useState({
    open: false,
    idx: null,
    isNew: false,
  });
  // Product picker mode: false = vendor price list (default),
  // true = global async search (no price auto-fill).
  const [browseAll, setBrowseAll] = useState(false);
  const productSearchTimer = useRef(null);

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

  // Debounced server-side product search for "Browse all" mode.
  // Hits the same dropdown endpoint Quotation/PFI use.
  const loadProductOptions = (input) =>
    new Promise((resolve) => {
      if (productSearchTimer.current)
        clearTimeout(productSearchTimer.current);
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
            }))
          );
        } catch {
          resolve([]);
        }
      }, 300);
    });

  // Apply product picked from the vendor price list — also auto-fills
  // unit_price from the vendor's quoted rate.
  const onPickFromVendorList = (idx, productId) => {
    const p = productById.get(productId);
    setValue(`lines.${idx}.product_id`, productId, { shouldDirty: true });
    if (p) {
      setValue(`lines.${idx}.description`, p.description || "", {
        shouldDirty: true,
      });
      setValue(`lines.${idx}.hsn_code`, p.hsn_code || "", {
        shouldDirty: true,
      });
      setValue(`lines.${idx}.unit`, p.unit_of_measure || "", {
        shouldDirty: true,
      });
      setValue(`lines.${idx}.tax_pct`, String(p.tax_pct ?? "0"), {
        shouldDirty: true,
      });
    }
    const priceRow = priceByProduct.get(productId);
    if (priceRow) {
      setValue(`lines.${idx}.unit_price`, String(priceRow.unit_price ?? "0"), {
        shouldDirty: true,
      });
    }
  };

  // Apply product picked via Browse-all — does NOT auto-fill price
  // (product isn't in this vendor's price list).
  const onPickFromAll = (idx, opt) => {
    setValue(`lines.${idx}.product_id`, opt?.value || "", {
      shouldDirty: true,
    });
    if (opt?.raw) {
      const p = opt.raw;
      setValue(`lines.${idx}.description`, p.description || "", {
        shouldDirty: true,
      });
      setValue(`lines.${idx}.hsn_code`, p.hsn_code || "", {
        shouldDirty: true,
      });
      setValue(`lines.${idx}.unit`, p.unit_of_measure || "", {
        shouldDirty: true,
      });
      setValue(`lines.${idx}.tax_pct`, String(p.tax_pct ?? "0"), {
        shouldDirty: true,
      });
      // unit_price intentionally left untouched — user must enter manually.
    }
  };

  const openAdd = () => {
    lineFA.append({ ...initLineItem });
    const newIdx = lineFA.fields.length;
    setBrowseAll(false);
    setModal({ open: true, idx: newIdx, isNew: true });
  };

  const openEdit = (idx) => {
    setBrowseAll(false);
    setModal({ open: true, idx, isNew: false });
  };

  const closeModal = () => {
    const { idx, isNew } = modal;
    if (isNew && idx !== null) {
      const row = liveLines[idx];
      const hasValidData =
        !!row?.product_id && num(row?.qty) > 0 && num(row?.unit_price) > 0;
      if (!hasValidData) lineFA.remove(idx);
    }
    setModal({ open: false, idx: null, isNew: false });
  };

  const removeLine = (idx) => {
    confirmDelete().then((result) => {
      if (!result.isConfirmed) return;
      lineFA.remove(idx);
    });
  };

  const editingIdx = modal.idx;
  const editingLine = editingIdx != null ? liveLines[editingIdx] || {} : {};
  const editingCosting = computeLine({
    qty: editingLine.qty,
    unit_price: editingLine.unit_price,
    discount_pct: editingLine.discount_pct,
    tax_pct: editingLine.tax_pct,
    intraState,
  });

  // Vendor's list-price for the currently picked product, used to
  // render the "List price: ₹X" hint beneath the Rate input.
  const listPriceForEditing = (() => {
    const pid = editingLine?.product_id;
    if (!pid || !priceByProduct) return null;
    const row = priceByProduct.get(pid);
    return row?.unit_price != null ? num(row.unit_price) : null;
  })();

  // Has the user picked a product that's NOT in the vendor's price list?
  // Used to show the "no list price" warning under the Rate field.
  const isOutOfVendorList =
    editingLine?.product_id &&
    !vendorProductOptions.find((o) => o.value === editingLine.product_id);

  const isIntegerUnit = UOM_INTEGER_ONLY.has(editingLine.unit);

  return (
    <Card>
      <CardBody>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div>
            <h5 className="mb-0 fw-bold text-uppercase text-muted">
              {t("Line Items")} <span className="text-danger">*</span>
            </h5>
            <small className="text-muted">
              {intraState
                ? t("Intra-state vendor → CGST + SGST split")
                : t("Inter-state vendor → IGST")}
            </small>
          </div>
          {!isLocked && (
            <Button size="sm" color="primary" type="button" onClick={openAdd}>
              <Plus size={14} /> {t("Add Line")}
            </Button>
          )}
        </div>

        {errors.lines && typeof errors.lines.message === "string" && (
          <div className="text-danger small mb-2">{errors.lines.message}</div>
        )}

        {(() => {
          const visibleCount =
            lineFA.fields.length - (modal.isNew && modal.idx !== null ? 1 : 0);
          return visibleCount === 0;
        })() ? (
          <div className="border rounded p-3 text-center text-muted">
            {t('No line items yet — click "Add Line".')}
          </div>
        ) : (
          <div className="table-responsive">
            <Table bordered size="sm" className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th>{t("Product")}</th>
                  <th style={{ width: 80 }}>{t("HSN")}</th>
                  <th style={{ width: 80 }} className="text-end">
                    {t("Qty")}
                  </th>
                  <th style={{ width: 70 }}>{t("Unit")}</th>
                  <th style={{ width: 110 }} className="text-end">
                    {t("Rate")}
                  </th>
                  <th style={{ width: 80 }} className="text-end">
                    {t("Disc%")}
                  </th>
                  <th style={{ width: 80 }} className="text-end">
                    {t("GST%")}
                  </th>
                  <th style={{ width: 100 }} className="text-end">
                    {t("Taxable")}
                  </th>
                  <th style={{ width: 100 }} className="text-end">
                    {t("Tax")}
                  </th>
                  <th style={{ width: 110 }} className="text-end">
                    {t("Total")}
                  </th>
                  <th style={{ width: 70 }}></th>
                </tr>
              </thead>
              <tbody>
                {lineFA.fields.map((field, idx) => {
                  if (modal.isNew && modal.idx === idx) return null;
                  const l = liveLines[idx] || {};
                  const live = computeLine({
                    qty: l.qty,
                    unit_price: l.unit_price,
                    discount_pct: l.discount_pct,
                    tax_pct: l.tax_pct,
                    intraState,
                  });
                  const errLine = errors?.lines?.[idx];
                  const hasErr = !!errLine;
                  const productLabel =
                    vendorProductOptions.find(
                      (o) => o.value === l.product_id
                    )?.label ||
                    productById?.get?.(l.product_id)?.name ||
                    (l.product_id ? "-" : t("(not set)"));
                  return (
                    <tr key={field.id}>
                      <td className="text-muted">{idx + 1}</td>
                      <td>{productLabel}</td>
                      <td>{l.hsn_code || "-"}</td>
                      <td className="text-end">{fmt(l.qty)}</td>
                      <td>{l.unit || "-"}</td>
                      <td className="text-end">
                        {l.unit_price ? fmt(l.unit_price) : "-"}
                      </td>
                      <td className="text-end">{num(l.discount_pct) || 0}</td>
                      <td className="text-end">{num(l.tax_pct) || 0}</td>
                      <td className="text-end">{fmt(live.taxable)}</td>
                      <td className="text-end">
                        {fmt(live.total_tax)}
                        {intraState ? (
                          <div className="small text-muted">
                            C {live.cgst} / S {live.sgst}
                          </div>
                        ) : (
                          <div className="small text-muted">
                            IGST {live.igst}
                          </div>
                        )}
                      </td>
                      <td className="text-end fw-bold">
                        {fmt(live.line_total)}
                      </td>
                      <td>
                        <div
                          className="d-flex justify-content-center align-items-center"
                          style={{ gap: "2px" }}
                        >
                          <Edit
                            size={16}
                            className={
                              isLocked
                                ? "text-muted opacity-50"
                                : hasErr
                                ? "cursor-pointer text-danger"
                                : "cursor-pointer text-primary"
                            }
                            onClick={() => !isLocked && openEdit(idx)}
                          />
                          <Trash2
                            size={16}
                            className={
                              isLocked
                                ? "text-muted opacity-50"
                                : "cursor-pointer text-danger"
                            }
                            onClick={() => !isLocked && removeLine(idx)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}

        {/* ── Edit / Add modal ─────────────────────────────────────────── */}
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
              <Fragment>
                {/* Product picker — vendor-list ↔ browse-all toggle */}
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
                            ? t("Use vendor's price list")
                            : t("Not in vendor's list? Browse all")}
                        </a>
                      </small>
                    </Label>
                    <Controller
                      name={`lines.${editingIdx}.product_id`}
                      control={control}
                      render={({ field }) => {
                        const portalStyles = {
                          menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                        };
                        if (browseAll) {
                          const selected = field.value
                            ? {
                                value: field.value,
                                label:
                                  productById?.get?.(field.value)?.name ||
                                  t("Selected product"),
                              }
                            : null;
                          return (
                            <AsyncSelect
                              classNamePrefix="select"
                              cacheOptions
                              defaultOptions={false}
                              isDisabled={isLocked}
                              loadOptions={loadProductOptions}
                              value={selected}
                              onChange={(opt) => onPickFromAll(editingIdx, opt)}
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
                        }
                        return (
                          <Select
                            classNamePrefix="select"
                            isDisabled={isLocked}
                            options={vendorProductOptions}
                            value={
                              vendorProductOptions.find(
                                (o) => o.value === field.value
                              ) || null
                            }
                            onChange={(opt) =>
                              onPickFromVendorList(
                                editingIdx,
                                opt ? opt.value : ""
                              )
                            }
                            placeholder={
                              vendorProductOptions.length === 0
                                ? t("No products in vendor price list")
                                : t("Select product")
                            }
                            menuPortalTarget={document.body}
                            styles={portalStyles}
                          />
                        );
                      }}
                    />
                    {isOutOfVendorList && (
                      <small className="text-warning d-flex align-items-center mt-50">
                        <AlertTriangle size={12} className="me-50" />
                        {t(
                          "This product isn't in the vendor's price list. Enter rate manually."
                        )}
                      </small>
                    )}
                    {errors?.lines?.[editingIdx]?.product_id && (
                      <small className="text-danger d-block">
                        {errors.lines[editingIdx].product_id.message}
                      </small>
                    )}
                  </Col>
                </Row>

                {/* HSN + UOM (UOM Select with integer-coercion) */}
                <Row>
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("HSN")}</Label>
                    <Controller
                      name={`lines.${editingIdx}.hsn_code`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          disabled={isLocked}
                          {...field}
                          value={field.value || ""}
                        />
                      )}
                    />
                  </Col>
                  <Col md="6" className="mb-2">
                    <Label className="form-label">{t("UOM")}</Label>
                    <Controller
                      name={`lines.${editingIdx}.unit`}
                      control={control}
                      render={({ field }) => (
                        <Select
                          classNamePrefix="select"
                          isClearable
                          isDisabled={isLocked}
                          options={PRODUCT_UOM_OPTIONS}
                          value={
                            PRODUCT_UOM_OPTIONS.find(
                              (o) => o.value === field.value
                            ) || null
                          }
                          onChange={(opt) => {
                            const newUnit = opt ? opt.value : "";
                            field.onChange(newUnit);
                            // Integer-UOM coercion — floor any decimal
                            // qty so the form passes validation.
                            if (
                              newUnit &&
                              UOM_INTEGER_ONLY.has(newUnit) &&
                              editingLine.qty &&
                              !Number.isInteger(num(editingLine.qty))
                            ) {
                              setValue(
                                `lines.${editingIdx}.qty`,
                                String(Math.floor(num(editingLine.qty)))
                              );
                            }
                          }}
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                          }}
                        />
                      )}
                    />
                  </Col>
                </Row>

                {/* Description */}
                <Row>
                  <Col md="12" className="mb-2">
                    <Label className="form-label">{t("Description")}</Label>
                    <Controller
                      name={`lines.${editingIdx}.description`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="textarea"
                          rows="2"
                          disabled={isLocked}
                          {...field}
                          value={field.value || ""}
                        />
                      )}
                    />
                  </Col>
                </Row>

                {/* Qty + Rate (inline validation) */}
                <Row>
                  <Col md="6" sm="6" className="mb-2">
                    <Label className="form-label">
                      {t("Qty")} <span className="text-danger">*</span>
                    </Label>
                    <Controller
                      name={`lines.${editingIdx}.qty`}
                      control={control}
                      render={({ field }) => {
                        const v = num(field.value);
                        const empty =
                          field.value === "" || field.value == null;
                        const lineStarted =
                          !!editingLine.product_id ||
                          !!editingLine.unit_price;
                        const showError = empty
                          ? lineStarted
                          : v <= 0 ||
                            (isIntegerUnit && !Number.isInteger(v));
                        return (
                          <Fragment>
                            <Input
                              type="number"
                              step={isIntegerUnit ? "1" : "0.0001"}
                              min={isIntegerUnit ? "1" : "0.0001"}
                              disabled={isLocked}
                              invalid={showError}
                              {...field}
                              value={field.value ?? ""}
                            />
                            {showError && (
                              <small className="text-danger d-block">
                                {empty
                                  ? t("Qty is required")
                                  : v <= 0
                                  ? t("Qty must be greater than 0")
                                  : t(
                                      "This unit ({{unit}}) does not allow decimals",
                                      { unit: editingLine.unit }
                                    )}
                              </small>
                            )}
                          </Fragment>
                        );
                      }}
                    />
                  </Col>

                  <Col md="6" sm="6" className="mb-2">
                    <Label className="form-label">
                      {t("Rate")} <span className="text-danger">*</span>
                    </Label>
                    <Controller
                      name={`lines.${editingIdx}.unit_price`}
                      control={control}
                      render={({ field }) => {
                        const p = num(field.value);
                        const empty =
                          field.value === "" || field.value == null;
                        const lineStarted =
                          !!editingLine.product_id || !!editingLine.qty;
                        const showError = empty ? lineStarted : p <= 0;
                        return (
                          <Fragment>
                            <Input
                              type="number"
                              step="0.0001"
                              min="0"
                              disabled={isLocked}
                              invalid={showError}
                              {...field}
                              value={field.value ?? ""}
                            />
                            {showError && (
                              <small className="text-danger d-block">
                                {empty
                                  ? t("Rate is required")
                                  : t("Rate must be greater than 0")}
                              </small>
                            )}
                            {!showError &&
                              listPriceForEditing != null &&
                              num(editingLine?.unit_price) !==
                                listPriceForEditing && (
                                <small className="text-muted">
                                  {t("List price")}: {sym}
                                  {fmt(listPriceForEditing)}
                                </small>
                              )}
                          </Fragment>
                        );
                      }}
                    />
                  </Col>
                </Row>

                {/* Disc % + GST % */}
                <Row>
                  <Col md="6" sm="6" className="mb-2">
                    <Label className="form-label">{t("Discount %")}</Label>
                    <Controller
                      name={`lines.${editingIdx}.discount_pct`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={isLocked}
                          {...field}
                          value={field.value ?? ""}
                        />
                      )}
                    />
                  </Col>
                  <Col md="6" sm="6" className="mb-2">
                    <Label className="form-label">{t("GST %")}</Label>
                    <Controller
                      name={`lines.${editingIdx}.tax_pct`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={isLocked}
                          {...field}
                          value={field.value ?? ""}
                        />
                      )}
                    />
                  </Col>
                </Row>

                {/* Costing breakdown — mirrors Quotation's modal layout
                    (vertical list, label left / value right). Same math
                    as the BE recompute. PO is INR-only so no converted-
                    currency row. */}
                <hr className="my-2" />
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
                            ({t("Qty")} × {t("Rate")})
                          </small>
                        </span>
                        <span>
                          {sym} {fmt(editingCosting.gross)}
                        </span>
                      </li>
                      {editingCosting.discount_amount > 0 && (
                        <li className="d-flex justify-content-between py-25">
                          <span className="text-muted">
                            − {t("Discount")} (
                            {num(editingLine.discount_pct) || 0}%)
                          </span>
                          <span>
                            {sym} {fmt(editingCosting.discount_amount)}
                          </span>
                        </li>
                      )}
                      <li className="d-flex justify-content-between py-25">
                        <span className="text-muted">= {t("Taxable")}</span>
                        <span>
                          {sym} {fmt(editingCosting.taxable)}
                        </span>
                      </li>
                      {intraState ? (
                        <Fragment>
                          <li className="d-flex justify-content-between py-25">
                            <span className="text-muted">
                              + {t("CGST")} (
                              {round2(num(editingLine.tax_pct) / 2)}%)
                            </span>
                            <span>
                              {sym} {fmt(editingCosting.cgst)}
                            </span>
                          </li>
                          <li className="d-flex justify-content-between py-25">
                            <span className="text-muted">
                              + {t("SGST")} (
                              {round2(num(editingLine.tax_pct) / 2)}%)
                            </span>
                            <span>
                              {sym} {fmt(editingCosting.sgst)}
                            </span>
                          </li>
                        </Fragment>
                      ) : (
                        <li className="d-flex justify-content-between py-25">
                          <span className="text-muted">
                            + {t("IGST")} ({num(editingLine.tax_pct) || 0}%)
                          </span>
                          <span>
                            {sym} {fmt(editingCosting.igst)}
                          </span>
                        </li>
                      )}
                      <li className="d-flex justify-content-between pt-50 mt-25 border-top fw-bold">
                        <span>{t("Line Total")}</span>
                        <span>
                          {sym} {fmt(editingCosting.line_total)}
                        </span>
                      </li>
                    </ul>
                  </Col>
                </Row>
              </Fragment>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" outline onClick={closeModal}>
              {t("Cancel")}
            </Button>
            <Button color="primary" onClick={closeModal}>
              {t("Save")}
            </Button>
          </ModalFooter>
        </Modal>
      </CardBody>
    </Card>
  );
};

export default PoLineItems;
