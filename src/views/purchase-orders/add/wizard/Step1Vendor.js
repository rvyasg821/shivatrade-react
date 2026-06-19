// ── Step 1: Customer & Reference (PO) ───────────────────────────────
// PO is multi-vendor at line level — vendor selection happens in Step 2
// per line. This step only collects customer + dates + delivery + terms.

import { Controller, useFormContext } from "react-hook-form";
import { Row, Col, Label, Input, FormFeedback } from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "react-feather";

import { useEffect, useRef, useState } from "react";
import { appsRoot } from "@constant/defaultValues";
import { PFI_RETIRED } from "@src/configs/appMode";
import { VENDOR_PAYMENT_TERMS_OPTIONS, VENDOR_INCOTERMS_OPTIONS } from "@constant/options";
import DateInput from "@components/date-input";
import { getCurrencySymbol } from "@src/utility/currency";

const required = <span className="text-danger">*</span>;

const Step1Vendor = ({
  isLocked,
  customerOptions = [],
  customerAddressOptions = [],
  consigneeAddressOptions = [],
  currencyOptions = [],
  rateMeta,
  sourcePfiVoucher,
  sourcePfiId,
  sourceQuotationVoucher,
  sourceQuotationId,
}) => {
  const { t } = useTranslation();
  const {
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();
  const watchedRate = watch("exchange_rate");
  const sameAsBuyer = watch("consignee_same_as_buyer") !== false;

  // Exchange Rate field shows the intuitive inverse — ₹ per 1 foreign unit
  // (e.g. 83.33) — while the form still STORES "foreign per ₹1" (system
  // convention, e.g. 0.012). Local input state, seeded from the stored value
  // while unfocused; store 1/X on edit. (Same as the quotation Step 1.)
  const sameCurrency = !!rateMeta?.same;
  const [rateDisplay, setRateDisplay] = useState("");
  const rateFocused = useRef(false);
  useEffect(() => {
    if (rateFocused.current) return;
    if (sameCurrency) {
      setRateDisplay("1");
      return;
    }
    const r = Number(watchedRate);
    setRateDisplay(r > 0 ? String(Math.round((1 / r) * 100) / 100) : "");
  }, [watchedRate, sameCurrency]);

  const onRateDisplayChange = (text) => {
    setRateDisplay(text);
    const inrPerForeign = Number(text);
    setValue(
      "exchange_rate",
      inrPerForeign > 0 ? String(1 / inrPerForeign) : "",
      { shouldDirty: true }
    );
  };

  return (
    <Row>
      <Col md="6" className="mb-2">
        <Label className="form-label">
          {t("Customer")} {required}
        </Label>
        <Controller
          name="customer_id"
          control={control}
          render={({ field }) => {
            // Lock customer when PO came from a Quotation/PFI — those
            // source docs already define the customer; mutating it here
            // would break traceability.
            const inheritedFromSource = !!(sourcePfiId || sourceQuotationId);
            return (
              <Select
                classNamePrefix="select"
                isDisabled={isLocked || inheritedFromSource}
                options={customerOptions}
                value={
                  customerOptions.find((o) => o.value === field.value) || null
                }
                onChange={(opt) => field.onChange(opt ? opt.value : "")}
                placeholder={t("Select customer")}
              />
            );
          }}
        />
        {errors.customer_id && (
          <FormFeedback className="d-block">
            {errors.customer_id.message}
          </FormFeedback>
        )}
        {(sourcePfiId || sourceQuotationId) && (
          <small className="text-muted">
            {t("Linked from source")}{" "}
            {!PFI_RETIRED && sourcePfiId ? t("PFI") : t("Quotation")}.
          </small>
        )}
      </Col>

      <Col md="6" className="mb-2">
        <Label className="form-label">{t("Bill-to Address")}</Label>
        <Controller
          name="customer_address_id"
          control={control}
          render={({ field }) => (
            <Select
              classNamePrefix="select"
              isClearable
              isDisabled={isLocked}
              options={customerAddressOptions}
              value={
                customerAddressOptions.find((o) => o.value === field.value) ||
                null
              }
              onChange={(opt) => field.onChange(opt ? opt.value : "")}
              placeholder={
                customerAddressOptions.length
                  ? t("Select address")
                  : t("Pick a customer first")
              }
            />
          )}
        />
      </Col>

      {/* ── Consignee (Ship-to) — "Same as Buyer" mirrors the bill-to customer
          + address and locks the dropdowns; uncheck to ship elsewhere. ── */}
      <Col md="6" className="mb-2">
        <div className="d-flex align-items-center justify-content-between">
          <Label className="form-label mb-0">{t("Consignee")}</Label>
          <Controller
            name="consignee_same_as_buyer"
            control={control}
            render={({ field }) => (
              <div className="form-check mb-0">
                <Input
                  type="checkbox"
                  id="consignee_same_as_buyer"
                  disabled={isLocked}
                  checked={field.value !== false}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
                <Label
                  for="consignee_same_as_buyer"
                  className="form-check-label small"
                >
                  {t("Same as Buyer")}
                </Label>
              </div>
            )}
          />
        </div>
        <Controller
          name="consignee_id"
          control={control}
          render={({ field }) => (
            <Select
              classNamePrefix="select"
              isClearable
              isDisabled={isLocked || sameAsBuyer}
              options={customerOptions}
              value={
                customerOptions.find((o) => o.value === field.value) || null
              }
              onChange={(opt) => field.onChange(opt ? opt.value : "")}
              placeholder={t("Select consignee")}
            />
          )}
        />
      </Col>

      <Col md="6" className="mb-2">
        <Label className="form-label">{t("Consignee Address")}</Label>
        <Controller
          name="consignee_address_id"
          control={control}
          render={({ field }) => (
            <Select
              classNamePrefix="select"
              isClearable
              isDisabled={isLocked || sameAsBuyer}
              options={consigneeAddressOptions}
              value={
                consigneeAddressOptions.find((o) => o.value === field.value) ||
                null
              }
              onChange={(opt) => field.onChange(opt ? opt.value : "")}
              placeholder={
                consigneeAddressOptions.length
                  ? t("Select address")
                  : t("Pick a consignee first")
              }
            />
          )}
        />
      </Col>

      <Col md="3" className="mb-2">
        <Label className="form-label">
          {t("PO Date")} {required}
        </Label>
        <Controller
          name="po_date"
          control={control}
          render={({ field }) => (
            <DateInput
              id="po_date"
              value={field.value || ""}
              invalid={!!errors.po_date}
              disabled={isLocked}
              onChange={(dates, str, iso) => field.onChange(iso)}
            />
          )}
        />
        {errors.po_date && <FormFeedback>{errors.po_date.message}</FormFeedback>}
      </Col>

      <Col md="3" className="mb-2">
        <Label className="form-label">{t("Expected Delivery")}</Label>
        <Controller
          name="expected_delivery_date"
          control={control}
          render={({ field }) => (
            <DateInput
              id="expected_delivery_date"
              value={field.value || ""}
              disabled={isLocked}
              onChange={(dates, str, iso) => field.onChange(iso)}
            />
          )}
        />
      </Col>

      <Col md="3" className="mb-2">
        <Label className="form-label">{t("Currency")} {required}</Label>
        <Controller
          name="currency_code"
          control={control}
          render={({ field }) => (
            <Select
              classNamePrefix="select"
              isDisabled={isLocked}
              options={currencyOptions}
              value={
                currencyOptions.find((o) => o.value === field.value) || null
              }
              onChange={(opt) => field.onChange(opt ? opt.value : "")}
              placeholder={t("Select currency")}
            />
          )}
        />
        {errors.currency_code && (
          <FormFeedback className="d-block">
            {errors.currency_code.message}
          </FormFeedback>
        )}
      </Col>

      <Col md="3" className="mb-2">
        <Label className="form-label">
          {t("Exchange Rate")}
          {rateMeta?.toCode && !sameCurrency ? (
            <small className="text-muted">
              {" "}
              (₹ {t("per 1")} {rateMeta.toCode})
            </small>
          ) : null}
        </Label>
        <Controller
          name="exchange_rate"
          control={control}
          render={({ field }) => (
            <Input
              type="number"
              step="0.01"
              min="0"
              disabled={isLocked || sameCurrency}
              name={field.name}
              innerRef={field.ref}
              value={rateDisplay}
              onFocus={() => (rateFocused.current = true)}
              onBlur={() => {
                rateFocused.current = false;
                field.onBlur();
              }}
              onChange={(e) => onRateDisplayChange(e.target.value)}
            />
          )}
        />
        <small className="text-muted d-block">
          {rateMeta?.same ? (
            t("Same currency - rate fixed at 1.")
          ) : rateMeta?.rate ? (
            (() => {
              const liveRate = Number(watchedRate);
              const effRate =
                Number.isFinite(liveRate) && liveRate > 0
                  ? liveRate
                  : Number(rateMeta.rate);
              const modified =
                Number.isFinite(liveRate) &&
                liveRate > 0 &&
                liveRate !== Number(rateMeta.rate);
              return (
                <>
                  {modified
                    ? t("Custom rate for this Sales Order")
                    : t("Auto-filled from Currency master")}
                  {!modified && rateMeta.effective_date
                    ? ` (${t("as of")} ${rateMeta.effective_date})`
                    : ""}
                  {modified ? <br /> : ". "}
                  <span>
                    {getCurrencySymbol(rateMeta.fromCode) || rateMeta.fromCode}1 ={" "}
                    {getCurrencySymbol(rateMeta.toCode) || rateMeta.toCode}
                    {Number(effRate).toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })}
                    {effRate > 0
                      ? ` · ${getCurrencySymbol(rateMeta.toCode) || rateMeta.toCode}1 = ${
                          getCurrencySymbol(rateMeta.fromCode) || rateMeta.fromCode
                        }${(1 / effRate).toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}`
                      : ""}
                  </span>
                </>
              );
            })()
          ) : rateMeta?.missing ? (
            <span className="text-warning">
              {t("No rate set in Currency master - enter manually.")}
            </span>
          ) : (
            ""
          )}
        </small>
      </Col>

      <Col md="3" className="mb-2">
        <Label className="form-label">{t("Payment Terms")}</Label>
        <Controller
          name="payment_terms"
          control={control}
          render={({ field }) => (
            <Select
              classNamePrefix="select"
              isClearable
              isDisabled={isLocked}
              options={VENDOR_PAYMENT_TERMS_OPTIONS}
              value={
                VENDOR_PAYMENT_TERMS_OPTIONS.find(
                  (o) => o.value === field.value
                ) || null
              }
              onChange={(opt) => field.onChange(opt ? opt.value : "")}
            />
          )}
        />
      </Col>

      <Col md="3" className="mb-2">
        <Label className="form-label">{t("Delivery Terms (Incoterm)")}</Label>
        <Controller
          name="delivery_terms"
          control={control}
          render={({ field }) => (
            <Select
              classNamePrefix="select"
              isClearable
              isDisabled={isLocked}
              options={VENDOR_INCOTERMS_OPTIONS}
              value={
                VENDOR_INCOTERMS_OPTIONS.find((o) => o.value === field.value) ||
                null
              }
              onChange={(opt) => field.onChange(opt ? opt.value : "")}
            />
          )}
        />
      </Col>

      <Col md="12" className="mb-2">
        <Label className="form-label">{t("Source")}</Label>
        <div className="form-control bg-light d-flex justify-content-between align-items-center">
          {(PFI_RETIRED ? sourceQuotationVoucher : sourcePfiVoucher || sourceQuotationVoucher) ? (
            <>
              <span>
                🔗{" "}
                {!PFI_RETIRED && sourcePfiVoucher
                  ? `PFI ${sourcePfiVoucher}`
                  : `Quote ${sourceQuotationVoucher}`}
              </span>
              {!PFI_RETIRED && sourcePfiId && (
                <a
                  href={`${appsRoot}/pfi/view/${sourcePfiId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-decoration-none ms-2"
                >
                  <ExternalLink size={16} />
                </a>
              )}
              {(PFI_RETIRED || !sourcePfiId) && sourceQuotationId && (
                <a
                  href={`${appsRoot}/quotations/view/${sourceQuotationId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-decoration-none ms-2"
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </>
          ) : (
            <small className="text-muted">
              {PFI_RETIRED
                ? t("Standalone PO (not linked to a Quotation).")
                : t("Standalone PO (not linked to a PFI / Quotation).")}
            </small>
          )}
        </div>
      </Col>
    </Row>
  );
};

export default Step1Vendor;
