// Company Activity Log — a company admin's read-only feed of who did what in
// THEIR company (created / updated / deleted records, with the actor and time).
// Data comes from the platform activity feed but the backend forces the
// caller's own company_id and 403s any non-company-admin. Layout mirrors the
// Reports pages (date range + filter + server pagination).
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useLayoutEffect,
} from "react";
import {
  Row,
  Col,
  Card,
  CardBody,
  Label,
  Button,
  Table,
  Spinner,
} from "reactstrap";
import Select from "react-select";
import { RefreshCw, ChevronDown, ChevronRight } from "react-feather";
import { useTranslation } from "react-i18next";

import DateInput from "@components/date-input";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { defaultPerPageRow } from "@constant/defaultValues";
import {
  useServerPagination,
  ServerPaginationBar,
} from "@src/views/_shared/table/ServerPagination";

// DD/MM/YYYY HH:mm in IST — the activity `at` is a full ISO timestamp.
const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const Dash = () => <span className="text-muted">—</span>;

// Diff values can be objects (e.g. a snapshot field) — stringify those, and
// show an em-dash for empty/null so an added or cleared field reads clearly.
const fmtDiffValue = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

// Action → badge colour (doc-badge palette).
const actionBadge = (action) => {
  const a = String(action || "").toLowerCase();
  if (a.includes("delete")) return "doc-badge-red";
  if (a.includes("create")) return "doc-badge-green";
  if (a.includes("update")) return "doc-badge-orange";
  return "doc-badge-gray";
};

// Human labels for the stored `action` strings (audit-log.entity ENUM). Both
// hard + soft delete read as "Deleted".
const ACTION_LABELS = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  soft_delete: "Deleted",
  import: "Imported",
  login: "Login",
  logout: "Logout",
  login_failed: "Login failed",
  pwd_reset_req: "Password reset requested",
  pwd_reset: "Password reset",
};

const ALL_ACTION = { value: "", label: "All actions" };

// Build the Action dropdown from the actions that ACTUALLY exist for this
// company (returned by the backend), so it never offers a value with zero rows.
// Actions sharing a label (delete + soft_delete → "Deleted") merge into one
// option whose value is the comma-list the backend ORs together.
const buildActionOptions = (actions) => {
  const byLabel = new Map();
  (actions || []).forEach((a) => {
    const label = ACTION_LABELS[a] || a;
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label).push(a);
  });
  const opts = Array.from(byLabel, ([label, raws]) => ({
    value: raws.join(","),
    label,
  })).sort((x, y) => x.label.localeCompare(y.label));
  return [ALL_ACTION, ...opts];
};

const ActivityLog = () => {
  const { t } = useTranslation();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [action, setAction] = useState(ALL_ACTION);
  const [availableActions, setAvailableActions] = useState([]);
  const actionOptions = useMemo(
    () => buildActionOptions(availableActions),
    [availableActions]
  );
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ items: [], total: 0, perPage: defaultPerPageRow });
  const [expanded, setExpanded] = useState({});
  const toggleRow = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const baseParams = useCallback(
    () => ({
      from: dateFrom || undefined,
      // include the whole "to" day (end of day) so a same-day filter isn't empty
      to: dateTo ? `${dateTo}T23:59:59` : undefined,
      action: action?.value || undefined,
    }),
    [dateFrom, dateTo, action]
  );

  const load = useCallback(
    async (page, perPage) => {
      setLoading(true);
      try {
        const resp = await instance.get(API_ENDPOINTS.activityLog.list, {
          params: { ...baseParams(), page, perPage },
        });
        const payload = resp?.data?.data || {};
        setData({
          items: payload.items || [],
          total: payload.total || 0,
          perPage: payload.perPage || perPage,
        });
        if (Array.isArray(payload.available_actions)) {
          setAvailableActions(payload.available_actions);
        }
      } catch (e) {
        Notification("Error", t("There are no records to display"), "warning");
        setData({ items: [], total: 0, perPage });
      } finally {
        setLoading(false);
      }
    },
    [baseParams, t]
  );

  const sp = useServerPagination(load);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    sp.setPage(1);
    load(1, sp.perPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, action]);

  const items = data.items || [];
  const total = data.total || 0;

  return (
    <Fragment>
      <div className="main-content activity-log">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
          <h3 className="mb-0">{t("Activity Log")}</h3>
          <Button
            color="primary"
            outline
            size="sm"
            onClick={() => load(sp.page, sp.perPage)}
            disabled={loading}
          >
            <RefreshCw size={14} className="me-50" />
            {t("Refresh")}
          </Button>
        </div>

        <Card className="overflow-hidden">
          <CardBody>
            <Row>
              <Col sm="6" md="3" className="mb-1">
                <Label className="form-label">{t("From")}</Label>
                <DateInput
                  id="al-from"
                  value={dateFrom}
                  onChange={(d, str, iso) => setDateFrom(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="3" className="mb-1">
                <Label className="form-label">{t("To")}</Label>
                <DateInput
                  id="al-to"
                  value={dateTo}
                  onChange={(d, str, iso) => setDateTo(iso || "")}
                  placeholder={t("YYYY-MM-DD")}
                />
              </Col>
              <Col sm="6" md="3" className="mb-1">
                <Label className="form-label">{t("Action")}</Label>
                <Select
                  value={action}
                  onChange={(sel) => setAction(sel || ALL_ACTION)}
                  options={actionOptions}
                  classNamePrefix="select"
                  menuPortalTarget={document.body}
                  styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }}
                />
              </Col>
            </Row>

            <Row className="mt-1">
              <Col md="12">
                {loading ? (
                  <div className="text-center py-3">
                    <Spinner size="sm" /> {t("Loading…")}
                  </div>
                ) : !items.length ? (
                  <div className="text-center text-muted py-3">
                    {t("No activity in this period")}
                  </div>
                ) : (
                  <Fragment>
                    <div className="table-responsive" style={{ overflowX: "auto" }}>
                      <Table className="align-middle mb-0">
                        <thead className="table-dark">
                          <tr>
                            <th style={{ width: 34 }} />
                            <th className="text-nowrap">{t("Date & Time")}</th>
                            <th className="text-nowrap">{t("User")}</th>
                            <th className="text-nowrap">{t("Action")}</th>
                            <th>{t("Activity")}</th>
                            <th className="text-nowrap">{t("Record")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((r) => {
                            const open = !!expanded[r._id];
                            const hasDiff = (r.diff || []).length > 0;
                            return (
                              <Fragment key={r._id}>
                                <tr>
                                  <td>
                                    {hasDiff ? (
                                      <span
                                        className="cursor-pointer"
                                        onClick={() => toggleRow(r._id)}
                                      >
                                        {open ? (
                                          <ChevronDown size={16} />
                                        ) : (
                                          <ChevronRight size={16} />
                                        )}
                                      </span>
                                    ) : null}
                                  </td>
                                  <td className="text-nowrap">{fmtDateTime(r.at)}</td>
                                  <td className="text-nowrap fw-semibold">
                                    {r.actor_name || <Dash />}
                                  </td>
                                  <td>
                                    <span
                                      className={`doc-badge ${actionBadge(r.action)} text-capitalize`}
                                    >
                                      {r.action || "—"}
                                    </span>
                                  </td>
                                  <td style={{ minWidth: 260 }}>
                                    {r.sentence || <Dash />}
                                  </td>
                                  <td style={{ minWidth: 160 }}>
                                    {r.entity_label || r.entity_name ? (
                                      <div>
                                        <div className="fw-semibold">
                                          {r.entity_label || <Dash />}
                                        </div>
                                        {r.entity_name ? (
                                          <div className="small text-muted text-capitalize">
                                            {String(r.entity_name).replace(/[_-]/g, " ")}
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : (
                                      <Dash />
                                    )}
                                  </td>
                                </tr>
                                {open && hasDiff && (
                                  <tr className="bg-light">
                                    <td colSpan={6} className="small">
                                      <Table size="sm" borderless className="mb-0">
                                        <tbody>
                                          {r.diff.map((d) => (
                                            <tr key={d.field}>
                                              <td
                                                className="text-muted text-capitalize"
                                                style={{ width: 220 }}
                                              >
                                                {d.field}
                                              </td>
                                              <td
                                                className="text-danger"
                                                style={{
                                                  textDecoration: "line-through",
                                                  width: 220,
                                                }}
                                              >
                                                {fmtDiffValue(d.from)}
                                              </td>
                                              <td className="text-success fw-semibold">
                                                {fmtDiffValue(d.to)}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </Table>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>

                    <ServerPaginationBar
                      idPrefix="al"
                      page={sp.page}
                      perPage={data.perPage || sp.perPage}
                      total={total}
                      onPageChange={sp.handlePageChange}
                      onPerPageChange={sp.handlePerPageChange}
                    />
                  </Fragment>
                )}
              </Col>
            </Row>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default ActivityLog;
