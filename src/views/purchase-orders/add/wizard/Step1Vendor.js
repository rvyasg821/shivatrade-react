// ── Step 1: Vendor & Reference (PO) ─────────────────────────────────
import { Controller, useFormContext } from "react-hook-form";
import { Row, Col, Label, Input, FormFeedback } from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "react-feather";

import { appsRoot } from "@constant/defaultValues";
import { VENDOR_PAYMENT_TERMS_OPTIONS, VENDOR_INCOTERMS_OPTIONS } from "@constant/options";
import DateInput from "@components/date-input";

const required = <span className="text-danger">*</span>;

const Step1Vendor = ({
  isLocked,
  vendorOptions,
  vendorAddressOptions,
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
  const watchedVendor = watch("vendor_id");

  return (
    <Row>
      <Col md="6" className="mb-2">
        <Label className="form-label">
          {t("Vendor")} {required}
        </Label>
        <Controller
          name="vendor_id"
          control={control}
          render={({ field }) => (
            <Select
              classNamePrefix="select"
              isDisabled={isLocked}
              options={vendorOptions}
              value={vendorOptions.find((o) => o.value === field.value) || null}
              onChange={(opt) => {
                field.onChange(opt ? opt.value : "");
                setValue("vendor_address_id", "");
                // Reset lines — different vendor has different price list.
                setValue("lines", []);
              }}
            />
          )}
        />
        {errors.vendor_id && (
          <FormFeedback className="d-block">
            {errors.vendor_id.message}
          </FormFeedback>
        )}
      </Col>

      <Col md="6" className="mb-2">
        <Label className="form-label">{t("Vendor Address")}</Label>
        <Controller
          name="vendor_address_id"
          control={control}
          render={({ field }) => (
            <Select
              classNamePrefix="select"
              isClearable
              options={vendorAddressOptions}
              value={
                vendorAddressOptions.find((o) => o.value === field.value) ||
                null
              }
              onChange={(opt) => field.onChange(opt ? opt.value : "")}
              placeholder={
                watchedVendor ? t("Select address") : t("Pick a vendor first")
              }
              isDisabled={!watchedVendor || isLocked}
            />
          )}
        />
        <small className="text-muted">
          {t("Defaults to vendor's primary address. Drives intra/inter-state GST split.")}
        </small>
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
          name="delivery_address"
          control={control}
          render={({ field }) => (
            <Input
              type="textarea"
              rows="2"
              placeholder="e.g. Forwarder Warehouse, Mundra Port"
              disabled={isLocked}
              invalid={!!errors.delivery_address}
              {...field}
              value={field.value || ""}
            />
          )}
        />
        {errors.delivery_address && (
          <FormFeedback>{errors.delivery_address.message}</FormFeedback>
        )}
        <small className="text-muted">
          {t("Pre-filled from company default. Override per PO if needed.")}
        </small>
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
