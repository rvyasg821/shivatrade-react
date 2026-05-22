// Reusable Lead Activity timeline. Drops into any page that has access to a
// leadId; renders the chronological feed (newest-first), an Add Note composer
// at the top, and per-row Edit / Delete for the current user's own notes.

import { Fragment, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Button,
  Input,
  Spinner,
  UncontrolledTooltip,
} from "reactstrap";
import {
  FileText,
  ArrowRight,
  UserPlus,
  CheckCircle,
  MessageSquare,
  Flag,
  Edit,
  Trash2,
  X,
  Save,
  Plus,
} from "react-feather";
import { useTranslation } from "react-i18next";
import Notification from "@components/toast/notification";
import { formatDate } from "@src/utility/dateFormat";

import {
  getLeadActivities,
  addLeadNote,
  updateLeadNote,
  deleteLeadNote,
  cleanLeadActivityMessage,
} from "./activityStore";

const TYPE_META = {
  note: { icon: MessageSquare, color: "primary", label: "Note" },
  lead_created: { icon: Flag, color: "success", label: "Lead created" },
  status_change: { icon: ArrowRight, color: "info", label: "Status changed" },
  conversion: { icon: UserPlus, color: "success", label: "Converted to customer" },
  quotation_created: {
    icon: FileText,
    color: "info",
    label: "Quotation created",
  },
  assignment_change: {
    icon: CheckCircle,
    color: "warning",
    label: "Assignment changed",
  },
};

const relative = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return formatDate(iso);
};

const renderRow = (row, t) => {
  const md = TYPE_META[row?.type] || TYPE_META.note;
  if (row.type === "note") return row?.body || "";
  if (row.type === "lead_created") return t("Lead created");
  if (row.type === "status_change") {
    const f = row?.metadata?.from || "-";
    const to = row?.metadata?.to || "-";
    return (
      <span>
        <span className="text-muted">{t("From")}</span>{" "}
        <span className="text-capitalize">{String(f).replace(/_/g, " ")}</span>{" "}
        <span className="text-muted">{t("to")}</span>{" "}
        <span className="text-capitalize fw-bold">
          {String(to).replace(/_/g, " ")}
        </span>
      </span>
    );
  }
  if (row.type === "quotation_created") {
    return (
      <span>
        {t("New quotation")}{" "}
        <span className="fw-bold">{row?.metadata?.voucher_no || ""}</span>
      </span>
    );
  }
  if (row.type === "conversion") {
    return row?.metadata?.won
      ? t("Lead marked Won and linked to customer")
      : t("Lead linked to customer");
  }
  return md.label;
};

const ActivityTab = ({
  leadId,
  showComposer = true,
  onComposerClose,
  canManage = true,
}) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const store = useSelector((s) => s.leadActivity);
  const authUser = useSelector((s) => s.auth?.authUserItem);
  const myUserId = authUser?._id || authUser?.user?._id || "";

  const [draft, setDraft] = useState("");
  const [editId, setEditId] = useState("");
  const [editDraft, setEditDraft] = useState("");

  useEffect(() => {
    if (leadId) dispatch(getLeadActivities(leadId));
  }, [leadId, dispatch]);

  useEffect(() => {
    if (store?.success && store?.actionFlag) {
      Notification("Success", store.success, "success");
      dispatch(cleanLeadActivityMessage());
    }
    if (store?.error) {
      Notification("Error", store.error, "warning");
      dispatch(cleanLeadActivityMessage());
    }
  }, [store?.actionFlag, store?.success, store?.error]);

  const items = useMemo(() => store?.items || [], [store?.items]);

  const onAdd = async () => {
    if (!draft.trim()) return;
    await dispatch(addLeadNote({ leadId, body: draft.trim() }));
    setDraft("");
    // Auto-collapse the composer after a successful add when the parent
    // is controlling visibility (header "+" toggle pattern).
    if (onComposerClose) onComposerClose();
  };

  const onSaveEdit = async () => {
    if (!editDraft.trim() || !editId) return;
    await dispatch(
      updateLeadNote({ leadId, activityId: editId, body: editDraft.trim() })
    );
    setEditId("");
    setEditDraft("");
  };

  const onDelete = (activityId) => {
    if (!window.confirm(t("Delete this note?"))) return;
    dispatch(deleteLeadNote({ leadId, activityId }));
  };

  return (
    <Fragment>
      {/* Add-note composer — hidden by default; the parent toggles it via
          the header "+" action. */}
      {showComposer && (
      <div className="mb-3" style={{ position: "relative" }}>
        <Input
          type="textarea"
          rows="3"
          placeholder={t("Add a note…")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{ width: "100%", paddingRight: 48, resize: "vertical" }}
        />
        <Button
          color="primary"
          onClick={onAdd}
          disabled={!draft.trim()}
          id="lead-add-note-btn"
          style={{
            position: "absolute",
            right: 8,
            bottom: 8,
            width: 34,
            height: 34,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
          }}
        >
          <Plus size={16} />
        </Button>
        <UncontrolledTooltip target="lead-add-note-btn" placement="top">
          {t("Add note")}
        </UncontrolledTooltip>
      </div>
      )}

      {store?.loading && <Spinner size="sm" className="me-1" />}

      {!store?.loading && items.length === 0 && (
        <div className="text-muted py-3 text-center">
          {t("No activity yet. Add the first note above.")}
        </div>
      )}

      <ul
        className="timeline mb-0 list-unstyled"
        style={{ borderLeft: "2px solid #eee", paddingLeft: 16 }}
      >
        {items.map((row) => {
          const md = TYPE_META[row?.type] || TYPE_META.note;
          const Icon = md.icon;
          const isOwnNote =
            row.type === "note" && row.created_by === myUserId;
          const isEditing = editId === row._id;
          return (
            <li key={row._id} className="mb-3" style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: -27,
                  top: 2,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "#fff",
                  border: `2px solid var(--bs-${md.color})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={12} className={`text-${md.color}`} />
              </span>

              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  {isEditing ? (
                    <div className="d-flex gap-2 mb-1">
                      <Input
                        type="textarea"
                        rows="2"
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                      />
                      <Button color="success" size="sm" onClick={onSaveEdit}>
                        <Save size={14} />
                      </Button>
                      <Button
                        color="secondary"
                        outline
                        size="sm"
                        onClick={() => {
                          setEditId("");
                          setEditDraft("");
                        }}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="text-break"
                      style={{ overflowWrap: "anywhere" }}
                    >
                      {renderRow(row, t)}
                    </div>
                  )}
                  <small className="text-muted d-block">
                    {row?.created_by_name || t("System")}
                  </small>
                  <small className="text-muted d-block">
                    {relative(row?.createdAt)}
                  </small>
                </div>

                {canManage && isOwnNote && !isEditing && (
                  <div className="d-flex align-items-center">
                    <Trash2
                      size={16}
                      className="cursor-pointer text-danger"
                      id={`note-del-${row._id}`}
                      onClick={() => onDelete(row._id)}
                    />
                    <UncontrolledTooltip target={`note-del-${row._id}`}>
                      {t("Delete")}
                    </UncontrolledTooltip>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Fragment>
  );
};

export default ActivityTab;
