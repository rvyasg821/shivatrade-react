// ── Step 3: Review & Save (PO) ──────────────────────────────────────
// Reuses PFI's review building blocks: SalesDocLineItems in compact
// read-only mode for the line items table and SalesDocCostingCard for
// the breakdown. The Notes + Status form sits on the left.

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Row, Col, Label, Input } from "reactstrap";
import Select from "react-select";
import { useTranslation } from "react-i18next";

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
  const exchangeRate = useWatch({ control, name: "exchange_rate" });
  const rate = Number(exchangeRate) || 1;
  const freightTotal = useWatch({ control, name: "freight_total" });
  const totals = computeDocTotals(lines, rate, {
    excludeGst: true,
    freightTotal,
  });
  const currentStatus = useWatch({ control, name: "status" }) || "draft";

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
        <SalesDocCostingCard totals={totals} currencyCode={currencyCode} hideGst />
      </Col>
    </Row>
  );
};

export default Step3Review;
