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
  DollarSign,
  FileText,
  Edit,
  ExternalLink,
  Download,
} from "react-feather";
import { useTranslation } from "react-i18next";

import Avatar from "@components/avatar";
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
        className="flex-grow-1 text-break"
        style={{ minWidth: 0, overflowWrap: "anywhere" }}
      >
        {value}
      </span>
    </li>
  );
};

const PfiInfoCard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { pfiItem } = useSelector((s) => s.pfi);
  const p = pfiItem || {};
  const sym = p?.currency_symbol || p?.currency_code || "";

  const [downloading, setDownloading] = useState(false);
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
          <div className="user-avatar-section">
            <div className="d-flex align-items-center flex-column">
              <Avatar
                initials
                color="light-primary"
                className="rounded mt-3 mb-2"
                content={"PI"}
                contentStyles={{
                  borderRadius: 0,
                  fontSize: "calc(36px)",
                  width: "100%",
                  height: "100%",
                }}
                style={{ height: "90px", width: "90px" }}
              />
              <div className="d-flex flex-column align-items-center text-center">
                <h4 className="text-break mb-0">{p?.voucher_no || "-"}</h4>
                <Badge
                  color={`light-${
                    QUOTATION_STATUS_BADGE_COLOR[
                      (p?.status || "").toLowerCase()
                    ] || "secondary"
                  }`}
                  className={`badge-light-${
                    QUOTATION_STATUS_BADGE_COLOR[
                      (p?.status || "").toLowerCase()
                    ] || "secondary"
                  } mt-1 text-capitalize`}
                >
                  {p?.status || "-"}
                </Badge>
              </div>
            </div>
          </div>

          <h4 className="fw-bolder border-bottom pb-50 mb-1">
            {t("Details")}
          </h4>
          <ul className="list-unstyled mb-2">
            <InfoRow icon={User} value={p?.customer_name} />
            <InfoRow
              icon={Calendar}
              value={
                p?.pfi_date
                  ? `${p.pfi_date.slice(0, 10)}${
                      p?.valid_until
                        ? ` → ${p.valid_until.slice(0, 10)}`
                        : ""
                    }`
                  : null
              }
            />
            <InfoRow
              icon={DollarSign}
              value={
                p?.grand_total
                  ? `${sym}${fmt(p.grand_total)} (${p?.currency_code || ""})`
                  : null
              }
            />
            <InfoRow
              icon={FileText}
              value={
                p?.quotation_id ? (
                  <span className="d-inline-flex align-items-center">
                    {t("Source Quotation")}
                    {p?.quotation_voucher_no ? ` · ${p.quotation_voucher_no}` : ""}
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

          <div className="d-flex justify-content-center flex-wrap gap-1">
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
          </div>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default PfiInfoCard;
