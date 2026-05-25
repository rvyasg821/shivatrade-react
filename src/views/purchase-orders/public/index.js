// ── Purchase Order preview view ──────────────────────────────────────
// Admin-only "preview as client" — same simple, professional layout as
// the quotation / PFI previews. PO is vendor-facing; the projection
// matches `mapGet` since there is no margin / costing to sanitize.
// Reachable at /apps/purchase-orders/preview/:id.

import { Fragment, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Table, Spinner, Button } from "reactstrap";
import { Download, Printer, AlertTriangle } from "react-feather";
import { useTranslation } from "react-i18next";

import {
  getPurchaseOrderPreview,
  getPublicPurchaseOrder,
} from "@src/views/purchase-orders/store";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { formatDate } from "@src/utility/dateFormat";
import appLogo from "@src/assets/images/logo/login-logo.png";

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const fmt2 = (v) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const Label = ({ children }) => (
  <div
    className="text-uppercase fw-bold text-muted mb-1"
    style={{ fontSize: "0.7rem", letterSpacing: "0.6px" }}
  >
    {children}
  </div>
);

const PurchaseOrderPublicView = () => {
  const { id, token } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const store = useSelector((s) => s.purchaseOrder);
  const p = store?.publicItem;
  const loading = !store?.loading;
  const isPreview = !!id;

  useEffect(() => {
    if (token) dispatch(getPublicPurchaseOrder(token));
    else if (id) dispatch(getPurchaseOrderPreview(id));
  }, [token, id, dispatch]);

  const [downloading, setDownloading] = useState(false);
  const onDownloadPdf = async () => {
    if (downloading || (!id && !token)) return;
    setDownloading(true);
    try {
      const url = token
        ? `${API_ENDPOINTS.purchaseOrders.publicPdf}/${token}/pdf`
        : `${API_ENDPOINTS.purchaseOrders.pdf}/${id}/pdf`;
      const resp = await instance.get(url, { responseType: "blob" });
      const cd = resp.headers?.["content-disposition"] || "";
      const m = cd.match(/filename="?([^"]+)"?/);
      const filename = m?.[1] || `${p?.voucher_no || "purchase-order"}.pdf`;
      const blobUrl = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      /* silent */
    } finally {
      setDownloading(false);
    }
  };

  const sym = p?.currency_symbol || p?.currency_code || "";
  const rate = num(p?.exchange_rate) || 1;
  // Line-level amounts are stored in INR; multiply by exchange_rate to
  // present the vendor's customer currency. Header `grand_total` is
  // already persisted in customer currency by the backend recompute, so
  // it must NOT be multiplied again.
  const toCcy = (v) => num(v) * rate;
  const money = (v) => `${sym}${fmt2(toCcy(v))}`;
  const moneyRaw = (v) => `${sym}${fmt2(num(v))}`;

  if (loading && !p) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="text-center py-5">
        <AlertTriangle size={36} className="text-muted mb-2" />
        <h5 className="text-muted">
          {store?.error || t("Purchase Order not found")}
        </h5>
      </div>
    );
  }

  const lines = p?.lines || [];

  return (
    <Fragment>
      <style>{`
        .po-public-wrap {
          background: #f4f5f7;
          min-height: 100vh;
          padding: 32px 16px;
        }
        .po-doc {
          max-width: 960px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
        }
        .po-doc .qd-header {
          padding: 28px 36px 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        .po-doc .qd-title {
          font-size: 1.5rem;
          font-weight: 600;
          letter-spacing: 2px;
          margin: 0;
          color: #1f2937;
        }
        .po-doc .qd-body { padding: 24px 36px; }
        .po-doc .qd-footer {
          padding: 16px 36px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 0.8rem;
          text-align: center;
        }
        .po-doc .party-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 28px;
          margin-bottom: 24px;
        }
        @media (max-width: 768px) {
          .po-doc .party-grid { grid-template-columns: 1fr; gap: 18px; }
          .po-doc .qd-header, .po-doc .qd-body, .po-doc .qd-footer { padding-left: 20px; padding-right: 20px; }
        }
        .po-doc .party-name { font-weight: 600; color: #1f2937; margin-bottom: 6px; }
        .po-doc .party-line { font-size: 0.83rem; color: #4b5563; line-height: 1.5; }
        .po-doc .party-muted { color: #6b7280; }
        .po-doc table.items { width: 100%; margin: 0; }
        .po-doc table.items thead th {
          background: #f9fafb;
          color: #4b5563;
          font-weight: 600;
          font-size: 0.72rem;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          border-bottom: 1px solid #e5e7eb !important;
          border-top: 1px solid #e5e7eb !important;
          padding: 10px;
        }
        .po-doc table.items td {
          vertical-align: top;
          padding: 10px;
          border-bottom: 1px solid #f1f2f4;
          font-size: 0.85rem;
        }
        .po-doc table.items tbody tr:last-child td { border-bottom: 1px solid #e5e7eb; }
        .po-doc .totals { width: 340px; margin-left: auto; margin-top: 18px; }
        .po-doc .totals .row-line {
          display: flex; justify-content: space-between;
          padding: 6px 0; font-size: 0.88rem; color: #4b5563;
        }
        .po-doc .totals .row-grand {
          display: flex; justify-content: space-between;
          padding: 12px 0 4px;
          border-top: 2px solid #1f2937;
          margin-top: 6px;
          font-weight: 700; font-size: 1rem; color: #1f2937;
        }
        .po-doc .section {
          margin-top: 24px; padding-top: 18px;
          border-top: 1px solid #e5e7eb;
        }
        .po-doc .section .body { font-size: 0.85rem; color: #4b5563; line-height: 1.6; white-space: pre-line; }
        .po-doc .banner {
          padding: 8px 14px; border-radius: 4px; font-size: 0.82rem;
          margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
          background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb;
        }
        .po-doc .status-badge {
          background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb;
          padding: 3px 10px; border-radius: 999px;
          font-size: 0.72rem; font-weight: 600;
          text-transform: capitalize; letter-spacing: 0.2px;
        }
        @media print {
          .po-public-wrap { background: #fff; padding: 0; }
          .po-doc { border: none; }
          .po-doc .no-print { display: none !important; }
        }
      `}</style>

      <div className="po-public-wrap">
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          {isPreview && (
            <div className="banner no-print">
              {t(
                "Preview - this is the customer-facing layout of this PO."
              )}
            </div>
          )}

          <div className="d-flex justify-content-end mb-2 no-print gap-2">
            <Button
              color="secondary"
              outline
              size="sm"
              onClick={() => window.print()}
            >
              <Printer size={14} className="me-50" />
              {t("Print")}
            </Button>
            <Button
              color="secondary"
              outline
              size="sm"
              onClick={onDownloadPdf}
              disabled={downloading}
            >
              <Download size={14} className="me-50" />
              {downloading ? t("Generating…") : t("Download PDF")}
            </Button>
          </div>

          <div className="po-doc">
            {/* Header */}
            <div className="qd-header d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <img
                  src={appLogo}
                  alt="Logo"
                  style={{ height: 60, marginBottom: 8 }}
                />
              </div>
              <div className="text-end">
                <h1 className="qd-title">{t("PURCHASE ORDER")}</h1>
                <div className="party-muted" style={{ fontSize: "0.85rem" }}>
                  #{p.voucher_no || "-"}
                </div>
                <span className="status-badge mt-1 d-inline-block">
                  {p.status || "-"}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="qd-body">
              {/* Ship-to / Meta */}
              <div
                className="party-grid"
                style={{ gridTemplateColumns: "1fr 1fr" }}
              >
                <div>
                  <Label>{t("Ship To")}</Label>
                  {p.delivery_address ? (
                    <div
                      className="party-line"
                      style={{ whiteSpace: "pre-line" }}
                    >
                      {p.delivery_address}
                    </div>
                  ) : (
                    <div className="party-line party-muted">-</div>
                  )}
                </div>

                <div>
                  <Label>{t("PO Details")}</Label>
                  <div className="party-line">
                    <span className="party-muted">{t("Date")}: </span>
                    <span className="fw-semibold">
                      {p.po_date ? formatDate(p.po_date) : "-"}
                    </span>
                  </div>
                  {p.expected_delivery_date && (
                    <div className="party-line">
                      <span className="party-muted">{t("Expected")}: </span>
                      <span className="fw-semibold">
                        {formatDate(p.expected_delivery_date)}
                      </span>
                    </div>
                  )}
                  <div className="party-line">
                    <span className="party-muted">{t("Currency")}: </span>
                    <span className="fw-semibold">
                      {sym} {p.currency_code || "-"}
                    </span>
                  </div>
                  {(p.pfi_voucher_no || p.quotation_voucher_no) && (
                    <div className="party-line">
                      <span className="party-muted">
                        {p.pfi_voucher_no ? t("Source PFI") : t("Source Quote")}
                        :{" "}
                      </span>
                      <span className="fw-semibold">
                        {p.pfi_voucher_no || p.quotation_voucher_no}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Line items */}
              <Table className="items">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>{t("Product / Description")}</th>
                    <th className="text-end" style={{ width: 110 }}>
                      {t("Qty")}
                    </th>
                    <th className="text-end" style={{ width: 120 }}>
                      {t("Rate")}
                    </th>
                    <th className="text-end" style={{ width: 140 }}>
                      {t("Amount")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td className="party-muted">{l.seq || i + 1}</td>
                      <td>
                        <div className="fw-semibold">
                          {l.product_name || "-"}
                        </div>
                        {l.product_code && (
                          <div className="small party-muted">
                            {l.product_code}
                          </div>
                        )}
                      </td>
                      <td className="text-end">
                        {l.qty
                          ? `${fmt2(l.qty)}${l.unit ? ` ${l.unit}` : ""}`
                          : "-"}
                      </td>
                      <td className="text-end">
                        {num(l.qty) > 0
                          ? `${sym}${fmt2(toCcy(l.line_total) / num(l.qty))}`
                          : money(l.unit_price)}
                      </td>
                      <td className="text-end fw-semibold">
                        {money(l.line_total)}
                      </td>
                    </tr>
                  ))}
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center party-muted py-3">
                        {t("No line items.")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>

              {/* Totals */}
              <div className="totals">
                <div className="row-grand">
                  <span>{t("Grand Total")}</span>
                  <span>{moneyRaw(p.grand_total)}</span>
                </div>
              </div>

              {/* Terms */}
              {(p.payment_terms || p.delivery_terms) && (
                <div className="section">
                  <Label>{t("Terms")}</Label>
                  {p.payment_terms && (
                    <div className="body">
                      <span className="party-muted">
                        {t("Payment Terms")}:{" "}
                      </span>
                      {p.payment_terms}
                    </div>
                  )}
                  {p.delivery_terms && (
                    <div className="body">
                      <span className="party-muted">
                        {t("Delivery Terms")}:{" "}
                      </span>
                      {p.delivery_terms}
                    </div>
                  )}
                </div>
              )}

              {/* Notes to Vendor */}
              {p.notes_to_vendor && (
                <div className="section">
                  <Label>{t("Notes")}</Label>
                  <div className="body">{p.notes_to_vendor}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="qd-footer">
              {t("This is a computer-generated purchase order.")}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default PurchaseOrderPublicView;
