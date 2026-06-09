// ── Step 1: Customer & Reference (PO) ───────────────────────────────
// PO is multi-vendor at line level — vendor selection happens in Step 2
// per line. This step only collects customer + dates + delivery + terms.

import { Controller, useFormContext } from "react-hook-form";
import { Row, Col, Label, Input, FormFeedback } from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "react-feather";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "react-feather";
import { appsRoot } from "@constant/defaultValues";
import { PFI_RETIRED } from "@src/configs/appMode";
import { VENDOR_PAYMENT_TERMS_OPTIONS, VENDOR_INCOTERMS_OPTIONS } from "@constant/options";
import DateInput from "@components/date-input";
import { getCurrencySymbol } from "@src/utility/currency";
import LocationSelect from "@src/views/_shared/LocationSelect";

const required = <span className="text-danger">*</span>;

const Step1Vendor = ({
  isLocked,
  customerOptions = [],
  customerAddressOptions = [],
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
  const [showAddressOverride, setShowAddressOverride] = useState(false);

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
            />
          )}
        />
      </Col>

      <Col md="3" className="mb-2">
        <Label className="form-label">{t("Exchange Rate")}</Label>
        <Controller
          name="exchange_rate"
          control={control}
          render={({ field }) => (
            <Input
              type="number"
              step="0.000001"
              min="0"
              disabled={isLocked}
              {...field}
              value={field.value ?? ""}
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
        <Label className="form-label">
          {t("Delivery Address")} {required}
        </Label>
        <Controller
          name="delivery_address_id"
          control={control}
          render={({ field }) => (
            <LocationSelect
              value={field.value || ""}
              onChange={(id) => {
                field.onChange(id);
                // Clear any manual override when switching to a saved
                // location — the snapshot text will come from the BE.
                setValue("delivery_address", "", { shouldDirty: true });
              }}
              isDisabled={isLocked}
            />
          )}
        />
        <small className="text-muted">
          {t(
            "Pick a delivery location. Vendors will deliver here. Manage locations under the Locations menu."
          )}
        </small>

        <button
          type="button"
          className="btn btn-link btn-sm p-0 mt-50"
          onClick={() => setShowAddressOverride((s) => !s)}
          disabled={isLocked}
        >
          {showAddressOverride ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )}{" "}
          {t("Override with custom text (advanced)")}
        </button>
        {showAddressOverride && (
          <Controller
            name="delivery_address"
            control={control}
            render={({ field }) => (
              <Input
                type="textarea"
                rows="2"
                className="mt-1"
                placeholder={t(
                  "One-off destination — factory-to-port direct, customer pickup, etc. Wins over the saved address when filled."
                )}
                disabled={isLocked}
                invalid={!!errors.delivery_address}
                {...field}
                value={field.value || ""}
              />
            )}
          />
        )}
        {errors.delivery_address && (
          <FormFeedback className="d-block">
            {errors.delivery_address.message}
          </FormFeedback>
        )}
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
