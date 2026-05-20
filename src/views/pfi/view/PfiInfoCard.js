import { Fragment, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import PoGeneratePreviewModal from "@src/views/_shared/sales-doc/PoGeneratePreviewModal";
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
  Clock,
  Truck,
} from "react-feather";
import { useTranslation } from "react-i18next";

import { appsRoot } from "@constant/defaultValues";
import { QUOTATION_STATUS_BADGE_COLOR } from "@constant/options";
import { fmt } from "@src/views/_shared/sales-doc/_helpers";
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

const PfiInfoCard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { pfiItem } = useSelector((s) => s.pfi);
  const p = pfiItem || {};
  const sym = p?.currency_symbol || p?.currency_code || "";

  const statusColor =
    QUOTATION_STATUS_BADGE_COLOR[(p?.status || "").toLowerCase()] ||
    "secondary";

  const today = new Date().toISOString().slice(0, 10);
  const validUntil = (p?.valid_until || "").slice(0, 10);
  const isExpired = validUntil && validUntil < today;

  const [downloading, setDownloading] = useState(false);
  const [poModalOpen, setPoModalOpen] = useState(false);
  const onDownloadPdf = async () => {
    if (!id || downloading) return;
    setDownloading(true);
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.pfis.pdf}/${id}/pdf`,
        { responseType: "blob" }
      );
      const cd = resp.headers?.["content-disposition"] || "";
      const m = cd.match(/filename="?([^"]+)"?/);
      const filename = m?.[1] || `${p?.voucher_no || "pfi"}.pdf`;
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
          {/* ── Header: document-icon hero ─────────────────────────── */}
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
              {p?.status || "-"}
            </Badge>
          </div>

          {/* ── Hero: grand total ──────────────────────────────────── */}
          {p?.grand_total && (
            <div className="text-center py-1 my-1 border-top border-bottom">
              <SectionLabel>{t("Grand Total")}</SectionLabel>
              <div className="fw-bolder" style={{ fontSize: "1.5rem" }}>
                {sym}
                {fmt(p.grand_total)}
              </div>
              <small className="text-muted">{p?.currency_code || ""}</small>
            </div>
          )}

          {/* ── Customer & Dates ───────────────────────────────────── */}
          <SectionLabel>{t("Customer & Dates")}</SectionLabel>
          <ul className="list-unstyled mb-1">
            <InfoRow icon={User} value={p?.customer_name} />
            <InfoRow
              icon={Calendar}
              value={
                p?.pfi_date
                  ? `${p.pfi_date.slice(0, 10)}${
                      validUntil ? ` → ${validUntil}` : ""
                    }`
                  : null
              }
            />
            {validUntil && (
              <InfoRow
                icon={Clock}
                value={
                  <Badge
                    color={isExpired ? "light-danger" : "light-success"}
                    className={`badge-light-${
                      isExpired ? "danger" : "success"
                    }`}
                  >
                    {isExpired ? t("Expired") : t("Active")}
                  </Badge>
                }
              />
            )}
          </ul>

          {/* ── Sources & Reference ────────────────────────────────── */}
          {(p?.quotation_id || p?.lead_id || p?._id) && (
            <Fragment>
              <SectionLabel>{t("References")}</SectionLabel>
              <ul className="list-unstyled mb-2">
                <InfoRow
                  icon={FileText}
                  value={
                    p?.quotation_id ? (
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
                    ) : null
                  }
                />
                <InfoRow
                  icon={FileText}
                  value={
                    p?.lead_id ? (
                      <span className="d-inline-flex align-items-center">
                        {t("Source Lead")}
                        <a
                          href={`${appsRoot}/leads/view/${p.lead_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t("Open Lead in new tab")}
                          className="text-decoration-none ms-1"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </span>
                    ) : null
                  }
                />
                <InfoRow
                  icon={Hash}
                  value={p?._id ? `#${p._id.slice(-6)}` : null}
                />
              </ul>
            </Fragment>
          )}

          {/* ── Actions ────────────────────────────────────────────── */}
          <div className="d-grid gap-1 mt-2">
            <Button
              color="primary"
              onClick={onDownloadPdf}
              disabled={downloading}
              id="pfi-pdf-from-view"
            >
              <Download size={14} className="me-50" />
              {downloading ? t("Generating…") : t("Download PDF")}
            </Button>
            <UncontrolledTooltip target="pfi-pdf-from-view" placement="top">
              {t("Download PFI as PDF")}
            </UncontrolledTooltip>
            <Button
              color="primary"
              outline
              onClick={() => navigate(`${appsRoot}/pfi/edit/${id}`)}
              id="pfi-edit-from-view"
            >
              <Edit size={14} className="me-50" /> {t("Edit")}
            </Button>
            <UncontrolledTooltip target="pfi-edit-from-view" placement="top">
              {t("Edit PFI")}
            </UncontrolledTooltip>
            {(p?.status || "").toLowerCase() === "approved" && (
              <>
                <Button
                  color="success"
                  onClick={() => setPoModalOpen(true)}
                  id="pfi-generate-pos"
                >
                  <Truck size={14} className="me-50" /> {t("Generate POs")}
                </Button>
                <UncontrolledTooltip
                  target="pfi-generate-pos"
                  placement="top"
                >
                  {t("Split this PFI into vendor Purchase Orders")}
                </UncontrolledTooltip>
              </>
            )}
          </div>
        </CardBody>
      </Card>
      <PoGeneratePreviewModal
        isOpen={poModalOpen}
        toggle={() => setPoModalOpen((s) => !s)}
        sourceType="pfi"
        sourceId={id}
        sourceVoucherNo={p?.voucher_no}
      />
    </Fragment>
  );
};

export default PfiInfoCard;
