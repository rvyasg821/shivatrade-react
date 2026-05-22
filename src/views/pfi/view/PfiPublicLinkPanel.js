// Side panel: preview + publish / shareable link controls for PFI.
// Mirrors quotations/view/PublicLinkPanel.js.

import { Fragment, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Button, Input, InputGroup, Badge } from "reactstrap";
import { Eye, Link2, RefreshCw, X, Copy, Download } from "react-feather";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useTranslation } from "react-i18next";

import {
  publishPfi,
  rotatePfiToken,
  unpublishPfi,
} from "@src/views/pfi/store";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import Notification from "@components/toast/notification";
import { DetailPanel } from "@src/views/_shared/detail-page";

const PfiPublicLinkPanel = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const { pfiItem } = useSelector((s) => s.pfi);
  const p = pfiItem || {};
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const authUserItem = useSelector((s) => s.auth?.authUserItem);
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.pfi;
  const canManage = isAdmin || perms?.can_all || perms?.can_update;

  const canPublish =
    canManage && (p?.status === "sent" || p?.status === "approved");
  const token = p?.public_token;
  const publicUrl = token ? `${window.location.origin}/p/${token}` : "";

  const openPreview = () => {
    window.open(`${appsRoot}/pfi/preview/${id}`, "_blank");
  };

  const onCopy = (_text, result) => {
    if (result) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      Notification("Error", t("Could not copy link"), "warning");
    }
  };

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
    <DetailPanel title={t("Share")}>
      <div className="mb-2">
        <div className="text-muted small mb-1">
          {t("Preview exactly what the buyer sees.")}
        </div>
        <Button color="secondary" outline onClick={openPreview} block>
          <Eye size={14} className="me-50" /> {t("Preview as client")}
        </Button>
      </div>

      <div className="mb-2">
        <Button
          color="primary"
          outline
          onClick={onDownloadPdf}
          disabled={downloading}
          block
        >
          <Download size={14} className="me-50" />
          {downloading ? t("Generating…") : t("Download PDF")}
        </Button>
      </div>

      <hr className="my-2" />

      {!canPublish ? (
        <div
          className="py-2 px-2 small mb-0"
          style={{
            background: "#fff3e0",
            color: "#7a4a00",
            border: "1px solid #ffe0b2",
            borderRadius: 6,
          }}
        >
          {t("Send or approve the PFI to enable a public link.")}
        </div>
      ) : !token ? (
        <Fragment>
          <div className="text-muted small mb-1">
            {t(
              "Generate a view-only link to send to the buyer. Costing details stay hidden."
            )}
          </div>
          <Button
            color="primary"
            onClick={() => dispatch(publishPfi(id))}
            block
          >
            <Link2 size={14} className="me-50" /> {t("Publish & Get Link")}
          </Button>
        </Fragment>
      ) : (
        <Fragment>
          <div className="d-flex align-items-center mb-1">
            <Badge color="light-success" className="me-1">
              {t("Published")}
            </Badge>
            <small className="text-muted">
              {t("Viewed")}: {p?.public_view_count || 0}
            </small>
          </div>
          <InputGroup className="mb-2">
            <Input readOnly value={publicUrl} bsSize="sm" />
            <CopyToClipboard text={publicUrl} onCopy={onCopy}>
              <Button color="primary" outline size="sm">
                <Copy size={14} />
                {copied ? ` ${t("Copied")}` : ""}
              </Button>
            </CopyToClipboard>
          </InputGroup>
          {canManage && (
          <div className="d-flex gap-1">
            <Button
              color="secondary"
              outline
              size="sm"
              onClick={() => dispatch(rotatePfiToken(id))}
              className="flex-grow-1"
            >
              <RefreshCw size={14} className="me-50" /> {t("Rotate")}
            </Button>
            <Button
              color="danger"
              outline
              size="sm"
              onClick={() => dispatch(unpublishPfi(id))}
              className="flex-grow-1"
            >
              <X size={14} className="me-50" /> {t("Unpublish")}
            </Button>
          </div>
          )}
        </Fragment>
      )}
    </DetailPanel>
  );
};

export default PfiPublicLinkPanel;
