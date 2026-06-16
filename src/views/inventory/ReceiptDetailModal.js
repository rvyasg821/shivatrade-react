// Receipt detail modal — 3 stacked sections (Product · Receipt · Doc Chain).
// Read-only. Opens via the listing's `?receipt=<pov_line_id>` URL param.
// A since-cancelled receipt 404s on fetch → we show a "no longer valid"
// notice instead of stale data.

import { Fragment, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Spinner,
  Badge,
} from "reactstrap";
import { ExternalLink, AlertTriangle } from "react-feather";
import { useTranslation } from "react-i18next";

import { getReceiptDetail, clearReceiptDetail } from "./store";
import { appsRoot } from "@constant/defaultValues";
import { PFI_RETIRED } from "@src/configs/appMode";
import { formatDate } from "@src/utility/dateFormat";
import { getCurrencySymbol } from "@src/utility/currency";

// Trim trailing zeros on a qty string.
const fmtQty = (v) => {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const fmtMoney = (v, code) => {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return `${getCurrencySymbol(code) || ""}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// One key/value row. `value` may be a node (for links) or text.
const Row = ({ label, value, valueClassName = "" }) => (
  <div className="d-flex justify-content-between align-items-start py-50 border-bottom">
    <span className="text-muted me-2">{label}</span>
    <span className={`text-end fw-medium ${valueClassName}`}>
      {value === null || value === undefined || value === "" ? "—" : value}
    </span>
  </div>
);

// "[open ↗]" link to an existing detail page, opens in a new tab.
const OpenLink = ({ to, label }) =>
  to ? (
    <Link
      to={to}
      target="_blank"
      rel="noreferrer"
      className="d-inline-flex align-items-center"
    >
      {label || "-"}
      <ExternalLink size={12} className="ms-50" />
    </Link>
  ) : (
    <span>{label || "—"}</span>
  );

const SectionTitle = ({ children }) => (
  <h6 className="fw-bolder text-uppercase text-muted mb-1 mt-1">{children}</h6>
);

const ReceiptDetailModal = ({ isOpen, povLineId, toggle }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.inventory);
  const data = store?.receiptItem;
  const loading = store?.receiptLoading;
  const error = store?.receiptError;

  useEffect(() => {
    if (isOpen && povLineId) {
      dispatch(getReceiptDetail(povLineId));
    }
    if (!isOpen) {
      dispatch(clearReceiptDetail());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, povLineId]);

  const product = data?.product || {};
  const receipt = data?.receipt || {};
  const chain = data?.chain || {};
  const ccy = receipt?.currency_code;

  const hasShort = receipt?.short_qty && Number(receipt.short_qty) > 0;

  return (
    <Modal
      isOpen={isOpen}
      toggle={toggle}
      size="lg"
      centered
      scrollable
      backdrop="static"
    >
      <ModalHeader toggle={toggle}>
        {t("Receipt Details")}
        {product?.name ? ` — ${product.name}` : ""}
      </ModalHeader>
      <ModalBody>
        {loading ? (
          <div className="text-center py-4">
            <Spinner />
          </div>
        ) : error ? (
          <div className="alert alert-warning d-flex align-items-center gap-1 mb-0">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        ) : data ? (
          <Fragment>
            {/* ── Section 1 — Product ── */}
            <SectionTitle>{t("Product")}</SectionTitle>
            <Row label={t("Product Code")} value={product.code} />
            <Row label={t("Product Name")} value={product.name} />
            <Row label={t("Category")} value={product.category_name} />
            <Row label={t("UOM")} value={product.uom} />
            <Row label={t("HSN Code")} value={product.hsn_code} />

            {/* ── Section 2 — Receipt Details (POV) ── */}
            <SectionTitle>{t("Receipt Details")}</SectionTitle>
            <Row
              label={t("POV #")}
              value={
                <OpenLink
                  to={
                    receipt.pov_id
                      ? `${appsRoot}/po-vendors/view/${receipt.pov_id}`
                      : null
                  }
                  label={receipt.pov_voucher_no}
                />
              }
            />
            <Row
              label={t("Status")}
              value={
                <Badge color="light-success" className="text-capitalize">
                  {receipt.status || "-"}
                </Badge>
              }
            />
            <Row
              label={t("Dispatch Date")}
              value={
                receipt.dispatch_date ? formatDate(receipt.dispatch_date) : null
              }
            />
            <Row
              label={t("Arrival Date")}
              value={
                receipt.actual_arrival_date
                  ? formatDate(receipt.actual_arrival_date)
                  : null
              }
            />
            <Row label={t("Vendor")} value={receipt.vendor_name} />
            <Row label={t("Transporter")} value={receipt.transporter_name} />
            <Row
              label={t("Vehicle / LR #")}
              value={
                [receipt.vehicle_no, receipt.lr_no].filter(Boolean).join(" / ") ||
                null
              }
            />
            <Row
              label={t("Ordered Qty")}
              value={`${fmtQty(receipt.ordered_qty)}${
                product.uom ? ` ${product.uom}` : ""
              }`}
            />
            <Row
              label={t("Dispatched Qty")}
              value={`${fmtQty(receipt.dispatched_qty)}${
                product.uom ? ` ${product.uom}` : ""
              }`}
            />
            <Row
              label={t("Received Qty")}
              value={`${fmtQty(receipt.received_qty)}${
                product.uom ? ` ${product.uom}` : ""
              }`}
            />
            <Row
              label={t("Accepted Qty (in stock)")}
              valueClassName="text-success fw-bolder"
              value={`${fmtQty(receipt.accepted_qty)}${
                product.uom ? ` ${product.uom}` : ""
              }`}
            />
            {Number(receipt.rejected_qty) > 0 ? (
              <Row
                label={t("Rejected Qty")}
                valueClassName="text-danger fw-bolder"
                value={`${fmtQty(receipt.rejected_qty)}${
                  product.uom ? ` ${product.uom}` : ""
                }`}
              />
            ) : null}
            {hasShort ? (
              <Row
                label={t("Short Qty")}
                valueClassName="text-warning fw-bolder"
                value={`${fmtQty(receipt.short_qty)}${
                  product.uom ? ` ${product.uom}` : ""
                }`}
              />
            ) : null}
            {hasShort && receipt.short_reason ? (
              <Row
                label={t("Short Reason")}
                valueClassName="text-warning"
                value={receipt.short_reason}
              />
            ) : null}
            <Row
              label={t("Unit Price")}
              value={fmtMoney(receipt.unit_price, ccy)}
            />
            <Row
              label={t("Line Total")}
              value={fmtMoney(receipt.line_total, ccy)}
            />

            {/* ── Section 3 — Document Chain ── */}
            <SectionTitle>{t("Document Chain")}</SectionTitle>
            <Row
              label={t("PO #")}
              value={
                <OpenLink
                  to={
                    chain.po_id
                      ? `${appsRoot}/purchase-orders/view/${chain.po_id}`
                      : null
                  }
                  label={chain.po_voucher_no}
                />
              }
            />
            {chain.customer_name ? (
              <Row label={t("Customer")} value={chain.customer_name} />
            ) : null}
            {chain.po_currency_code ? (
              <Row
                label={t("Currency")}
                value={`${chain.po_currency_code}${
                  chain.po_exchange_rate
                    ? ` (${t("rate")} ${chain.po_exchange_rate})`
                    : ""
                }`}
              />
            ) : null}
            {chain.delivery_address ? (
              <Row label={t("Delivery")} value={chain.delivery_address} />
            ) : null}
            {!PFI_RETIRED && (
              <Row
                label={t("PFI #")}
                value={
                  <OpenLink
                    to={
                      chain.pfi_id
                        ? `${appsRoot}/pfi/view/${chain.pfi_id}`
                        : null
                    }
                    label={chain.pfi_voucher_no}
                  />
                }
              />
            )}
            <Row
              label={t("Quotation #")}
              value={
                <OpenLink
                  to={
                    chain.quotation_id
                      ? `${appsRoot}/quotations/view/${chain.quotation_id}`
                      : null
                  }
                  label={chain.quotation_voucher_no}
                />
              }
            />
            {chain.lead_id ? (
              <Row
                label={t("Source Lead")}
                value={
                  <OpenLink
                    to={`${appsRoot}/leads/view/${chain.lead_id}`}
                    label={chain.lead_name || t("View Lead")}
                  />
                }
              />
            ) : null}
          </Fragment>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={toggle}>
          {t("Close")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ReceiptDetailModal;
