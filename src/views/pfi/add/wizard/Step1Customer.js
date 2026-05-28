// ── Step 1: Customer & Reference (PFI) ───────────────────────────────
import { Controller, useFormContext } from "react-hook-form";
import { Row, Col, Label, Input, FormFeedback } from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "react-feather";

import { appsRoot } from "@constant/defaultValues";
import {
  INCOTERMS_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
} from "@constant/options";
import DateInput from "@components/date-input";

const required = <span className="text-danger">*</span>;

const Step1Customer = ({
  isLocked,
  rateMeta,
  customerOptions,
  customerAddressOptions,
  currencyOptions,
  sourceQuotationVoucher,
  sourceQuotationId,
  leadStore,
  vendorStore,
}) => {
  const { t } = useTranslation();
  const {
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();
  const watchedCustomer = watch("customer_id");
  const watchedLeadId = watch("lead_id");

  // Preferred-vendors banner from inherited lead.
  const lead = leadStore?.leadItem;
  const linked = lead && lead._id === watchedLeadId;
  const prefIds = linked ? lead.preferred_vendors || [] : [];
  const prefNames = prefIds
    .map((vid) => {
      const v = (vendorStore?.vendorDropdown || []).find((x) => x._id === vid);
      return v
        ? v.vendor_code
          ? `${v.company_name} [${v.vendor_code}]`
          : v.company_name
        : null;
    })
    .filter(Boolean);

  return (
    <>
      {prefNames.length > 0 && (
        <div className="alert alert-info py-1 px-2 mb-2 small">
          ⭐ {t("Customer prefers")}: <strong>{prefNames.join(", ")}</strong>
        </div>
      )}

      <Row>
        <Col md="6" className="mb-2">
          <Label className="form-label">
            {t("Customer")} {required}
          </Label>
          <Controller
            name="customer_id"
            control={control}
            render={({ field }) => (
              <Select
                classNamePrefix="select"
                isDisabled={isLocked}
                options={customerOptions}
                value={
                  customerOptions.find((o) => o.value === field.value) || null
                }
                onChange={(opt) => {
                  field.onChange(opt ? opt.value : "");
                  setValue("customer_address_id", "");
                }}
              />
            )}
          />
          {errors.customer_id && (
            <FormFeedback className="d-block">
              {errors.customer_id.message}
            </FormFeedback>
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
                options={customerAddressOptions}
                value={
                  customerAddressOptions.find((o) => o.value === field.value) ||
                  null
                }
                onChange={(opt) => field.onChange(opt ? opt.value : "")}
                placeholder={
                  watchedCustomer
                    ? t("Select address")
                    : t("Pick a customer first")
                }
                isDisabled={!watchedCustomer || isLocked}
              />
            )}
          />
        </Col>

        <Col md="3" className="mb-2">
          <Label className="form-label">
            {t("PFI Date")} {required}
          </Label>
          <Controller
            name="pfi_date"
            control={control}
            render={({ field }) => (
              <DateInput
                id="pfi_date"
                value={field.value || ""}
                invalid={!!errors.pfi_date}
                disabled={isLocked}
                onChange={(dates, str, iso) => field.onChange(iso)}
              />
            )}
          />
          {errors.pfi_date && (
            <FormFeedback>{errors.pfi_date.message}</FormFeedback>
          )}
        </Col>

        <Col md="3" className="mb-2">
          <Label className="form-label">{t("Valid Until")}</Label>
          <Controller
            name="valid_until"
            control={control}
            render={({ field }) => (
              <DateInput
                id="valid_until"
                value={field.value || ""}
                disabled={isLocked}
                onChange={(dates, str, iso) => field.onChange(iso)}
              />
            )}
          />
        </Col>

        <Col md="3" className="mb-2">
          <Label className="form-label">
            {t("Currency")} {required}
          </Label>
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
          {errors.currency_code && (
            <FormFeedback className="d-block">
              {errors.currency_code.message}
            </FormFeedback>
          )}
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
              <>
                {t("Auto-filled from Currency master")}
                {rateMeta.effective_date
                  ? ` (${t("as of")} ${rateMeta.effective_date})`
                  : ""}
                . 1 {rateMeta.fromCode} ={" "}
                {Number(rateMeta.rate).toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                })}{" "}
                {rateMeta.toCode}
              </>
            ) : rateMeta?.missing ? (
              <span className="text-warning">
                {t("No rate set in Currency master - enter manually.")}
              </span>
            ) : (
              t("INR × rate = customer-currency amount.")
            )}
          </small>
        </Col>

        <Col md="4" className="mb-2">
          <Label className="form-label">{t("Payment Terms")}</Label>
          <Controller
            name="payment_terms"
            control={control}
            render={({ field }) => (
              <Select
                classNamePrefix="select"
                isClearable
                isDisabled={isLocked}
                options={PAYMENT_TERMS_OPTIONS}
                value={
                  PAYMENT_TERMS_OPTIONS.find((o) => o.value === field.value) ||
                  null
                }
                onChange={(opt) => field.onChange(opt ? opt.value : "")}
                menuPlacement="auto"
                menuPosition="fixed"
                maxMenuHeight={140}
                menuPortalTarget={
                  typeof document !== "undefined" ? document.body : undefined
                }
                styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
              />
            )}
          />
        </Col>

        <Col md="4" className="mb-2">
          <Label className="form-label">
            {t("Delivery Terms (Incoterm)")}
          </Label>
          <Controller
            name="delivery_terms"
            control={control}
            render={({ field }) => (
              <Select
                classNamePrefix="select"
                isClearable
                isDisabled={isLocked}
                options={INCOTERMS_OPTIONS}
                value={
                  INCOTERMS_OPTIONS.find((o) => o.value === field.value) || null
                }
                onChange={(opt) => field.onChange(opt ? opt.value : "")}
                menuPlacement="auto"
                menuPosition="fixed"
                maxMenuHeight={140}
                menuPortalTarget={
                  typeof document !== "undefined" ? document.body : undefined
                }
                styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
              />
            )}
          />
        </Col>

        <Col md="4" className="mb-2">
          <Label className="form-label">{t("Delivery Location")}</Label>
          <Controller
            name="delivery_location"
            control={control}
            render={({ field }) => (
              <Input
                placeholder="e.g. Mumbai Port, Dubai (Jebel Ali)"
                disabled={isLocked}
                {...field}
                value={field.value || ""}
              />
            )}
          />
        </Col>

        <Col md="12" className="mb-2">
          <Label className="form-label">{t("Source Quotation")}</Label>
          <div className="form-control bg-light d-flex justify-content-between align-items-center">
            {sourceQuotationVoucher ? (
              <>
                <span>🔗 {sourceQuotationVoucher}</span>
                {sourceQuotationId && (
                  <a
                    href={`${appsRoot}/quotations/view/${sourceQuotationId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t("Open Quotation in new tab")}
                    className="text-decoration-none ms-2"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </>
            ) : (
              <small className="text-muted">
                {t(
                  "No source quotation. Created standalone - usually you'd convert from an approved Quotation."
                )}
              </small>
            )}
          </div>
        </Col>
      </Row>
    </>
  );
};

export default Step1Customer;
