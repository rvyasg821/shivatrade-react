import { Fragment, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Card,
  CardBody,
  Badge,
  Button,
  UncontrolledTooltip,
} from "reactstrap";
import {
  Hash,
  User,
  Calendar,
  FileText,
  Edit,
  ExternalLink,
  Download,
  Truck,
} from "react-feather";
import { useTranslation } from "react-i18next";

import { appsRoot, isAdminUser } from "@constant/defaultValues";
import { PURCHASE_ORDER_STATUS_BADGE_COLOR } from "@constant/options";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";

const InfoRow = ({ icon: Icon, value }) => {
  if (!value) return null;
  return (
    <li className="d-flex align-items-start mb-50">
      <Icon size={14} className="me-50 mt-25 text-muted flex-shrink-0" />
      <span
        className="flex-grow-1 text-break small"
        style={{ minWidth: 0, overflowWrap: "anywhere" }}
      >
        {value}
      </span>
    </li>
  );
};

const SectionLabel = ({ children }) => (
  <div
    className="text-muted text-uppercase fw-bold mb-50"
    style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}
  >
    {children}
  </div>
);

const fmt = (v) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString();

const PurchaseOrderInfoCard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { purchaseOrderItem } = useSelector((s) => s.purchaseOrder);
  const p = purchaseOrderItem || {};

  const authUserItem = useSelector((s) => s.auth?.authUserItem);
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.["purchase-orders"];
  const canEdit = isAdmin || perms?.can_all || perms?.can_update;

  const statusColor =
    PURCHASE_ORDER_STATUS_BADGE_COLOR[(p?.status || "").toLowerCase()] ||
    "secondary";

  const statusLabel = (p?.status || "-").replace(/_/g, " ");

  const [downloading, setDownloading] = useState(false);
  const onDownloadPdf = async () => {
    if (!id || downloading) return;
    setDownloading(true);
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.purchaseOrders.pdf}/${id}/pdf`,
        { responseType: "blob" }
      );
      const cd = resp.headers?.["content-disposition"] || "";
      const m = cd.match(/filename="?([^"]+)"?/);
      const filename = m?.[1] || `${p?.voucher_no || "purchase-order"}.pdf`;
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      Notification(
        "Error",
        err?.response?.data?.message || t("Could not download PDF"),
        "warning"
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Fragment>
      <Card>
        <CardBody>
          {/* Hero */}
          <div className="d-flex flex-column align-items-center text-center mt-2 mb-2">
            <div
              className={`d-flex align-items-center justify-content-center rounded mb-1 bg-light-${statusColor}`}
              style={{ width: 88, height: 88 }}
            >
              <FileText
                size={44}
                className={`text-${statusColor}`}
                strokeWidth={1.5}
              />
            </div>
            <h4 className="text-break mb-25">{p?.voucher_no || "-"}</h4>
            <Badge
              color={`light-${statusColor}`}
              className={`badge-light-${statusColor} text-capitalize`}
            >
              {statusLabel}
            </Badge>
          </div>

          {/* Grand total */}
          {p?.grand_total !== undefined && p?.grand_total !== null && (
            <div className="text-center py-1 my-1 border-top border-bottom">
              <SectionLabel>{t("Grand Total")}</SectionLabel>
              <div className="fw-bolder" style={{ fontSize: "1.5rem" }}>
                {p?.currency_symbol || "₹"} {fmt(p.grand_total)}
              </div>
              <small className="text-muted">{p?.currency_code || "INR"}</small>
            </div>
          )}

          {/* Vendor & Dates — PO is multi-vendor at line level. List
              every unique vendor across the line items. */}
          <SectionLabel>{t("Vendor & Dates")}</SectionLabel>
          <ul className="list-unstyled mb-1">
            {(() => {
              const seen = new Set();
              const list = [];
              for (const ln of p?.lines || []) {
                const vid = ln?.vendor_id;
                if (!vid || seen.has(vid)) continue;
                seen.add(vid);
                list.push(ln?.vendor_name || vid);
              }
              if (list.length === 0 && p?.vendor_name) {
                list.push(p.vendor_name);
              }
              if (list.length === 0) {
                return <InfoRow icon={User} value="-" />;
              }
              return list.map((name, idx) => (
                <InfoRow
                  key={`vendor-${idx}`}
                  icon={idx === 0 ? User : undefined}
                  value={name}
                />
              ));
            })()}
            <InfoRow
              icon={Calendar}
              value={
                p?.po_date
                  ? `${(p.po_date || "").slice(0, 10)}${
                      p?.expected_delivery_date
                        ? ` → ${p.expected_delivery_date.slice(0, 10)}`
                        : ""
                    }`
                  : null
              }
            />
            <InfoRow icon={Truck} value={p?.delivery_address} />
          </ul>

          {/* References */}
          {(p?.pfi_id || p?.quotation_id || p?._id) && (
            <Fragment>
              <SectionLabel>{t("References")}</SectionLabel>
              <ul className="list-unstyled mb-2">
                {p?.pfi_id && (
                  <InfoRow
                    icon={FileText}
                    value={
                      <span className="d-inline-flex align-items-center">
                        {t("Source PFI")}
                        {p?.pfi_voucher_no ? ` · ${p.pfi_voucher_no}` : ""}
                        <a
                          href={`${appsRoot}/pfi/view/${p.pfi_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t("Open PFI in new tab")}
                          className="text-decoration-none ms-1"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </span>
                    }
                  />
                )}
                {p?.quotation_id && (
                  <InfoRow
                    icon={FileText}
                    value={
                      <span className="d-inline-flex align-items-center">
                        {t("Source Quotation")}
                        {p?.quotation_voucher_no
                          ? ` · ${p.quotation_voucher_no}`
                          : ""}
                        <a
                          href={`${appsRoot}/quotations/view/${p.quotation_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t("Open Quotation in new tab")}
                          className="text-decoration-none ms-1"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </span>
                    }
                  />
                )}
                {p?.customer_name && (
                  <InfoRow
                    icon={User}
                    value={
                      <span className="d-inline-flex align-items-center">
                        {t("Customer")} · {p.customer_name}
                        {p?.customer_id && (
                          <a
                            href={`${appsRoot}/customers/view/${p.customer_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={t("Open customer in new tab")}
                            className="text-decoration-none ms-1"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </span>
                    }
                  />
                )}
                <InfoRow
                  icon={Hash}
                  value={p?._id ? `#${p._id.slice(-6)}` : null}
                />
              </ul>
            </Fragment>
          )}

          {/* Actions */}
          <div className="d-grid gap-1 mt-2">
            <Button
              color="primary"
              onClick={onDownloadPdf}
              disabled={downloading}
              id="po-pdf-from-view"
            >
              <Download size={14} className="me-50" />
              {downloading ? t("Generating…") : t("Download PDF")}
            </Button>
            <UncontrolledTooltip target="po-pdf-from-view" placement="top">
              {t("Download PO as PDF")}
            </UncontrolledTooltip>
            {canEdit && (
              <>
                <Button
                  color="primary"
                  outline
                  onClick={() => navigate(`${appsRoot}/purchase-orders/edit/${id}`)}
                  id="po-edit-from-view"
                >
                  <Edit size={14} className="me-50" /> {t("Edit")}
                </Button>
                <UncontrolledTooltip target="po-edit-from-view" placement="top">
                  {t("Edit PO")}
                </UncontrolledTooltip>
              </>
            )}
          </div>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default PurchaseOrderInfoCard;
