// Reusable vertical timeline for tracking events (Tracking plan §11 §13).
// Newest-first. Each row: dot · event_at · type label · location · notes ·
// "— Logged by {user}" · optional 📎 attachment chip · "Post-closure" badge
// when applicable.
//
// Option D — retracted events stay in the timeline but render with a
// strikethrough body and a "Retracted by X — Reason: ..." footer. The
// retract (delete) icon is only shown for live events when `onRetract`
// is supplied AND the parent component decided the user is permitted.

import { Fragment } from "react";
import { Badge, UncontrolledTooltip } from "reactstrap";
import { Paperclip, Trash2 } from "react-feather";
import { useTranslation } from "react-i18next";

import { assessmentReportPdfUrl } from "@constant/defaultValues";

// Backend stores `attachment_url` as a relative path (new rows:
// "files/tracking/x.pdf"; legacy rows: "/assets/files/tracking/x.pdf").
// Resolve against REACT_APP_BACKEND_REST_API_URL_PDF, which already
// terminates at `/assets`, so the legacy prefix is stripped here.
const resolveAttachmentHref = (rel) => {
  if (!rel) return "";
  if (/^https?:\/\//i.test(rel)) return rel;
  const base = (assessmentReportPdfUrl || "").replace(/\/$/, "");
  const path = rel
    .replace(/^\//, "")
    .replace(/^assets\//, "");
  return `${base}/${path}`;
};

const fmtWhen = (iso) => {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return String(iso).slice(0, 16);
  }
};

const TrackingTimeline = ({
  events = [],
  emptyText,
  anchorEventId,
  onRetract,
}) => {
  const { t } = useTranslation();
  if (!events.length) {
    return (
      <div className="text-muted small py-2">
        {emptyText || t("No tracking events yet.")}
      </div>
    );
  }
  return (
    <ul className="timeline ms-50">
      {events.map((e) => {
        const retracted = !!e.soft_delete;
        const isSystem = !!e.is_system;
        const bodyStyle = retracted
          ? { textDecoration: "line-through", opacity: 0.6 }
          : undefined;
        return (
          <li
            key={e._id}
            id={`tracking-event-${e._id}`}
            className={`timeline-item ${
              anchorEventId === e._id ? "active" : ""
            }`}
          >
            <span
              className={`timeline-point timeline-point-indicator ${
                retracted
                  ? "timeline-point-secondary"
                  : isSystem
                  ? "timeline-point-info"
                  : e.is_post_closure
                  ? "timeline-point-warning"
                  : ""
              }`}
            />
            <div className="timeline-event">
              <div className="d-flex justify-content-between flex-wrap mb-50">
                <h6 className="mb-0" style={bodyStyle}>
                  {e.event_type_label || e.event_type || t("Event")}
                  {isSystem && !retracted && (
                    <Badge color="light-info" className="ms-50">
                      {t("System")}
                    </Badge>
                  )}
                  {e.is_post_closure && !retracted && (
                    <Badge color="light-warning" className="ms-50">
                      {t("Post-closure")}
                    </Badge>
                  )}
                  {retracted && (
                    <Badge color="light-secondary" className="ms-50">
                      {t("Retracted")}
                    </Badge>
                  )}
                </h6>
                <div className="d-flex align-items-center">
                  <span className="text-muted small" style={bodyStyle}>
                    {fmtWhen(e.event_at)}
                  </span>
                  {!retracted && !isSystem && onRetract ? (
                    <Fragment>
                      <Trash2
                        size={14}
                        className="cursor-pointer text-danger ms-1"
                        id={`tev-retract-${e._id}`}
                        onClick={() => onRetract(e)}
                      />
                      <UncontrolledTooltip
                        placement="top"
                        target={`tev-retract-${e._id}`}
                      >
                        {t("Retract this event")}
                      </UncontrolledTooltip>
                    </Fragment>
                  ) : null}
                </div>
              </div>
              {e.location ? (
                <p className="mb-25 small" style={bodyStyle}>
                  <strong>{t("Location:")}</strong> {e.location}
                </p>
              ) : null}
              {e.notes ? (
                <p
                  className="mb-25 small"
                  style={{ whiteSpace: "pre-line", ...(bodyStyle || {}) }}
                >
                  {e.notes}
                </p>
              ) : null}
              <div
                className="d-flex align-items-center flex-wrap mt-50"
                style={bodyStyle}
              >
                <span className="text-muted small">
                  {t("— Logged by")} {e.created_by_name || t("user")}
                </span>
                {e.attachment_url ? (
                  <a
                    href={resolveAttachmentHref(e.attachment_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="ms-1 small d-inline-flex align-items-center"
                  >
                    <Paperclip size={14} className="me-25" />
                    {t("Attachment")}
                  </a>
                ) : null}
              </div>
              {retracted ? (
                <div className="mt-50 small text-warning">
                  <strong>{t("Retracted by")}</strong>{" "}
                  {e.deleted_by_name || t("user")}
                  {e.deleted_at ? ` · ${fmtWhen(e.deleted_at)}` : ""}
                  {e.deleted_reason ? (
                    <div className="text-muted">
                      <strong>{t("Reason:")}</strong> {e.deleted_reason}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default TrackingTimeline;
