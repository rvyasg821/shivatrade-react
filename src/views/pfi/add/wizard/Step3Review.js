// ── Step 3: Review & Save (PFI) ──────────────────────────────────────
import { Fragment } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Row, Col, Label, Input, FormFeedback, Table } from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";

import { QUOTATION_STATUS_OPTIONS } from "@constant/options";
import SalesDocCostingCard from "@src/views/_shared/sales-doc/SalesDocCostingCard";

const fmt = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const Step3Review = ({
  totals,
  selectedCurrencyCode,
  customerOptions,
  customerAddressOptions,
  currencyOptions,
  productById,
}) => {
  const { t } = useTranslation();
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext();

  const v = watch();
  const customer =
    customerOptions.find((o) => o.value === v.customer_id)?.label || "—";
  const billTo =
    customerAddressOptions.find((o) => o.value === v.customer_address_id)
      ?.label || "—";
  const currency =
    currencyOptions.find((o) => o.value === v.currency_id)?.label || "—";
  const lines = v.lines || [];

  return (
    <Row>
      <Col md="8">
        <h5 className="mb-2">{t("Customer & Reference")}</h5>
        <Table size="sm" borderless className="mb-3">
          <tbody>
            <tr>
              <td className="text-muted" style={{ width: 180 }}>
                {t("Customer")}
              </td>
              <td>{customer}</td>
            </tr>
            <tr>
              <td className="text-muted">{t("Bill-to")}</td>
              <td>{billTo}</td>
            </tr>
            <tr>
              <td className="text-muted">{t("Currency")}</td>
              <td>
                {currency} (rate: {v.exchange_rate || "1"})
              </td>
            </tr>
            <tr>
              <td className="text-muted">{t("PFI Date")}</td>
              <td>
                {v.pfi_date} → {v.valid_until || "—"}
              </td>
            </tr>
            <tr>
              <td className="text-muted">{t("Payment / Delivery")}</td>
              <td>
                {v.payment_terms || "—"} / {v.delivery_terms || "—"}
                {v.delivery_location ? ` · ${v.delivery_location}` : ""}
              </td>
            </tr>
          </tbody>
        </Table>

        <h5 className="mb-2">
          {t("Line Items")}{" "}
          <small className="text-muted">({lines.length})</small>
        </h5>
        <Table size="sm" bordered responsive className="mb-3">
          <thead className="table-light">
            <tr>
              <th>#</th>
              <th>{t("Product")}</th>
              <th className="text-end">{t("Qty")}</th>
              <th className="text-end">{t("Unit Price")}</th>
              <th className="text-end">{t("Disc%")}</th>
              <th className="text-end">{t("Tax%")}</th>
              <th className="text-end">{t("Margin%")}</th>
              <th className="text-end">{t("Line Net")}</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted py-3">
                  {t("No line items.")}
                </td>
              </tr>
            ) : (
              lines.map((l, i) => {
                const p = productById.get(l.product_id);
                const qty = Number(l.qty || 0);
                const price = Number(l.unit_price || 0);
                const disc = Number(l.discount_pct || 0);
                const lineNet = qty * price * (1 - disc / 100);
                const lineRebates = l.product_rebates_snapshot || [];
                const lineExpenses = l.product_expenses_snapshot || [];
                const hasChips = lineRebates.length || lineExpenses.length;
                return (
                  <Fragment key={i}>
                    <tr>
                      <td>{i + 1}</td>
                      <td>{p ? `${p.code || ""} ${p.name || ""}` : "—"}</td>
                      <td className="text-end">{qty}</td>
                      <td className="text-end">{fmt(price)}</td>
                      <td className="text-end">{disc}</td>
                      <td className="text-end">{l.tax_pct || 0}</td>
                      <td className="text-end">{l.margin_pct || 0}</td>
                      <td className="text-end fw-bold">{fmt(lineNet)}</td>
                    </tr>
                    {hasChips && (
                      <tr className="bg-light">
                        <td></td>
                        <td colSpan={7} className="py-1">
                          <small className="text-muted me-2">
                            {t("Auto-applied:")}
                          </small>
                          {lineRebates.map((r, ri) => {
                            const amt =
                              (lineNet * Number(r.pct || 0)) / 100;
                            return (
                              <span
                                key={`r-${i}-${ri}`}
                                className="badge bg-success text-white me-1"
                              >
                                {r.code || r.name} {Number(r.pct || 0)}% ={" "}
                                {fmt(amt)}
                              </span>
                            );
                          })}
                          {lineExpenses.map((e, ei) => {
                            const amt =
                              e.type === "percent"
                                ? (lineNet * Number(e.value || 0)) / 100
                                : Number(e.value || 0);
                            return (
                              <span
                                key={`e-${i}-${ei}`}
                                className="badge bg-warning text-dark me-1"
                              >
                                {e.code || e.name}{" "}
                                {e.type === "percent"
                                  ? `${Number(e.value || 0)}%`
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
              })
            )}
          </tbody>
        </Table>

        <Row>
          <Col md="6" className="mb-2">
            <Label className="form-label">{t("Notes to Client")}</Label>
            <Controller
              name="notes_to_client"
              control={control}
              render={({ field }) => (
                <Input
                  type="textarea"
                  rows="3"
                  {...field}
                  value={field.value || ""}
                />
              )}
            />
          </Col>
          <Col md="6" className="mb-2">
            <Label className="form-label">{t("Internal Notes")}</Label>
            <Controller
              name="internal_notes"
              control={control}
              render={({ field }) => (
                <Input
                  type="textarea"
                  rows="3"
                  {...field}
                  value={field.value || ""}
                />
              )}
            />
          </Col>
        </Row>

        <Row>
          <Col md="6" className="mb-2">
            <Label className="form-label">{t("Status")}</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select
                  classNamePrefix="select"
                  options={QUOTATION_STATUS_OPTIONS}
                  value={
                    QUOTATION_STATUS_OPTIONS.find(
                      (o) => o.value === field.value
                    ) || null
                  }
                  onChange={(opt) =>
                    field.onChange(opt ? opt.value : "draft")
                  }
                />
              )}
            />
            {errors.status && (
              <FormFeedback className="d-block">
                {errors.status.message}
              </FormFeedback>
            )}
          </Col>
        </Row>
      </Col>

      <Col md="4">
        <SalesDocCostingCard
          totals={totals}
          currencyCode={selectedCurrencyCode}
        />
      </Col>
    </Row>
  );
};

export default Step3Review;
