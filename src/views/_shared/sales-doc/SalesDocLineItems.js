import { useState, useEffect } from "react";
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
import { PRODUCT_UOM_OPTIONS } from "@constant/options";
import { num, fmt, formatVendorOption } from "./_helpers";

/**
 * Line items section — compact summary table with Add / Edit / Delete actions.
 * Editing happens in a Modal that hosts the full input layout (Product, Vendor,
 * Qty, Unit, Price, Disc%, Tax%, Description). Modal edits go live to the
 * underlying field-array row; closing a freshly-added empty row auto-removes it.
 *
 * Shared across Quotation / PFI / PO. Pass:
 *   - control, setValue from parent useForm
 *   - productOptions (with raw product data for auto-fill)
 *   - initLineItem (module-specific empty row shape)
 */
const SalesDocLineItems = ({
  control,
  setValue,
  productOptions,
  initLineItem,
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
    setModal({ open: true, idx: newIdx, isNew: true });
  };

  const openEdit = (idx) => {
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
          <Button size="sm" color="primary" type="button" onClick={openAdd}>
            <Plus size={14} /> {t("Add Line")}
          </Button>
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
                const lineTotal =
                  num(l.qty) *
                  num(l.unit_price) *
                  (1 - num(l.discount_pct) / 100);
                const productLabel =
                  productOptions.find((o) => o.value === l.product_id)
                    ?.label || (l.product_id ? "—" : t("(not set)"));
                const vendorOpts = vendorOptionsByLine[idx] || [];
                const vendorLabel =
                  vendorOpts.find((o) => o.value === l.vendor_id)?.label
                    ?.split(" — ")[0] || "—";
                return (
                  <tr key={field.id}>
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
                  </tr>
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
                        options={productOptions}
                        value={
                          productOptions.find((o) => o.value === f.value) ||
                          null
                        }
                        onChange={(opt) => onPickProduct(editingIdx, opt)}
                      />
                    )}
                  />
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
                  <Label className="form-label">{t("Qty")}</Label>
                  <Controller
                    name={`lines.${editingIdx}.qty`}
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
                        onChange={(opt) => f.onChange(opt ? opt.value : "")}
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
          <Button color="primary" onClick={closeModal}>
            {t("Done")}
          </Button>
        </ModalFooter>
      </Modal>
    </Card>
  );
};

export default SalesDocLineItems;
