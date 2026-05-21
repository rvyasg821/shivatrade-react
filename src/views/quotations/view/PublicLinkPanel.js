// Side panel: preview + publish / shareable link controls.
// Composed inside the right column of the quotation detail page.

import { Fragment, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Button, Input, InputGroup, Badge } from "reactstrap";
import { Eye, Link2, RefreshCw, X, Copy } from "react-feather";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useTranslation } from "react-i18next";

import {
  publishQuotation,
  rotateQuotationToken,
  unpublishQuotation,
} from "@src/views/quotations/store";
import { appsRoot } from "@constant/defaultValues";
import Notification from "@components/toast/notification";

import { DetailPanel } from "@src/views/_shared/detail-page";

const PublicLinkPanel = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const { quotationItem } = useSelector((s) => s.quotation);
  const q = quotationItem || {};
  const [copied, setCopied] = useState(false);

  const canPublish = q?.status === "sent" || q?.status === "approved";
  const token = q?.public_token;
  const publicUrl = token ? `${window.location.origin}/q/${token}` : "";

  const openPreview = () => {
    window.open(`${appsRoot}/quotations/preview/${id}`, "_blank");
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
          {t("Preview as your client will see it.")}
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
          {t("Send or approve the quotation to enable a public link.")}
        </div>
      ) : !token ? (
        <Fragment>
          <div className="text-muted small mb-1">
            {t(
              "Generate a view-only link to send to the client. Costing details stay hidden."
            )}
          </div>
          <Button
            color="primary"
            onClick={() => dispatch(publishQuotation(id))}
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
              {t("Viewed")}: {q?.public_view_count || 0}
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
              onClick={() => dispatch(rotateQuotationToken(id))}
              className="flex-grow-1"
            >
              <RefreshCw size={14} className="me-50" /> {t("Rotate")}
            </Button>
            <Button
              color="danger"
              outline
              size="sm"
              onClick={() => dispatch(unpublishQuotation(id))}
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

export default PublicLinkPanel;
