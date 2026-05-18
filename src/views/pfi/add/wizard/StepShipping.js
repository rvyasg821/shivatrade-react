// ── Step: Shipping & Packing (PFI) ───────────────────────────────────
// Header-level export-document fields needed for the PFI / Commercial
// Invoice document chain: consignee, ports, mode, packing, declaration,
// bank account. Line-level weights / package counts are entered in the
// Line Items step and roll up here as read-only auto-sums.

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Row, Col, Label, Input, FormFeedback } from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";

import {
  MODE_OF_SHIPMENT_OPTIONS,
  PACKING_TYPE_OPTIONS,
  COUNTRY_OPTIONS,
} from "@constant/options";
import DateInput from "@components/date-input";

const required = <span className="text-danger">*</span>;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const StepShipping = ({
  isLocked,
  bankAccountsForCurrency = [],
  allBankAccounts = [],
}) => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
  } = useFormContext();

  // Live auto-sums from lines (Phase 2 adds the per-line fields; until then
  // these resolve to 0 which is fine).
  const lines = useWatch({ control, name: "lines" }) || [];
  const totalPackages = lines.reduce(
    (s, l) => s + (parseInt(l?.package_count, 10) || 0),
    0,
  );
  const totalNetWt = lines.reduce((s, l) => s + num(l?.net_weight_kg), 0);
  const totalGrossWt = lines.reduce((s, l) => s + num(l?.gross_weight_kg), 0);

  const countryOptions = (COUNTRY_OPTIONS || []).map((c) =>
    typeof c === "string" ? { value: c, label: c } : c,
  );

  return (
    <Row>
      {/* ── Consignee ─────────────────────────────────────────────── */}
      <Col md="12">
        <h5 className="mt-1 mb-2">{t("Consignee")}</h5>
        <small className="text-muted d-block mb-2">
          {t(
            "Leave blank to use the buyer as the consignee on the public PFI and PDF.",
          )}
        </small>
      </Col>

      <Col md="6" className="mb-2">
        <Label className="form-label">{t("Consignee Name")}</Label>
        <Controller
          name="consignee_name"
          control={control}
          render={({ field }) => (
            <Input
              disabled={isLocked}
              {...field}
              value={field.value || ""}
              maxLength={200}
            />
          )}
        />
      </Col>

      <Col md="6" className="mb-2">
        <Label className="form-label">{t("Consignee Address")}</Label>
        <Controller
          name="consignee_address"
          control={control}
          render={({ field }) => (
            <Input
              type="textarea"
              rows="2"
              disabled={isLocked}
              {...field}
              value={field.value || ""}
            />
          )}
        />
      </Col>

      {/* ── Shipping ──────────────────────────────────────────────── */}
      <Col md="12">
        <h5 className="mt-2 mb-2">{t("Shipping")}</h5>
      </Col>

      <Col md="4" className="mb-2">
        <Label className="form-label">
          {t("Port of Loading")} {required}
        </Label>
        <Controller
          name="port_of_loading"
          control={control}
          render={({ field }) => (
            <Input
              placeholder="e.g. Mundra Port, India"
              disabled={isLocked}
              {...field}
              value={field.value || ""}
              maxLength={150}
            />
          )}
        />
        {errors.port_of_loading && (
          <FormFeedback className="d-block">
            {errors.port_of_loading.message}
          </FormFeedback>
        )}
      </Col>

      <Col md="4" className="mb-2">
        <Label className="form-label">
          {t("Port of Discharge")} {required}
        </Label>
        <Controller
          name="port_of_discharge"
          control={control}
          render={({ field }) => (
            <Input
              placeholder="e.g. Jebel Ali, UAE"
              disabled={isLocked}
              {...field}
              value={field.value || ""}
              maxLength={150}
            />
          )}
        />
        {errors.port_of_discharge && (
          <FormFeedback className="d-block">
            {errors.port_of_discharge.message}
          </FormFeedback>
        )}
      </Col>

      <Col md="4" className="mb-2">
        <Label className="form-label">{t("Final Destination")}</Label>
        <Controller
          name="final_destination"
          control={control}
          render={({ field }) => (
            <Input
              placeholder={t("Defaults to discharge port when empty")}
              disabled={isLocked}
              {...field}
              value={field.value || ""}
              maxLength={150}
            />
          )}
        />
      </Col>

      <Col md="4" className="mb-2">
        <Label className="form-label">
          {t("Country of Origin")} {required}
        </Label>
        <Controller
          name="country_of_origin"
          control={control}
          render={({ field }) => (
            <Select
              classNamePrefix="select"
              isClearable
              isDisabled={isLocked}
              options={countryOptions}
              value={
                countryOptions.find((o) => o.value === field.value) ||
                (field.value
                  ? { value: field.value, label: field.value }
                  : null)
              }
              onChange={(opt) => field.onChange(opt ? opt.value : "")}
            />
          )}
        />
      </Col>

      <Col md="4" className="mb-2">
        <Label className="form-label">
          {t("Country of Final Destination")} {required}
        </Label>
        <Controller
          name="country_of_final_destination"
          control={control}
          render={({ field }) => (
            <Select
              classNamePrefix="select"
              isClearable
              isDisabled={isLocked}
              options={countryOptions}
              value={
                countryOptions.find((o) => o.value === field.value) ||
                (field.value
                  ? { value: field.value, label: field.value }
                  : null)
              }
              onChange={(opt) => field.onChange(opt ? opt.value : "")}
            />
          )}
        />
      </Col>

      <Col md="4" className="mb-2">
        <Label className="form-label">
          {t("Mode of Shipment")} {required}
        </Label>
        <Controller
          name="mode_of_shipment"
          control={control}
          render={({ field }) => (
            <Select
              classNamePrefix="select"
              isClearable
              isDisabled={isLocked}
              options={MODE_OF_SHIPMENT_OPTIONS}
              value={
                MODE_OF_SHIPMENT_OPTIONS.find((o) => o.value === field.value) ||
                null
              }
              onChange={(opt) => field.onChange(opt ? opt.value : "")}
            />
          )}
        />
      </Col>

      <Col md="4" className="mb-2">
        <Label className="form-label">{t("Container Details")}</Label>
        <Controller
          name="container_details"
          control={control}
          render={({ field }) => (
            <Input
              placeholder="e.g. 1×20'FCL"
              disabled={isLocked}
              {...field}
              value={field.value || ""}
              maxLength={200}
            />
          )}
        />
      </Col>

      <Col md="4" className="mb-2">
        <Label className="form-label">{t("Est. Shipment Date")}</Label>
        <Controller
          name="est_shipment_date"
          control={control}
          render={({ field }) => (
            <DateInput
              id="est_shipment_date"
              value={field.value || ""}
              disabled={isLocked}
              onChange={(_d, _s, iso) => field.onChange(iso)}
            />
          )}
        />
      </Col>

      <Col md="4" className="mb-2">
        <Label className="form-label">{t("Est. Delivery Date")}</Label>
        <Controller
          name="est_delivery_date"
          control={control}
          render={({ field }) => (
            <DateInput
              id="est_delivery_date"
              value={field.value || ""}
              disabled={isLocked}
              onChange={(_d, _s, iso) => field.onChange(iso)}
            />
          )}
        />
      </Col>

      {/* ── Packing ───────────────────────────────────────────────── */}
      <Col md="12">
        <h5 className="mt-2 mb-2">{t("Packing")}</h5>
      </Col>

      <Col md="4" className="mb-2">
        <Label className="form-label">
          {t("Packing Type")} {required}
        </Label>
        <Controller
          name="packing_type"
          control={control}
          render={({ field }) => (
            <Select
              classNamePrefix="select"
              isClearable
              isDisabled={isLocked}
              options={PACKING_TYPE_OPTIONS}
              value={
                PACKING_TYPE_OPTIONS.find((o) => o.value === field.value) ||
                (field.value
                  ? { value: field.value, label: field.value }
                  : null)
              }
              onChange={(opt) => field.onChange(opt ? opt.value : "")}
            />
          )}
        />
      </Col>

      <Col md="4" className="mb-2">
        <Label className="form-label">{t("Packing Marks")}</Label>
        <Controller
          name="packing_marks"
          control={control}
          render={({ field }) => (
            <Input
              placeholder="e.g. SHIVA/PFI001/MUMBAI"
              disabled={isLocked}
              {...field}
              value={field.value || ""}
              maxLength={200}
            />
          )}
        />
      </Col>

      <Col md="4" className="mb-2">
        <Label className="form-label">{t("Validity (days)")}</Label>
        <Controller
          name="validity_days"
          control={control}
          render={({ field }) => (
            <Input
              type="number"
              min="0"
              disabled={isLocked}
              {...field}
              value={field.value ?? 30}
            />
          )}
        />
      </Col>

      {/* Auto-sums from lines (read-only). */}
      <Col md="4" className="mb-2">
        <Label className="form-label">{t("Total Packages")}</Label>
        <Input
          type="number"
          value={totalPackages}
          readOnly
          className="bg-light"
        />
        <small className="text-muted">
          {t("Auto-summed from line items.")}
        </small>
      </Col>

      <Col md="4" className="mb-2">
        <Label className="form-label">{t("Net Weight (kg)")}</Label>
        <Input
          type="text"
          value={totalNetWt.toFixed(3)}
          readOnly
          className="bg-light"
        />
        <small className="text-muted">
          {t("Auto-summed from line items.")}
        </small>
      </Col>

      <Col md="4" className="mb-2">
        <Label className="form-label">{t("Gross Weight (kg)")}</Label>
        <Input
          type="text"
          value={totalGrossWt.toFixed(3)}
          readOnly
          className="bg-light"
        />
        <small className="text-muted">
          {t("Auto-summed from line items.")}
        </small>
      </Col>

      {/* ── Commercial / declaration ──────────────────────────────── */}
      <Col md="12">
        <h5 className="mt-2 mb-2">{t("Payment & Declaration")}</h5>
      </Col>

      <Col md="6" className="mb-2">
        <Label className="form-label">
          {t("Payment Terms (export wording)")} {required}
        </Label>
        <Controller
          name="payment_terms_text"
          control={control}
          render={({ field }) => (
            <Input
              type="textarea"
              rows="2"
              disabled={isLocked}
              {...field}
              value={field.value || ""}
            />
          )}
        />
        <small className="text-muted">
          {t("Default: 100% advance via T/T. Editable per PFI.")}
        </small>
      </Col>

      <Col md="6" className="mb-2">
        <Label className="form-label">
          {t("Declaration")} {required}
        </Label>
        <Controller
          name="declaration_text"
          control={control}
          render={({ field }) => (
            <Input
              type="textarea"
              rows="2"
              disabled={isLocked}
              {...field}
              value={field.value || ""}
            />
          )}
        />
        <small className="text-muted">
          {t("Pre-filled from Company Profile default; editable here.")}
        </small>
      </Col>

      {/* ── Bank account ──────────────────────────────────────────── */}
      <Col md="12">
        <h5 className="mt-2 mb-2">{t("Beneficiary Bank Account")}</h5>
      </Col>

      <Col md="12" className="mb-2">
        <Label className="form-label">
          {t("Bank Account")} {required}
        </Label>
        <Controller
          name="bank_account_id"
          control={control}
          render={({ field }) => {
            const activeBanks = allBankAccounts.filter(
              (b) => !b.soft_delete && b.is_active !== false
            );
            const opts = activeBanks.map((b) => ({
              value: b._id,
              label: [
                b.bank_name,
                b.account_number ? `A/C ${b.account_number}` : null,
                b.currency_code,
                b.is_default ? "(default)" : null,
              ]
                .filter(Boolean)
                .join(" · "),
              raw: b,
            }));
            return (
              <Select
                classNamePrefix="select"
                isClearable
                isDisabled={isLocked || !activeBanks.length}
                options={opts}
                value={opts.find((o) => o.value === field.value) || null}
                onChange={(opt) => field.onChange(opt ? opt.value : "")}
                placeholder={
                  activeBanks.length
                    ? t("Select bank account")
                    : t("No bank accounts on file")
                }
              />
            );
          }}
        />
        {!allBankAccounts.length && (
          <small className="text-warning d-block mt-1">
            {t(
              "No bank accounts on file. Add at least one in Company Profile → Bank Accounts."
            )}
          </small>
        )}
        {errors.bank_account_id && (
          <FormFeedback className="d-block">
            {errors.bank_account_id.message}
          </FormFeedback>
        )}
      </Col>
    </Row>
  );
};

export default StepShipping;
