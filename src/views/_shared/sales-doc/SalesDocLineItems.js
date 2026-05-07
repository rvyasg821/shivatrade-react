import { Fragment, useState, useEffect } from "react";
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
import { Plus, Trash2, Edit } from "react-feather";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { PRODUCT_UOM_OPTIONS, UOM_INTEGER_ONLY } from "@constant/options";
import { num, fmt, formatVendorOption } from "./_helpers";

/**
 * Line items section — compact summary table with Add / Edit / Delete actions.
 * Editing happens in a Modal that hosts the full input layout (Product, Vendor,
 * Qty, Unit, Price, Disc%, Tax%, Description). Modal edits go live to the
 * underlying field-array row; closing a freshly-added empty row auto-removes it.
 *
 * Shared across Quotation / PFI / PO. Pass:
 *   - control, setValue from parent useForm
 *   - productOptions: full list (already filtered by header-level category, if any)
 *   - allProductOptions: unfiltered list — used when the per-line Category
 *     override is set so the line-level filter can re-narrow from scratch
 *   - categoryOptions, defaultCategoryIds: optional per-line Category select
 *   - initLineItem (module-specific empty row shape)
 */
const SalesDocLineItems = ({
  control,
  setValue,
  productOptions,
  allProductOptions,
  categoryOptions,
  allCategoryOptions,
  defaultCategoryIds,
  initLineItem,
  readOnly = false,
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
  // Per-line category override — keyed by line index. Defaults to the header
  // filter at modal-open time; user can change it inside the modal to narrow
  // (or expand) the Product dropdown for THAT line only.
  const [lineCategoryByIdx, setLineCategoryByIdx] = useState({});
  // When true for the modal currently open, the Category dropdown shows
  // ALL categories (not just lead's interested set). Per-modal-open state.
  const [modalShowAllCats, setModalShowAllCats] = useState(false);

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
        `${API_ENDPOINTS.priceList.byProduct}/${productId}`
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
    }
    setValue(`lines.${idx}.vendor_id`, "");

    const rows = await fetchVendorPrices(idx, opt?.value);
    if (rows.length) {
      const first = rows[0];
      setValue(`lines.${idx}.vendor_id`, first.vendor_id || "");
      setValue(`lines.${idx}.unit_price`, String(first.unit_price ?? ""));
      if (first.tax_pct !== undefined && first.tax_pct !== null) {
        setValue(`lines.${idx}.tax_pct`, String(first.tax_pct));
      }
    }
  };

  const onPickVendor = (idx, opt) => {
    setValue(`lines.${idx}.vendor_id`, opt?.value || "");
    if (opt?.raw) {
      setValue(`lines.${idx}.unit_price`, String(opt.raw.unit_price ?? ""));
      if (opt.raw.tax_pct !== undefined && opt.raw.tax_pct !== null) {
        setValue(`lines.${idx}.tax_pct`, String(opt.raw.tax_pct));
      }
    }
  };

  const openAdd = () => {
    lineFA.append({ ...initLineItem });
    const newIdx = lineFA.fields.length;
    // Seed the per-line category override from the header default.
    setLineCategoryByIdx((m) => ({
      ...m,
      [newIdx]: defaultCategoryIds || [],
    }));
    setModal({ open: true, idx: newIdx, isNew: true });
  };

  const openEdit = (idx) => {
    // For edits, default the category override to the header filter only if
    // the line doesn't already have one set.
    setLineCategoryByIdx((m) =>
      m[idx] !== undefined ? m : { ...m, [idx]: defaultCategoryIds || [] }
    );
    setModal({ open: true, idx, isNew: false });
  };

  const closeModal = () => {
    const { idx, isNew } = modal;
    if (isNew && idx !== null) {
      const row = liveLines[idx];
      if (!row?.product_id) {
        // Empty add — drop the row.
        lineFA.remove(idx);
        setVendorOptionsByLine((m) => {
          const next = { ...m };
          delete next[idx];
          return next;
        });
      }
    }
    setModal({ open: false, idx: null, isNew: false });
    setModalShowAllCats(false);
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
  const editingLineTotal =
    num(editingLine.qty) *
    num(editingLine.unit_price) *
    (1 - num(editingLine.discount_pct) / 100);

  // Per-line category filter for the Product dropdown inside the modal.
  // If a per-line override exists, narrow from `allProductOptions` (the
  // unfiltered list) so the user can ALSO pick categories outside the
  // header's filter. If no override, use the parent-filtered productOptions.
  const editingCategoryIds =
    editingIdx != null
      ? lineCategoryByIdx[editingIdx] ?? defaultCategoryIds ?? []
      : [];
  const sourceList =
    editingCategoryIds && editingCategoryIds.length
      ? allProductOptions || productOptions
      : productOptions;
  const modalProductOptions =
    editingCategoryIds && editingCategoryIds.length
      ? (sourceList || []).filter((o) =>
          editingCategoryIds.includes(o.raw?.category_id)
        )
      : sourceList || [];

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

        {lineFA.fields.length === 0 ? (
          <div className="border rounded p-3 text-center text-muted">
            {t('No line items yet — click "Add Line".')}
          </div>
        ) : (
          <Table responsive bordered className="mb-0 align-middle">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>{t("Product")}</th>
                <th>{t("Vendor")}</th>
                <th className="text-end">{t("Qty")}</th>
                <th>{t("Unit")}</th>
                <th className="text-end">{t("Unit Price")}</th>
                <th className="text-end">{t("Disc %")}</th>
                <th className="text-end">{t("Tax %")}</th>
                <th className="text-end">{t("Line Total")}</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {lineFA.fields.map((field, idx) => {
                const l = liveLines[idx] || {};
                const lineNet =
                  num(l.qty) *
                  num(l.unit_price) *
                  (1 - num(l.discount_pct) / 100);
                const lineTotal = lineNet;
                const productLabel =
                  productOptions.find((o) => o.value === l.product_id)
                    ?.label || (l.product_id ? "—" : t("(not set)"));
                const vendorOpts = vendorOptionsByLine[idx] || [];
                const vendorLabel =
                  vendorOpts.find((o) => o.value === l.vendor_id)?.label
                    ?.split(" — ")[0] || "—";
                // Pull product-master rebates/expenses for this line so we
                // can render chips with computed amounts under the row.
                const pickedProduct = (allProductOptions || productOptions).find(
                  (o) => o.value === l.product_id
                )?.raw;
                const lineRebates = pickedProduct?.product_rebates || [];
                const lineExpenses = pickedProduct?.product_expenses || [];
                const hasChips = lineRebates.length || lineExpenses.length;
                return (
                  <Fragment key={field.id}>
                  <tr>
                    <td className="text-muted">{idx + 1}</td>
                    <td>{productLabel}</td>
                    <td>{vendorLabel}</td>
                    <td className="text-end">{l.qty || "—"}</td>
                    <td>{l.unit || "—"}</td>
                    <td className="text-end">
                      {l.unit_price ? fmt(l.unit_price) : "—"}
                    </td>
                    <td className="text-end">{num(l.discount_pct) || 0}</td>
                    <td className="text-end">{num(l.tax_pct) || 0}</td>
                    <td className="text-end fw-bold">{fmt(lineTotal)}</td>
                    <td>
                      <div className="d-flex justify-content-center align-items-center" style={{ gap: "2px" }}>
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
                      <td colSpan={9} className="py-1">
                        <small className="text-muted me-2">
                          {t("Auto-applied:")}
                        </small>
                        {lineRebates.map((r) => {
                          const amt = (lineNet * num(r.pct)) / 100;
                          return (
                            <span
                              key={`r-${idx}-${r.rebate_id}`}
                              className="badge bg-success text-white me-1"
                            >
                              {r.code || r.name} {num(r.pct)}% ={" "}
                              {fmt(amt)}
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
                              {e.type === "percent"
                                ? `${num(e.value)}%`
                                : ""}{" "}
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
      <Modal isOpen={modal.open} toggle={closeModal} size="lg" backdrop="static">
        <ModalHeader toggle={closeModal}>
          {modal.isNew
            ? t("Add Line Item")
            : `${t("Edit Line")} #${(editingIdx ?? 0) + 1}`}
        </ModalHeader>
        <ModalBody>
          {editingIdx != null && (
            <>
              {((allCategoryOptions || categoryOptions) || []).length > 0 && (
                <Row>
                  <Col md="12" className="mb-2">
                    <Label className="form-label d-flex justify-content-between align-items-center">
                      <span>
                        {t("Category")}{" "}
                        <small className="text-muted">
                          {t("(narrows the Product dropdown for this line)")}
                        </small>
                      </span>
                      {allCategoryOptions &&
                        categoryOptions &&
                        allCategoryOptions.length > categoryOptions.length && (
                          <small>
                            <a
                              href="#"
                              className="text-decoration-none"
                              onClick={(e) => {
                                e.preventDefault();
                                setModalShowAllCats((s) => !s);
                              }}
                            >
                              {modalShowAllCats
                                ? t("Show lead categories only")
                                : t("Show all categories")}
                            </a>
                          </small>
                        )}
                    </Label>
                    {(() => {
                      const opts =
                        modalShowAllCats && allCategoryOptions
                          ? allCategoryOptions
                          : categoryOptions;
                      return (
                    <Select
                      classNamePrefix="select"
                      isMulti
                      isClearable
                      options={opts}
                      value={(allCategoryOptions || opts).filter((o) =>
                        (editingCategoryIds || []).includes(o.value)
                      )}
                      onChange={(opts) => {
                        const next = (opts || []).map((o) => o.value);
                        setLineCategoryByIdx((m) => ({
                          ...m,
                          [editingIdx]: next,
                        }));
                        // Clear product if it no longer matches the new
                        // category set, to avoid orphan selections.
                        const pid = editingLine.product_id;
                        if (pid) {
                          const pool = next.length
                            ? (allProductOptions || productOptions || []).filter(
                                (o) => next.includes(o.raw?.category_id)
                              )
                            : productOptions || [];
                          if (!pool.find((o) => o.value === pid)) {
                            setValue(`lines.${editingIdx}.product_id`, "");
                          }
                        }
                      }}
                      placeholder={t("All categories (using header filter)")}
                      menuPortalTarget={document.body}
                      styles={{
                        menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                      }}
                    />
                      );
                    })()}
                  </Col>
                </Row>
              )}
              <Row>
                <Col md="6" className="mb-2">
                  <Label className="form-label">
                    {t("Product")} <span className="text-danger">*</span>
                  </Label>
                  <Controller
                    name={`lines.${editingIdx}.product_id`}
                    control={control}
                    render={({ field: f }) => (
                      <Select
                        classNamePrefix="select"
                        options={modalProductOptions}
                        value={
                          // Look up in the unfiltered list so the saved
                          // product still renders even if the active filter
                          // would hide it.
                          (allProductOptions || productOptions).find(
                            (o) => o.value === f.value
                          ) || null
                        }
                        onChange={(opt) => onPickProduct(editingIdx, opt)}
                      />
                    )}
                  />
                  {(() => {
                    const picked = (allProductOptions || productOptions).find(
                      (o) => o.value === editingLine.product_id
                    );
                    const rebates = picked?.raw?.product_rebates || [];
                    const expenses = picked?.raw?.product_expenses || [];
                    if (!rebates.length && !expenses.length) return null;
                    return (
                      <small className="text-muted d-block mt-1">
                        {t("Auto-applied from product:")}{" "}
                        {rebates.map((r) => (
                          <span
                            key={`r-${r.rebate_id}`}
                            className="badge bg-success text-white me-1"
                          >
                            {r.code || r.name} {num(r.pct)}%
                          </span>
                        ))}
                        {expenses.map((e) => (
                          <span
                            key={`e-${e.expense_id}`}
                            className="badge bg-warning text-dark me-1"
                          >
                            {e.code || e.name}{" "}
                            {e.type === "percent"
                              ? `${num(e.value)}%`
                              : fmt(num(e.value))}
                          </span>
                        ))}
                      </small>
                    );
                  })()}
                </Col>
                <Col md="6" className="mb-2">
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
                      const showError =
                        f.value === "" || f.value == null
                          ? false
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
                              {v <= 0
                                ? t("Qty must be greater than 0")
                                : t(
                                    "This unit ({{unit}}) does not allow decimals",
                                    { unit: editingLine.unit }
                                  )}
                            </small>
                          )}
                        </>
                      );
                    }}
                  />
                </Col>
                <Col md="4" sm="6" className="mb-2">
                  <Label className="form-label">{t("Unit")}</Label>
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
                            (o) => o.value === f.value
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
                              String(Math.floor(num(editingLine.qty)))
                            );
                          }
                        }}
                      />
                    )}
                  />
                </Col>
                <Col md="4" sm="6" className="mb-2">
                  <Label className="form-label">{t("Unit Price")}</Label>
                  <Controller
                    name={`lines.${editingIdx}.unit_price`}
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
                  <Label className="form-label">{t("Tax %")}</Label>
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
                  <Label className="form-label">{t("Line Total")}</Label>
                  <div
                    className="form-control bg-light fw-bold text-end"
                    style={{ pointerEvents: "none" }}
                  >
                    {fmt(editingLineTotal)}
                  </div>
                </Col>
              </Row>
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
                          "Optional — overrides product description on the quote"
                        )}
                      />
                    )}
                  />
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
              hasAnyData &&
              (q <= 0 || (isInt && !Number.isInteger(q)));
            const priceInvalid = hasAnyData && p <= 0;
            const productMissing = hasAnyData && !editingLine.product_id;
            const blocked = qtyInvalid || priceInvalid || productMissing;
            return (
              <>
                {blocked && (
                  <small className="text-danger me-auto">
                    {productMissing
                      ? t("Pick a product")
                      : qtyInvalid
                      ? t("Enter a valid qty")
                      : t("Enter a valid unit price")}
                  </small>
                )}
                <Button
                  color="primary"
                  onClick={closeModal}
                  disabled={blocked}
                >
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
