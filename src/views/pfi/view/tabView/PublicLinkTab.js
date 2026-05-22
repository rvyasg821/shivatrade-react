// Publish controls. Preview works in any status; Publish (real shareable
// token) only when the PFI is sent / approved.

import { Fragment, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Button, Input, InputGroup, Badge } from "reactstrap";
import { Eye, Link2, RefreshCw, X, Copy } from "react-feather";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useTranslation } from "react-i18next";

import {
  publishPfi,
  rotatePfiToken,
  unpublishPfi,
} from "@src/views/pfi/store";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import Notification from "@components/toast/notification";

const PublicLinkTab = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const { pfiItem } = useSelector((s) => s.pfi);
  const p = pfiItem || {};
  const [copied, setCopied] = useState(false);

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

  // react-copy-to-clipboard handles the non-secure-context fallback
  // (execCommand) internally - works on the plain-HTTP LAN dev server.
  const onCopy = (_text, result) => {
    if (result) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      Notification("Error", t("Could not copy link"), "warning");
    }
  };

  return (
    <Fragment>
      <h4 className="mb-2">{t("Public Link")}</h4>

      {/* Preview - always available */}
      <div className="mb-3">
        <p className="text-muted mb-1">
          {t(
            "Preview shows exactly what the client sees. It does not share anything."
          )}
        </p>
        <Button color="secondary" outline onClick={openPreview}>
          <Eye size={14} className="me-50" /> {t("Preview as client")}
        </Button>
      </div>

      <hr />

      {/* Publish / shareable link */}
      {!canPublish ? (
        <div className="alert alert-warning py-2">
          {t(
            "Send the PFI first - only sent or approved PFIs can be published."
          )}
        </div>
      ) : !token ? (
        <div>
          <p className="text-muted mb-1">
            {t(
              "Generate a view-only link you can send to the buyer. Costing details (margin, expenses, rebates) are never shown."
            )}
          </p>
          <Button color="primary" onClick={() => dispatch(publishPfi(id))}>
            <Link2 size={14} className="me-50" /> {t("Publish & Get Link")}
          </Button>
        </div>
      ) : (
        <div>
          <div className="d-flex align-items-center mb-1">
            <Badge color="light-success" className="me-1">
              {t("Published")}
            </Badge>
            <small className="text-muted">
              {t("Viewed")}: {p?.public_view_count || 0}{" "}
              {p?.public_last_viewed_at
                ? `· ${t("last")} ${new Date(
                    p.public_last_viewed_at
                  ).toLocaleString()}`
                : ""}
            </small>
          </div>
          <InputGroup className="mb-2">
            <Input readOnly value={publicUrl} />
            <CopyToClipboard text={publicUrl} onCopy={onCopy}>
              <Button color="primary" outline>
                <Copy size={14} className="me-50" />
                {copied ? t("Copied") : t("Copy")}
              </Button>
            </CopyToClipboard>
          </InputGroup>
          {canManage && (
            <>
              <Button
                color="secondary"
                outline
                size="sm"
                className="me-1"
                onClick={() => dispatch(rotatePfiToken(id))}
              >
                <RefreshCw size={14} className="me-50" /> {t("Rotate link")}
              </Button>
              <Button
                color="danger"
                outline
                size="sm"
                onClick={() => dispatch(unpublishPfi(id))}
              >
                <X size={14} className="me-50" /> {t("Unpublish")}
              </Button>
            </>
          )}
          <p className="text-muted small mt-1 mb-0">
            {t(
              "Rotating issues a fresh link - the old URL stops working immediately."
            )}
          </p>
        </div>
      )}
    </Fragment>
  );
};

export default PublicLinkTab;
