// ── Step 1: Customer & Reference ─────────────────────────────────────
// Captures: customer, bill-to, dates, currency + rate, payment & delivery
// terms, lead reference banner.

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

const required = <span className="text-danger">*</span>;

const Step1Customer = ({
  isLocked,
  rateMeta,
  customerOptions,
  customerAddressOptions,
  currencyOptions,
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

  return (
    <Row>
      <Col md="6" className="mb-2">
        <Label className="form-label">
          {t("Customer")}{" "}
          {watchedLeadId ? (
            <small className="text-muted">({t("optional")})</small>
          ) : (
            required
          )}
        </Label>
        <Controller
          name="customer_id"
          control={control}
          render={({ field }) => (
            <Select
              classNamePrefix="select"
              isClearable
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
        {watchedLeadId &&
          !watch("customer_id") &&
          leadStore?.leadItem?._id === watchedLeadId && (
            <small className="text-info d-block mt-1">
              {t("Customer will be auto-created from lead ")}
              <strong>
                {leadStore.leadItem.company_name ||
                  leadStore.leadItem.contact_name ||
                  "-"}
              </strong>
              {t(" on save (or matched by email if exists).")}
            </small>
          )}
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
        <small className="text-muted">
          {t("Used to determine intra/inter-state for tax.")}
        </small>
      </Col>

      <Col md="3" className="mb-2">
        <Label className="form-label">
          {t("Quotation Date")} {required}
        </Label>
        <Controller
          name="quotation_date"
          control={control}
          render={({ field }) => (
            <Input
              type="date"
              invalid={!!errors.quotation_date}
              disabled={isLocked}
              {...field}
            />
          )}
        />
        {errors.quotation_date && (
          <FormFeedback>{errors.quotation_date.message}</FormFeedback>
        )}
      </Col>

      <Col md="3" className="mb-2">
        <Label className="form-label">{t("Valid Until")}</Label>
        <Controller
          name="valid_until"
          control={control}
          render={({ field }) => (
            <Input
              type="date"
              disabled={isLocked}
              {...field}
              value={field.value || ""}
            />
          )}
        />
      </Col>

      <Col md="3" className="mb-2">
        <Label className="form-label">
          {t("Currency")} {required}
        </Label>
        <Controller
          name="currency_id"
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
        {errors.currency_id && (
          <FormFeedback className="d-block">
            {errors.currency_id.message}
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
            t("Same currency — rate fixed at 1.")
          ) : rateMeta?.rate ? (
            <>
              {t("Auto-filled from Currency master")}
              {rateMeta.effective_date
                ? ` (${t("as of")} ${rateMeta.effective_date})`
                : ""}
              .{" "}
              <span>
                1 {rateMeta.fromCode} ={" "}
                {Number(rateMeta.rate).toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                })}{" "}
                {rateMeta.toCode}
                {rateMeta.rate > 0
                  ? ` · 1 ${rateMeta.toCode} = ${(
                      1 / rateMeta.rate
                    ).toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })} ${rateMeta.fromCode}`
                  : ""}
              </span>
            </>
          ) : rateMeta?.missing ? (
            <span className="text-warning">
              {t("No rate set in Currency master — enter manually.")}
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
            />
          )}
        />
      </Col>

      <Col md="4" className="mb-2">
        <Label className="form-label">{t("Delivery Terms (Incoterm)")}</Label>
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
        <Label className="form-label">{t("Lead Reference")}</Label>
        {watchedLeadId ? (
          (() => {
            const lead = leadStore?.leadItem;
            const linked = lead && lead._id === watchedLeadId;
            const prefIds = linked ? lead.preferred_vendors || [] : [];
            const prefNames = prefIds
              .map((vid) => {
                const v = (vendorStore?.vendorDropdown || []).find(
                  (x) => x._id === vid
                );
                return v
                  ? v.vendor_code
                    ? `${v.company_name} [${v.vendor_code}]`
                    : v.company_name
                  : null;
              })
              .filter(Boolean);
            return (
              <>
                <div className="form-control bg-light d-flex justify-content-between align-items-center">
                  {linked ? (
                    <>
                      <span>
                        🔗{" "}
                        <strong>
                          {lead.company_name || lead.contact_name || "-"}
                        </strong>
                        {lead.contact_name && lead.company_name
                          ? ` · ${lead.contact_name}`
                          : ""}
                        {lead.status ? (
                          <span className="ms-2 badge bg-info text-dark text-capitalize">
                            {lead.status}
                          </span>
                        ) : null}
                      </span>
                      <a
                        href={`${appsRoot}/leads/edit/${watchedLeadId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t("Open Lead in new tab")}
                        className="text-decoration-none ms-2"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </>
                  ) : (
                    <span className="text-muted">{t("Loading lead…")}</span>
                  )}
                </div>
                {prefNames.length > 0 && (
                  <div className="alert alert-info py-1 px-2 mt-1 mb-0 small">
                    ⭐ {t("Customer prefers")}:{" "}
                    <strong>{prefNames.join(", ")}</strong>
                  </div>
                )}
              </>
            );
          })()
        ) : (
          <div className="form-control bg-light text-muted">
            <small>
              {t(
                "No lead linked. To attach, create the quotation from the Lead page."
              )}
            </small>
          </div>
        )}
      </Col>
    </Row>
  );
};

export default Step1Customer;
