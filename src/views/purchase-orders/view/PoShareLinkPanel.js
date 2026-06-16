// PO Share panel — right column of the Purchase Order detail page.
// Mirrors the PFI/Quotation share workflow: Preview as client → Publish &
// get a tokenized public link → Rotate / Unpublish. Tracks view count.

import { Fragment, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Button, Input, InputGroup, Badge } from "reactstrap";
import { Eye, Link2, RefreshCw, X, Copy, Download } from "react-feather";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useTranslation } from "react-i18next";

import {
  publishPurchaseOrder,
  rotatePurchaseOrderToken,
  unpublishPurchaseOrder,
} from "@src/views/purchase-orders/store";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";

import { DetailPanel } from "@src/views/_shared/detail-page";

const PoShareLinkPanel = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const { purchaseOrderItem } = useSelector((s) => s.purchaseOrder);
  const p = purchaseOrderItem || {};
  const [copied, setCopied] = useState(false);

  const authUserItem = useSelector((s) => s.auth?.authUserItem);
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.["purchase-orders"];
  const canManage = isAdmin || perms?.can_all || perms?.can_update;

  // PO is publishable any time it isn't a draft.
  const status = (p?.status || "").toLowerCase();
  const canPublish = canManage && !!status && status !== "draft";
  const token = p?.public_token;
  const publicUrl = token ? `${window.location.origin}/po/${token}` : "";

  const openPreview = () => {
    window.open(`${appsRoot}/purchase-orders/preview/${id}`, "_blank");
  };

  const [downloading, setDownloading] = useState(false);
  // Open the PDF inline in a new tab (with its proper name) via a short-lived
  // ticket on the no-auth public route — a blob tab is named by its UUID.
  const onDownloadPdf = async () => {
    if (!id || downloading) return;
    setDownloading(true);
    const win = window.open("", "_blank"); // sync open → not popup-blocked
    try {
      const resp = await instance.get(
        `${API_ENDPOINTS.purchaseOrders.pdf}/${id}/pdf-ticket`
      );
      const ticket = resp?.data?.data?.ticket;
      if (!ticket) throw new Error("no ticket");
      const url = `${instance.defaults.baseURL}${
        API_ENDPOINTS.purchaseOrders.ticketPdf
      }?t=${encodeURIComponent(ticket)}`;
      if (win) win.location.href = url;
      else window.open(url, "_blank");
    } catch (err) {
      if (win) win.close();
      Notification(
        "Error",
        err?.response?.data?.message || t("Could not download PDF"),
        "warning"
      );
    } finally {
      setDownloading(false);
    }
  };

  const onCopy = (_text, result) => {
    if (result) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      Notification("Error", t("Could not copy link"), "warning");
    }
  };

  return (
    <DetailPanel title={t("Share")}>
      <div className="mb-2">
        <div className="text-muted small mb-1">
          {t("Preview exactly what the vendor sees.")}
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
          {t("Confirm the Sales Order to enable a public link.")}
        </div>
      ) : !token ? (
        <Fragment>
          <div className="text-muted small mb-1">
            {t(
              "Generate a view-only link to share with the vendor. The internal admin page stays private."
            )}
          </div>
          <Button
            color="primary"
            onClick={() => dispatch(publishPurchaseOrder(id))}
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
              onClick={() => dispatch(rotatePurchaseOrderToken(id))}
              className="flex-grow-1"
            >
              <RefreshCw size={14} className="me-50" /> {t("Rotate")}
            </Button>
            <Button
              color="danger"
              outline
              size="sm"
              onClick={() => dispatch(unpublishPurchaseOrder(id))}
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

export default PoShareLinkPanel;
