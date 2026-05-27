// ── Step: Shipping & Packing (PFI) ───────────────────────────────────
// Header-level export-document fields needed for the PFI / Commercial
// Invoice document chain: consignee, ports, mode, packing, declaration,
// bank account. Line-level weights / package counts are entered in the
// Line Items step and roll up here as read-only auto-sums.

import { useEffect, useState } from "react";
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
import PortSelect from "@src/views/_shared/port-master/PortSelect";

const required = <span className="text-danger">*</span>;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const StepShipping = ({
  isLocked,
  bankAccountsForCurrency = [],
  allBankAccounts = [],
  customerOptions = [],
  prefillConsigneeFromCustomer,
}) => {
  const { t } = useTranslation();
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext();

  // Radio toggle — derived from whether consignee_id is set; operator
  // can flip independently to switch between "pick customer" and "type
  // freely" modes.
  const liveConsigneeId = useWatch({ control, name: "consignee_id" });
  const consigneeSnap =
    useWatch({ control, name: "consignee_snapshot" }) || {};
  const [consigneeFromCustomer, setConsigneeFromCustomer] = useState(
    !!liveConsigneeId,
  );
  // Sync radio with form when consignee_id changes externally (e.g.
  // edit-mode hydration).
  useEffect(() => {
    if (liveConsigneeId) setConsigneeFromCustomer(true);
  }, [liveConsigneeId]);

  // Watch mode_of_shipment so the PortSelect can restrict the type filter.
  // sea → sea/icd/sez; air → air/icd. Default (unset) → all loading types.
  const mode = useWatch({ control, name: "mode_of_shipment" }) || "";
  const loadingTypes =
    mode === "sea"
      ? ["sea", "icd", "sez"]
      : mode === "air"
      ? ["air", "icd"]
      : ["sea", "air", "icd", "sez"];

  // Read current snapshot values so PortSelect can display the existing pick
  // when editing an existing PFI (or after the wizard re-mounts).
  const portOfLoadingSnapshot = useWatch({
    control,
    name: "port_of_loading_snapshot",
  });

  // Live auto-sums from lines (Phase 2 adds the per-line fields; until then
  // these resolve to 0 which is fine).
  const lines = useWatch({ control, name: "lines" }) || [];
  const containerUsed = useWatch({ control, name: "container_used" });
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
      {/* ── Consignee (Ship-to) — hybrid: radio + customer picker + fields */}
      <Col md="12">
        <h5 className="mt-1 mb-1">{t("Consignee (Ship-to)")}</h5>
      </Col>
      <Col md="12" className="mb-1">
        <div className="d-flex align-items-center flex-wrap gap-2">
          <Label className="form-label mb-0 me-1">
            {t("From Customer?")}
          </Label>
          <div className="form-check form-check-inline mb-0">
            <Input
              type="radio"
              id="pfi-consignee-from-yes"
              name="pfi-consignee-from"
              checked={consigneeFromCustomer}
              onChange={() => setConsigneeFromCustomer(true)}
              disabled={isLocked}
            />
            <Label
              className="form-check-label"
              for="pfi-consignee-from-yes"
            >
              {t("Yes")}
            </Label>
          </div>
          <div className="form-check form-check-inline mb-0">
            <Input
              type="radio"
              id="pfi-consignee-from-no"
              name="pfi-consignee-from"
              checked={!consigneeFromCustomer}
              onChange={() => {
                setConsigneeFromCustomer(false);
                setValue("consignee_id", "");
              }}
              disabled={isLocked}
            />
            <Label
              className="form-check-label"
              for="pfi-consignee-from-no"
            >
              {t("No")}
            </Label>
          </div>
        </div>
      </Col>

      {consigneeFromCustomer && (
        <Col md="12" className="mb-2">
          <Label className="form-label">{t("Pick Customer")}</Label>
          <Controller
            name="consignee_id"
            control={control}
            render={({ field }) => (
              <Select
                classNamePrefix="select"
                isClearable
                isDisabled={isLocked}
                options={customerOptions}
                value={(() => {
                  const id = field.value;
                  if (!id) return null;
                  const m = customerOptions.find((o) => o.value === id);
                  if (m) return m;
                  return {
                    value: id,
                    label: consigneeSnap.name || t("(customer)"),
                  };
                })()}
                onChange={(opt) => {
                  const v = opt ? opt.value : "";
                  field.onChange(v);
                  if (v && prefillConsigneeFromCustomer) {
                    prefillConsigneeFromCustomer(v);
                  } else if (!v) {
                    setValue("consignee_snapshot", {
                      name: "",
                      address_line1: "",
                      address_line2: "",
                      city: "",
                      state: "",
                      postcode: "",
                      country: "",
                    });
                  }
                }}
                placeholder={t("Search & select customer")}
              />
            )}
          />
        </Col>
      )}

      <Col md="6" className="mb-2">
        <Label className="form-label">{t("Name")}</Label>
        <Controller
          name="consignee_snapshot.name"
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
        <Label className="form-label">{t("Address Line 1")}</Label>
        <Controller
          name="consignee_snapshot.address_line1"
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
        <Label className="form-label">{t("Address Line 2")}</Label>
        <Controller
          name="consignee_snapshot.address_line2"
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
        <Label className="form-label">{t("City")}</Label>
        <Controller
          name="consignee_snapshot.city"
          control={control}
          render={({ field }) => (
            <Input
              disabled={isLocked}
              {...field}
              value={field.value || ""}
              maxLength={120}
            />
          )}
        />
      </Col>
      <Col md="4" className="mb-2">
        <Label className="form-label">{t("State")}</Label>
        <Controller
          name="consignee_snapshot.state"
          control={control}
          render={({ field }) => (
            <Input
              disabled={isLocked}
              {...field}
              value={field.value || ""}
              maxLength={120}
            />
          )}
        />
      </Col>
      <Col md="4" className="mb-2">
        <Label className="form-label">{t("Postcode")}</Label>
        <Controller
          name="consignee_snapshot.postcode"
          control={control}
          render={({ field }) => (
            <Input
              disabled={isLocked}
              {...field}
              value={field.value || ""}
              maxLength={30}
            />
          )}
        />
      </Col>
      <Col md="4" className="mb-2">
        <Label className="form-label">{t("Country")}</Label>
        <Controller
          name="consignee_snapshot.country"
          control={control}
          render={({ field }) => (
            <Select
              isDisabled={isLocked}
              isClearable
              options={countryOptions}
              value={
                countryOptions.find((o) => o.value === field.value) || null
              }
              onChange={(opt) => field.onChange(opt ? opt.value : "")}
              placeholder={t("Select country")}
            />
          )}
        />
      </Col>

      {/* ── Shipping ──────────────────────────────────────────────── */}
      <Col md="12">
        <h5 className="mt-2 mb-2">{t("Shipping")}</h5>
      </Col>

      <Col md="4" className="mb-2">
        <Label className="form-label" for="pfi-port-of-loading">
          {t("Port of Loading")} {required}
        </Label>
        <PortSelect
          id="pfi-port-of-loading"
          value={portOfLoadingSnapshot}
          countryCode="IN"
          types={loadingTypes}
          isDisabled={isLocked}
          invalid={!!errors.port_of_loading}
          placeholder={t("Search port by code or name…")}
          onChange={(port) => {
            // Snapshot is the source of truth on PDF / downstream docs.
            // Also write `port_of_loading` (legacy free-text) with the
            // human-readable name so old reads keep working.
            setValue("port_of_loading_id", port?._id || null, {
              shouldDirty: true,
            });
            setValue("port_of_loading_snapshot", port || null, {
              shouldDirty: true,
            });
            setValue("port_of_loading", port?.name || "", {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
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
              invalid={!!errors.port_of_discharge}
              {...field}
              value={field.value || ""}
              maxLength={150}
              onChange={(e) => {
                const v = e.target.value;
                field.onChange(v);
                // Foreign discharge stays free-text Phase 1 (per
                // PORT_MASTER_PLAN §4.2). Snapshot { name } so downstream
                // Invoice / Shipping can read from the same shape.
                setValue(
                  "port_of_discharge_snapshot",
                  v ? { name: v } : null,
                  { shouldDirty: true },
                );
              }}
            />
          )}
        />
        <small className="text-muted">
          {t("Foreign port - free text. Indian discharge can be picked from master later.")}
        </small>
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
        {errors.country_of_origin && (
          <FormFeedback className="d-block">
            {errors.country_of_origin.message}
          </FormFeedback>
        )}
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
        {errors.country_of_final_destination && (
          <FormFeedback className="d-block">
            {errors.country_of_final_destination.message}
          </FormFeedback>
        )}
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
        {errors.mode_of_shipment && (
          <FormFeedback className="d-block">
            {errors.mode_of_shipment.message}
          </FormFeedback>
        )}
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

      {/* ── Container ─────────────────────────────────────────────── */}
      <Col md="12">
        <h5 className="mt-2 mb-2">{t("Container")}</h5>
      </Col>

      <Col md={containerUsed === true ? "2" : "12"} className="mb-2">
        <Label
          className="form-label d-block"
          style={{ whiteSpace: "nowrap" }}
        >
          {t("Container Used?")}
        </Label>
        <Controller
          name="container_used"
          control={control}
          render={({ field }) => (
            <div
              className="d-flex align-items-center"
              style={{ gap: "1.25rem", paddingTop: "0.4rem" }}
            >
              <Label
                className="d-flex align-items-center mb-0"
                for="container_used_yes"
                style={{ gap: "0.4rem", cursor: "pointer" }}
              >
                <Input
                  type="radio"
                  id="container_used_yes"
                  name="container_used"
                  disabled={isLocked}
                  checked={field.value === true}
                  onChange={() => field.onChange(true)}
                  style={{ margin: 0, position: "static" }}
                />
                <span>{t("Yes")}</span>
              </Label>
              <Label
                className="d-flex align-items-center mb-0"
                for="container_used_no"
                style={{ gap: "0.4rem", cursor: "pointer" }}
              >
                <Input
                  type="radio"
                  id="container_used_no"
                  name="container_used"
                  disabled={isLocked}
                  checked={field.value === false}
                  onChange={() => field.onChange(false)}
                  style={{ margin: 0, position: "static" }}
                />
                <span>{t("No")}</span>
              </Label>
            </div>
          )}
        />
      </Col>

      {containerUsed === true && (
        <>
          <Col md="5" className="mb-2">
            <Label className="form-label">{t("Container Qty × Size")}</Label>
            <Controller
              name="container_details"
              control={control}
              render={({ field }) => (
                <Input
                  placeholder="e.g. 1×20' or 2×40'HC"
                  disabled={isLocked}
                  {...field}
                  value={field.value || ""}
                  maxLength={200}
                />
              )}
            />
          </Col>
          <Col md="5" className="mb-2">
            <Label className="form-label">{t("Load Type")}</Label>
            <Controller
              name="container_load_type"
              control={control}
              render={({ field }) => {
                const opts = [
                  { value: "FCL", label: "FCL (Full Container Load)" },
                  { value: "LCL", label: "LCL (Less than Container Load)" },
                ];
                return (
                  <Select
                    classNamePrefix="select"
                    isClearable
                    isDisabled={isLocked}
                    options={opts}
                    value={opts.find((o) => o.value === field.value) || null}
                    onChange={(opt) => field.onChange(opt ? opt.value : "")}
                  />
                );
              }}
            />
          </Col>

          <Col md="6" className="mb-2">
            <Label className="form-label">{t("Container No.")}</Label>
            <Controller
              name="container_no"
              control={control}
              render={({ field }) => (
                <Input
                  placeholder="e.g. MSCU1234567"
                  disabled={isLocked}
                  {...field}
                  value={field.value || ""}
                  maxLength={50}
                />
              )}
            />
          </Col>
          <Col md="6" className="mb-2">
            <Label className="form-label">{t("Seal No.")}</Label>
            <Controller
              name="seal_no"
              control={control}
              render={({ field }) => (
                <Input
                  placeholder="e.g. SL0098234"
                  disabled={isLocked}
                  {...field}
                  value={field.value || ""}
                  maxLength={50}
                />
              )}
            />
          </Col>
        </>
      )}

      {/* ── Packing ───────────────────────────────────────────────── */}
      <Col md="12">
        <h5 className="mt-2 mb-2">{t("Packing")}</h5>
      </Col>

      {/* Row 1: Packing Type · Packing Marks · Validity */}
      <Col md="4" className="mb-2">
        <Label className="form-label">
          {t("Packing Type")} {required}
        </Label>
        <Controller
          name="packing_type"
          control={control}
          render={({ field }) => {
            const arr = Array.isArray(field.value)
              ? field.value
              : field.value
                ? String(field.value)
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                : [];
            return (
              <Select
                isMulti
                classNamePrefix="select"
                isClearable
                isDisabled={isLocked}
                options={PACKING_TYPE_OPTIONS}
                value={arr.map(
                  (v) =>
                    PACKING_TYPE_OPTIONS.find((o) => o.value === v) || {
                      value: v,
                      label: v,
                    },
                )}
                onChange={(opts) =>
                  field.onChange((opts || []).map((o) => o.value))
                }
                placeholder={t("Select one or more")}
              />
            );
          }}
        />
        {errors.packing_type && (
          <FormFeedback className="d-block">
            {errors.packing_type.message}
          </FormFeedback>
        )}
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

      {/* Row 2: Net Wt · Gross Wt · Total Packages (auto-sums) */}
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


      {/* Payment Terms (export wording) + Payment & Declaration section
          heading removed — payment_terms (Step 1) is the SoT. Only the
          Declaration field remains here. */}
      <Col md="12" className="mb-2">
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
              invalid={!!errors.declaration_text}
              {...field}
              value={field.value || ""}
            />
          )}
        />
        {errors.declaration_text && (
          <FormFeedback className="d-block">
            {errors.declaration_text.message}
          </FormFeedback>
        )}
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
