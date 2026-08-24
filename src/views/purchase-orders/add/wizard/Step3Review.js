// ── Step 3: Review & Save (PO) ──────────────────────────────────────
// Reuses PFI's review building blocks: SalesDocLineItems in compact
// read-only mode for the line items table and SalesDocCostingCard for
// the breakdown. The Notes + Status form sits on the left.

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useMemo, useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { Row, Col, Label, Input } from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";

import DateInput from "@components/date-input";
import { PURCHASE_ORDER_STATUS_OPTIONS } from "@constant/options";
import { computeDocTotals } from "@src/views/_shared/sales-doc/_helpers";
import SalesDocCostingCard from "@src/views/_shared/sales-doc/SalesDocCostingCard";
import CustomerCostingTable from "@src/views/_shared/sales-doc/CustomerCostingTable";

// Allowed next statuses per the server-side transition matrix. The current
// status is always kept selectable so an unchanged save is valid; only legal
// forward/revert jumps are offered.
const STATUS_TRANSITIONS = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["in_process", "cancelled", "draft"],
  in_process: ["completed", "cancelled", "draft"],
  completed: ["draft"],
  cancelled: ["draft"],
};

const Step3Review = ({ isLocked, productOptions = [] }) => {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const lines = useWatch({ control, name: "lines" }) || [];
  const currencyCode = useWatch({ control, name: "currency_code" }) || "INR";
  const vendorCurrencyCode = useWatch({ control, name: "vendor_currency_code" });
  const exchangeRate = useWatch({ control, name: "exchange_rate" });
  const rate = Number(exchangeRate) || 1;
  const freightTotal = useWatch({ control, name: "freight_total" });
  const totals = computeDocTotals(lines, rate, {
    excludeGst: true,
    freightTotal,
  });
  const currentStatus = useWatch({ control, name: "status" }) || "draft";
  const advanceExchangeRateField = useWatch({
    control,
    name: "advance_exchange_rate",
  });

  // Receipt-time rate, entered human-readable as "1 {CUR} = ₹___"
  // (₹-per-foreign) — same field/convention as the Invoice Record Payment
  // form. Seeds ONCE from the loaded/stored advance_exchange_rate (edit) or
  // this order's own header rate (new SO — same-rate default, 0 forex
  // gain/loss once an invoice seeds from it), then the operator can edit it;
  // kept converted back to foreign-per-₹1 live in RHF state via
  // field.onChange below (no separate submit-time conversion needed).
  const [advRateInr, setAdvRateInr] = useState("");
  const advRateSeeded = useRef(false);
  useEffect(() => {
    if (advRateSeeded.current) return;
    const stored = Number(advanceExchangeRateField);
    const base = stored > 0 && stored !== 1 ? stored : rate;
    const rateInr = base > 0 ? 1 / base : 1;
    setAdvRateInr(Number(rateInr.toFixed(2)).toString());
    advRateSeeded.current = true;
  }, [advanceExchangeRateField, rate]);

  // "Received in bank" options — active company bank accounts, preferring those
  // in the order currency (else all). Feeds the advance section below.
  const bankAccounts = useSelector(
    (s) => s.company?.companyItem?.bank_accounts || []
  );
  const bankOptions = useMemo(() => {
    const active = bankAccounts.filter(
      (b) => !b.soft_delete && b.is_active !== false
    );
    const cc = (currencyCode || "").toUpperCase();
    const matching = active.filter(
      (b) => (b.currency_code || "").toUpperCase() === cc
    );
    return (matching.length ? matching : active).map((b) => ({
      value: b._id,
      label: `${b.bank_name} — ${b.account_number}${
        b.currency_code ? ` · ${b.currency_code}` : ""
      }`,
    }));
  }, [bankAccounts, currencyCode]);

  // Current status + only its legal next statuses (matches the BE matrix).
  const allowedStatuses = [
    currentStatus,
    ...(STATUS_TRANSITIONS[currentStatus] || []),
  ];
  const statusOptions = PURCHASE_ORDER_STATUS_OPTIONS.filter((o) =>
    allowedStatuses.includes(o.value)
  );

  return (
    <Row>
      <Col md="8">
        {/* Read-only customer-facing line items — the SAME shared table the
            Quotation review uses (Part No / HSN / Rate / Amount + Grand Total
            + pagination), so the two documents match exactly. */}
        <CustomerCostingTable
          lines={lines}
          productOptions={productOptions}
          exchangeRate={rate}
          docCurrencyCode={currencyCode}
          baseCurrencyCode="INR"
          showHsn
        />

        <Row className="mt-3">
          <Col md="12" className="mb-2">
            <Label className="form-label">{t("Internal Notes")}</Label>
            <Controller
              name="internal_notes"
              control={control}
              render={({ field }) => (
                <Input
                  type="textarea"
                  rows="3"
                  placeholder={t(
                    "Hidden from PDF. Editable even when status is locked."
                  )}
                  {...field}
                  value={field.value || ""}
                />
              )}
            />
          </Col>
        </Row>

        <Row>
          <Col md="12" className="mb-2">
            <Label className="form-label">
              {t("Remarks (Sales Order PDF)")}
            </Label>
            <Controller
              name="remarks"
              control={control}
              render={({ field }) => (
                <Input
                  type="textarea"
                  rows="4"
                  placeholder={t(
                    "Prints in the Remarks block on the SO PDF. Pre-filled from the company default; edit as needed."
                  )}
                  disabled={isLocked}
                  {...field}
                  value={field.value || ""}
                />
              )}
            />
          </Col>
        </Row>

        {/* ── Advance / down-payment received against this order ── */}
        <Row>
          <Col md="12" className="mb-1">
            <Label className="form-label fw-semibold mb-0">
              {t("Advance Payment")}
            </Label>
          </Col>
          <Col md="3" className="mb-2">
            <Label className="form-label">
              {t("Advance Amount")}
              {currencyCode ? ` (${currencyCode})` : ""}
            </Label>
            <Controller
              name="advance_amount"
              control={control}
              render={({ field }) => (
                <Input
                  id="advance_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  disabled={isLocked}
                  {...field}
                  value={field.value || ""}
                />
              )}
            />
          </Col>
          <Col md="3" className="mb-2">
            <Label className="form-label">{t("Advance Date")}</Label>
            <Controller
              name="advance_date"
              control={control}
              render={({ field }) => (
                <DateInput
                  id="advance_date"
                  value={field.value || ""}
                  disabled={isLocked}
                  onChange={(_d, _s, iso) => field.onChange(iso || "")}
                />
              )}
            />
          </Col>
          {currencyCode && currencyCode.toUpperCase() !== "INR" && (
            <Col md="3" className="mb-2">
              <Label className="form-label">
                {t("Exchange rate at receipt")}
              </Label>
              <Controller
                name="advance_exchange_rate"
                control={control}
                render={({ field }) => (
                  <div className="d-flex align-items-center">
                    <span className="me-1 text-nowrap">
                      1 {currencyCode} = ₹
                    </span>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      disabled={isLocked}
                      value={advRateInr}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAdvRateInr(v);
                        const n = Number(v);
                        field.onChange(n > 0 ? String(1 / n) : "");
                      }}
                    />
                  </div>
                )}
              />
            </Col>
          )}
          <Col md="3" className="mb-2">
            <Label className="form-label">{t("Received in Bank")}</Label>
            <Controller
              name="advance_bank_account_id"
              control={control}
              render={({ field }) => (
                <Select
                  classNamePrefix="select"
                  isClearable
                  isDisabled={isLocked}
                  options={bankOptions}
                  value={
                    bankOptions.find((o) => o.value === field.value) || null
                  }
                  onChange={(opt) => field.onChange(opt ? opt.value : "")}
                  placeholder={t("Select bank account")}
                  noOptionsMessage={() => t("No bank accounts")}
                  menuPlacement="auto"
                  menuPosition="fixed"
                  menuPortalTarget={
                    typeof document !== "undefined" ? document.body : undefined
                  }
                  styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                />
              )}
            />
          </Col>
          <Col md="3" className="mb-2">
            <Label className="form-label">{t("Advance Notes")}</Label>
            <Controller
              name="advance_notes"
              control={control}
              render={({ field }) => (
                <Input
                  id="advance_notes"
                  placeholder={t("e.g. 30% advance via NEFT")}
                  maxLength={200}
                  disabled={isLocked}
                  {...field}
                  value={field.value || ""}
                />
              )}
            />
          </Col>
        </Row>

        <Row>
          <Col md="6" className="mb-2" style={{ maxWidth: 320 }}>
            <Label className="form-label">{t("Status")}</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select
                  classNamePrefix="select"
                  options={statusOptions}
                  value={
                    PURCHASE_ORDER_STATUS_OPTIONS.find(
                      (o) => o.value === field.value
                    ) || PURCHASE_ORDER_STATUS_OPTIONS[0]
                  }
                  onChange={(opt) =>
                    field.onChange(opt ? opt.value : "draft")
                  }
                  menuPlacement="auto"
                  menuPosition="fixed"
                  maxMenuHeight={180}
                  menuPortalTarget={
                    typeof document !== "undefined" ? document.body : undefined
                  }
                  styles={{
                    menuPortal: (b) => ({ ...b, zIndex: 9999 }),
                  }}
                />
              )}
            />
          </Col>
        </Row>
      </Col>

      <Col md="4">
        <SalesDocCostingCard
          totals={totals}
          currencyCode={currencyCode}
          vendorCurrencyCode={vendorCurrencyCode}
          hideGst
        />
      </Col>
    </Row>
  );
};

export default Step3Review;
