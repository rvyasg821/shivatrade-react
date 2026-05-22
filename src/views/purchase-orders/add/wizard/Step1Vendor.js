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
import { VENDOR_PAYMENT_TERMS_OPTIONS, VENDOR_INCOTERMS_OPTIONS } from "@constant/options";
import DateInput from "@components/date-input";
import CompanyAddressSelect from "@src/views/_shared/CompanyAddressSelect";

const required = <span className="text-danger">*</span>;

const Step1Vendor = ({
  isLocked,
  customerOptions = [],
  sourcePfiVoucher,
  sourcePfiId,
  sourceQuotationVoucher,
  sourceQuotationId,
}) => {
  const { t } = useTranslation();
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext();
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
            {sourcePfiId ? t("PFI") : t("Quotation")}.
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
            <CompanyAddressSelect
              value={field.value || ""}
              onChange={(id) => {
                field.onChange(id);
                // Clear any manual override when switching to a saved
                // address — the snapshot text will come from the BE.
                setValue("delivery_address", "", { shouldDirty: true });
              }}
              isDisabled={isLocked}
            />
          )}
        />
        <small className="text-muted">
          {t(
            "Pick a saved company address. Vendors will deliver here. Manage addresses in Profile → Addresses."
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
          {sourcePfiVoucher || sourceQuotationVoucher ? (
            <>
              <span>
                🔗{" "}
                {sourcePfiVoucher
                  ? `PFI ${sourcePfiVoucher}`
                  : `Quote ${sourceQuotationVoucher}`}
              </span>
              {sourcePfiId && (
                <a
                  href={`${appsRoot}/pfi/view/${sourcePfiId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-decoration-none ms-2"
                >
                  <ExternalLink size={16} />
                </a>
              )}
              {!sourcePfiId && sourceQuotationId && (
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
              {t("Standalone PO (not linked to a PFI / Quotation).")}
            </small>
          )}
        </div>
      </Col>
    </Row>
  );
};

export default Step1Vendor;
