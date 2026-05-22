// ── Step 3: Review & Save (PO) ──────────────────────────────────────
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Row, Col, Label, Input, Table } from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";

import { PURCHASE_ORDER_STATUS_OPTIONS } from "@constant/options";
import { getCurrencySymbol } from "@src/utility/currency";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);
const round2 = (n) =>
  !isFinite(n) ? 0 : Math.round((n + Number.EPSILON) * 100) / 100;

function computeLine({ qty, unit_price, discount_pct, tax_pct, intraState }) {
  const q = num(qty);
  const p = num(unit_price);
  const d = num(discount_pct);
  const tp = num(tax_pct);
  const gross = q * p;
  const taxable = gross - (gross * d) / 100;
  const tax_amount = (taxable * tp) / 100;
  return {
    taxable: round2(taxable),
    cgst: intraState ? round2(tax_amount / 2) : 0,
    sgst: intraState ? round2(tax_amount / 2) : 0,
    igst: intraState ? 0 : round2(tax_amount),
    total_tax: round2(tax_amount),
  };
}

const Step3Review = ({ isLocked, intraState }) => {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const lines = useWatch({ control, name: "lines" }) || [];
  const currencyCode = useWatch({ control, name: "currency_code" }) || "INR";
  const exchangeRate = useWatch({ control, name: "exchange_rate" });
  const sym = getCurrencySymbol(currencyCode);
  const rate = Number(exchangeRate) || 1;
  const toCcy = (v) => num(v) * rate;
  const fmt2 = (v) =>
    toCcy(v).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  let subtotal = 0;
  let cgst_total = 0;
  let sgst_total = 0;
  let igst_total = 0;
  for (const l of lines) {
    const r = computeLine({ ...l, intraState });
    subtotal += r.taxable;
    cgst_total += r.cgst;
    sgst_total += r.sgst;
    igst_total += r.igst;
  }
  const tax_total = cgst_total + sgst_total + igst_total;
  const grand_raw = subtotal + tax_total;
  const grand = Math.round(grand_raw);
  const round_off = round2(grand - grand_raw);

  return (
    <Row>
      <Col md="8">
        <h5>{t("Notes")}</h5>
        <div className="mb-2">
          <Label className="form-label">{t("Notes to Vendor")}</Label>
          <Controller
            name="notes_to_vendor"
            control={control}
            render={({ field }) => (
              <Input
                type="textarea"
                rows="3"
                placeholder={t("Visible on the PO PDF.")}
                disabled={isLocked}
                {...field}
                value={field.value || ""}
              />
            )}
          />
        </div>
        <div className="mb-2">
          <Label className="form-label">{t("Internal Notes")}</Label>
          <Controller
            name="internal_notes"
            control={control}
            render={({ field }) => (
              <Input
                type="textarea"
                rows="3"
                placeholder={t("Hidden from PDF. Editable even when status is locked.")}
                {...field}
                value={field.value || ""}
              />
            )}
          />
        </div>

        <div className="mb-2" style={{ maxWidth: 280 }}>
          <Label className="form-label">{t("Status")}</Label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                classNamePrefix="select"
                options={PURCHASE_ORDER_STATUS_OPTIONS}
                value={
                  PURCHASE_ORDER_STATUS_OPTIONS.find(
                    (o) => o.value === field.value
                  ) || PURCHASE_ORDER_STATUS_OPTIONS[0]
                }
                onChange={(opt) => field.onChange(opt ? opt.value : "draft")}
              />
            )}
          />
        </div>
      </Col>

      <Col md="4">
        <h5>{t("Totals")}</h5>
        <Table borderless size="sm" className="mb-0">
          <tbody>
            <tr>
              <td>{t("Subtotal")}</td>
              <td className="text-end">{sym} {fmt2(subtotal)}</td>
            </tr>
            {intraState ? (
              <>
                <tr>
                  <td>{t("CGST")}</td>
                  <td className="text-end">{sym} {fmt2(cgst_total)}</td>
                </tr>
                <tr>
                  <td>{t("SGST")}</td>
                  <td className="text-end">{sym} {fmt2(sgst_total)}</td>
                </tr>
              </>
            ) : (
              <tr>
                <td>{t("IGST")}</td>
                <td className="text-end">{sym} {fmt2(igst_total)}</td>
              </tr>
            )}
            <tr>
              <td>{t("Round-off")}</td>
              <td className="text-end">{sym} {fmt2(round_off)}</td>
            </tr>
            <tr className="border-top">
              <td className="fw-bold">{t("Grand Total")}</td>
              <td className="text-end fw-bold">{sym} {fmt2(grand)}</td>
            </tr>
          </tbody>
        </Table>
        <small className="text-muted">
          {intraState
            ? t("Intra-state vendor (same as company state).")
            : t("Inter-state vendor.")}
        </small>
      </Col>
    </Row>
  );
};

export default Step3Review;
