// ── Step 2: Line Items (PO) ─────────────────────────────────────────
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import {
  Row,
  Col,
  Label,
  Input,
  Button,
  Table,
  FormFeedback,
} from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import { Trash2, PlusCircle } from "react-feather";

import { initPurchaseOrderLineItem } from "@constant/reduxConstant";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);
const round2 = (n) =>
  !isFinite(n) ? 0 : Math.round((n + Number.EPSILON) * 100) / 100;

// Mirror the backend tax engine for live preview.
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
    taxable: round2(taxable),
    cgst,
    sgst,
    igst,
    total_tax: round2(tax_amount),
    line_total: round2(taxable + tax_amount),
  };
}

const Step2Items = ({
  isLocked,
  vendorProductOptions,
  productById,
  priceByProduct,
  intraState,
}) => {
  const { t } = useTranslation();
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const watchedLines = useWatch({ control, name: "lines" }) || [];

  const onProductChange = (idx, productId) => {
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

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>
          <h5 className="mb-0">{t("Line Items")}</h5>
          <small className="text-muted">
            {intraState
              ? t("Intra-state vendor → CGST + SGST split")
              : t("Inter-state vendor → IGST")}
          </small>
        </div>
        <Button
          color="primary"
          size="sm"
          disabled={isLocked}
          onClick={() => append({ ...initPurchaseOrderLineItem })}
        >
          <PlusCircle size={14} /> {t("Add Line")}
        </Button>
      </div>

      {errors.lines && typeof errors.lines.message === "string" && (
        <div className="text-danger small mb-2">{errors.lines.message}</div>
      )}

      <div className="table-responsive">
        <Table bordered size="sm" className="align-middle">
          <thead>
            <tr>
              <th style={{ minWidth: 260 }}>{t("Product")}</th>
              <th style={{ width: 90 }}>{t("HSN")}</th>
              <th style={{ width: 90 }}>{t("Qty")}</th>
              <th style={{ width: 70 }}>{t("Unit")}</th>
              <th style={{ width: 110 }}>{t("Rate")}</th>
              <th style={{ width: 80 }}>{t("Disc%")}</th>
              <th style={{ width: 80 }}>{t("GST%")}</th>
              <th style={{ width: 100 }} className="text-end">
                {t("Taxable")}
              </th>
              <th style={{ width: 100 }} className="text-end">
                {t("Tax")}
              </th>
              <th style={{ width: 110 }} className="text-end">
                {t("Total")}
              </th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {fields.length === 0 && (
              <tr>
                <td colSpan="11" className="text-center text-muted py-3">
                  {t("No line items. Click 'Add Line' to start.")}
                </td>
              </tr>
            )}
            {fields.map((f, idx) => {
              const ln = watchedLines[idx] || {};
              const live = computeLine({
                qty: ln.qty,
                unit_price: ln.unit_price,
                discount_pct: ln.discount_pct,
                tax_pct: ln.tax_pct,
                intraState,
              });
              const errLine = errors?.lines?.[idx] || {};
              return (
                <tr key={f.id}>
                  <td>
                    <Controller
                      name={`lines.${idx}.product_id`}
                      control={control}
                      render={({ field }) => (
                        <Select
                          classNamePrefix="select"
                          isDisabled={isLocked}
                          options={vendorProductOptions}
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                          }}
                          value={
                            vendorProductOptions.find(
                              (o) => o.value === field.value
                            ) || null
                          }
                          onChange={(opt) =>
                            onProductChange(idx, opt ? opt.value : "")
                          }
                          placeholder={
                            vendorProductOptions.length === 0
                              ? t("No products in vendor price list")
                              : t("Select product")
                          }
                        />
                      )}
                    />
                    {errLine.product_id && (
                      <small className="text-danger">
                        {errLine.product_id.message}
                      </small>
                    )}
                  </td>
                  <td>
                    <Controller
                      name={`lines.${idx}.hsn_code`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          bsSize="sm"
                          disabled={isLocked}
                          {...field}
                          value={field.value || ""}
                        />
                      )}
                    />
                  </td>
                  <td>
                    <Controller
                      name={`lines.${idx}.qty`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.0001"
                          bsSize="sm"
                          disabled={isLocked}
                          invalid={!!errLine.qty}
                          {...field}
                          value={field.value ?? ""}
                        />
                      )}
                    />
                  </td>
                  <td>
                    <Controller
                      name={`lines.${idx}.unit`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          bsSize="sm"
                          disabled={isLocked}
                          {...field}
                          value={field.value || ""}
                        />
                      )}
                    />
                  </td>
                  <td>
                    <Controller
                      name={`lines.${idx}.unit_price`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.0001"
                          bsSize="sm"
                          disabled={isLocked}
                          invalid={!!errLine.unit_price}
                          {...field}
                          value={field.value ?? ""}
                        />
                      )}
                    />
                  </td>
                  <td>
                    <Controller
                      name={`lines.${idx}.discount_pct`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.01"
                          bsSize="sm"
                          disabled={isLocked}
                          {...field}
                          value={field.value ?? ""}
                        />
                      )}
                    />
                  </td>
                  <td>
                    <Controller
                      name={`lines.${idx}.tax_pct`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.01"
                          bsSize="sm"
                          disabled={isLocked}
                          {...field}
                          value={field.value ?? ""}
                        />
                      )}
                    />
                  </td>
                  <td className="text-end">{live.taxable.toLocaleString()}</td>
                  <td className="text-end">
                    {live.total_tax.toLocaleString()}
                    {intraState ? (
                      <div className="small text-muted">
                        C {live.cgst} / S {live.sgst}
                      </div>
                    ) : (
                      <div className="small text-muted">IGST {live.igst}</div>
                    )}
                  </td>
                  <td className="text-end fw-bold">
                    {live.line_total.toLocaleString()}
                  </td>
                  <td className="text-center">
                    {!isLocked && (
                      <Trash2
                        size={16}
                        className="cursor-pointer text-danger"
                        onClick={() => remove(idx)}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </>
  );
};

export default Step2Items;
