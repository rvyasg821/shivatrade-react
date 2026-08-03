// ── Step 1: Customer & Reference ─────────────────────────────────────
// Captures: customer, bill-to, dates, currency + rate, payment & delivery
// terms, lead reference banner.

// (react hooks import removed — no local rate state on this step anymore)
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
import { useBooksClosedUpto, isClosedPeriod, closedPeriodMessage } from "@src/hooks/useBooksClosed";

const required = <span className="text-danger">*</span>;

const Step1Customer = ({
  isLocked,
  customerOptions,
  customerAddressOptions,
  consigneeAddressOptions = [],
  currencyOptions,
  leadStore,
  vendorStore,
}) => {
  const { t } = useTranslation();
  const booksClosedUpto = useBooksClosedUpto();
  const {
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();
  const watchedCustomer = watch("customer_id");
  const watchedLeadId = watch("lead_id");
  const sameAsBuyer = watch("consignee_same_as_buyer") !== false;

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
              placeholder={
                watchedLeadId
                  ? t("Auto-create from lead — or pick an existing customer")
                  : t("Select customer")
              }
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
        {/* From a lead with no explicit customer: the backend auto-creates
            (or matches by email) on save. Always surface this so the empty
            dropdown never reads as a blocking required field. */}
        {watchedLeadId && !watch("customer_id") && (
          <small className="text-info d-block mt-1">
            {t("Customer will be auto-created from lead ")}
            <strong>
              {leadStore?.leadItem?._id === watchedLeadId
                ? leadStore.leadItem.company_name ||
                  leadStore.leadItem.contact_name ||
                  ""
                : ""}
            </strong>
            {t(" on save (or matched by email if it already exists).")}
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

      {/* ── Consignee (Ship-to) — "Same as Buyer" mirrors the bill-to
          customer + address and locks the dropdowns; uncheck to ship
          elsewhere. Carried onto the Sales Order on Generate. ── */}
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
          {t("Quotation Date")} {required}
        </Label>
        <Controller
          name="quotation_date"
          control={control}
          render={({ field }) => (
            <>
              <DateInput
                id="quotation_date"
                value={field.value || ""}
                invalid={!!errors.quotation_date || isClosedPeriod(field.value, booksClosedUpto)}
                disabled={isLocked}
                onChange={(dates, str, iso) => field.onChange(iso)}
              />
              {!errors.quotation_date && isClosedPeriod(field.value, booksClosedUpto) && (
                <FormFeedback className="d-block">
                  {closedPeriodMessage(booksClosedUpto, t("quotation date"))}
                </FormFeedback>
              )}
            </>
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
            <DateInput
              id="valid_until"
              value={field.value || ""}
              disabled={isLocked}
              onChange={(dates, str, iso) => field.onChange(iso)}
            />
          )}
        />
      </Col>

      <Col md="6" className="mb-2">
        <Label className="form-label">
          {t("Reference No.")}{" "}
          <small className="text-muted">({t("optional")})</small>
        </Label>
        <Controller
          name="reference_no"
          control={control}
          render={({ field }) => (
            <Input
              placeholder={t("Manual tracking reference")}
              maxLength={100}
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

      {/* Exchange Rate field removed — the sale currency conversion now happens
          per vendor→customer on Step 2 (Line Items). The customer→INR rate is
          still auto-set on the header behind the scenes for INR reporting. */}

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
              maxMenuHeight={180}
              menuPortalTarget={
                typeof document !== "undefined" ? document.body : undefined
              }
              styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
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
              menuPlacement="auto"
              menuPosition="fixed"
              maxMenuHeight={180}
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
                <div className="border rounded bg-light p-2 d-flex justify-content-between align-items-start gap-2">
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
                        href={`${appsRoot}/leads/view/${watchedLeadId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t("Open Lead in new tab")}
                        className="text-decoration-none ms-2 flex-shrink-0"
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
