// Company Activity Log — a company admin's read-only feed of who did what in
// THEIR company (created / updated / deleted records, with the actor and time).
// Data comes from the platform activity feed but the backend forces the
// caller's own company_id and 403s any non-company-admin. Layout mirrors the
// Reports pages (date range + filter + server pagination).
import {
  Fragment,
  useCallback,
  useEffect,
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
import ReactPaginate from "react-paginate";
import { RefreshCw } from "react-feather";
import { useTranslation } from "react-i18next";

import DateInput from "@components/date-input";
import Notification from "@components/toast/notification";
import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { defaultPerPageRow, perPageRowItems } from "@constant/defaultValues";

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

// Action → badge colour (doc-badge palette).
const actionBadge = (action) => {
  const a = String(action || "").toLowerCase();
  if (a.includes("delete")) return "doc-badge-red";
  if (a.includes("create")) return "doc-badge-green";
  if (a.includes("update")) return "doc-badge-orange";
  return "doc-badge-gray";
};

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "deleted", label: "Deleted" },
];

const ActivityLog = () => {
  const { t } = useTranslation();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [action, setAction] = useState(ACTION_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ items: [], total: 0, perPage: defaultPerPageRow });

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
    async (page = currentPage, perPage = rowsPerPage) => {
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
      } catch (e) {
        Notification("Error", t("There are no records to display"), "warning");
        setData({ items: [], total: 0, perPage });
      } finally {
        setLoading(false);
      }
    },
    [baseParams, currentPage, rowsPerPage, t]
  );

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    load(1, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, action]);

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const next = page + 1;
    setCurrentPage(next);
    load(next, rowsPerPage);
  };

  const handlePerPage = (value) => {
    const perPage = Number(value);
    setRowsPerPage(perPage);
    setCurrentPage(1);
    load(1, perPage);
  };

  const items = data.items || [];
  const total = data.total || 0;
  const perPage = data.perPage || rowsPerPage;
  const pageCount = Math.ceil((total || 1) / (perPage || 1));
  const startIndex = total ? (currentPage - 1) * perPage + 1 : 0;
  const endIndex = Math.min(startIndex - 1 + perPage, total);

  return (
    <Fragment>
      <div className="main-content activity-log">
        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
          <h3 className="mb-0">{t("Activity Log")}</h3>
          <Button
            color="primary"
            outline
            size="sm"
            onClick={() => load(currentPage, rowsPerPage)}
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
                  onChange={(sel) => setAction(sel || ACTION_OPTIONS[0])}
                  options={ACTION_OPTIONS}
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
                            <th className="text-nowrap">{t("Date & Time")}</th>
                            <th className="text-nowrap">{t("User")}</th>
                            <th className="text-nowrap">{t("Action")}</th>
                            <th>{t("Activity")}</th>
                            <th className="text-nowrap">{t("Record")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((r) => (
                            <tr key={r._id}>
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
                          ))}
                        </tbody>
                      </Table>
                    </div>

                    <Row className="row justify-content-md-between align-items-md-center pagination mt-2">
                      <Col sm={6} xl={6}>
                        <div className="d-block d-md-flex align-items-center justify-content-start gap-2">
                          <div className="label-select d-flex align-items-center gap-1">
                            <Label className="pr-2 mb-0">{t("Show")}</Label>
                            <select
                              id="alSelectPage"
                              value={rowsPerPage}
                              className="form-select form-select-page"
                              onChange={(e) => handlePerPage(e?.target?.value)}
                            >
                              {perPageRowItems?.map((item) => (
                                <option key={item?.value} value={item?.value}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="text-muted text-center text-sm-start total-pagination">
                            {startIndex}-{endIndex} of {total}
                          </div>
                        </div>
                      </Col>
                      <Col sm={6} xl={6}>
                        <ReactPaginate
                          nextLabel={<i className="tim-icons icon-minimal-right" />}
                          breakLabel="..."
                          previousLabel={<i className="tim-icons icon-minimal-left" />}
                          pageCount={pageCount}
                          activeClassName="active"
                          breakClassName="page-item"
                          pageClassName={"page-item"}
                          breakLinkClassName="page-link"
                          nextLinkClassName={"page-link"}
                          pageLinkClassName={"page-link"}
                          nextClassName={"page-item next next-btn"}
                          previousLinkClassName={"page-link"}
                          previousClassName={"page-item prev prev-btn"}
                          onPageChange={(page) => handlePagination(page?.selected)}
                          forcePage={currentPage - 1}
                          containerClassName={`pagination react-paginate align-items-center justify-content-xl-end mb-0 mt-xl-0`}
                        />
                      </Col>
                    </Row>
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
