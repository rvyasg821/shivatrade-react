// PO Share panel — right column of the Purchase Order detail page.
// Mirrors the PFI/Quotation share workflow: Preview as client → Publish &
// get a tokenized public link → Rotate / Unpublish. Tracks view count.

import { Fragment, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Button, Input, InputGroup, Badge } from "reactstrap";
import { Eye, Link2, RefreshCw, X, Copy } from "react-feather";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useTranslation } from "react-i18next";

import {
  publishPurchaseOrder,
  rotatePurchaseOrderToken,
  unpublishPurchaseOrder,
} from "@src/views/purchase-orders/store";
import { appsRoot } from "@constant/defaultValues";
import Notification from "@components/toast/notification";

import { DetailPanel } from "@src/views/_shared/detail-page";

const PoShareLinkPanel = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const { purchaseOrderItem } = useSelector((s) => s.purchaseOrder);
  const p = purchaseOrderItem || {};
  const [copied, setCopied] = useState(false);

  // PO is publishable any time it isn't a draft.
  const status = (p?.status || "").toLowerCase();
  const canPublish = !!status && status !== "draft";
  const token = p?.public_token;
  const publicUrl = token ? `${window.location.origin}/po/${token}` : "";

  const openPreview = () => {
    window.open(`${appsRoot}/purchase-orders/preview/${id}`, "_blank");
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
      <div className="mb-3">
        <div className="text-muted small mb-1">
          {t("Preview the customer-facing layout in a new tab.")}
        </div>
        <Button color="secondary" outline onClick={openPreview} block>
          <Eye size={14} className="me-50" /> {t("Preview")}
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
          {t("Confirm the Purchase Order to enable a public link.")}
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
        </Fragment>
      )}
    </DetailPanel>
  );
};

export default PoShareLinkPanel;
