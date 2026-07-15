// API Calls tab — raw telemetry, with stat tiles above.
//
// The tiles read GET /admin/tracking/api-calls/stats, which computes percentiles
// over the raw table. Percentiles are not summable — you cannot average daily
// p95s and get the true p95 — so they are NOT taken from the usage rollup.

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Row,
  Col,
  Card,
  CardBody,
  Label,
  Input,
  Table,
  Badge,
  Spinner,
  Button,
} from "reactstrap";
import ReactPaginate from "react-paginate";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Trash2 } from "react-feather";

import DateInput from "@components/date-input";
import { getApiCalls, getApiCallStats, clearApiCalls } from "../store";
import { formatDateTime } from "@src/utility/dateFormat";

const mySwal = withReactContent(Swal);

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "2", label: "2xx — success" },
  { value: "4", label: "4xx — client error" },
  { value: "5", label: "5xx — server error" },
];

const statusColor = (code) => {
  if (code >= 500) return "light-danger";
  if (code >= 400) return "light-warning";
  if (code >= 200 && code < 300) return "light-success";
  return "light-secondary";
};

const StatTile = ({ label, value, hint }) => (
  <Col md="3" sm="6" className="mb-1">
    <Card className="mb-0 border">
      <CardBody className="py-1">
        <div className="text-muted small">{label}</div>
        <div className="fw-bolder" style={{ fontSize: "1.35rem" }}>
          {value}
        </div>
        {hint ? <div className="text-muted small">{hint}</div> : null}
      </CardBody>
    </Card>
  </Col>
);

const ApiCallsTab = ({ reloadKey }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.trackingLogs);
  const { items, total, perPage: serverPerPage } = store.apiCalls;
  const stats = store.apiCallStats;

  const [route, setRoute] = useState("");
  const [statusClass, setStatusClass] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const load = useCallback(() => {
    const filters = {
      route: route || undefined,
      status_class: statusClass || undefined,
      from: from || undefined,
      to: to || undefined,
    };
    dispatch(getApiCalls({ ...filters, page, perPage }));
    // Tiles ignore route/status — they describe the whole window, not the slice.
    dispatch(getApiCallStats({ from: from || undefined, to: to || undefined }));
  }, [dispatch, route, statusClass, from, to, page, perPage]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  useEffect(() => {
    setPage(1);
  }, [route, statusClass, from, to, perPage]);

  // Force the nightly rollup+prune to run now. Rows are rolled into the Usage
  // tab first, then everything before today's midnight is deleted — the same
  // thing the 04:00 cron does, but on demand so it doesn't depend on the server
  // being up at 4am.
  const handleClearNow = () => {
    mySwal
      .fire({
        title: t("Clear API call log now?"),
        text: t(
          "Today's calls are rolled into the Usage tab first, then every earlier row is permanently deleted. Usage totals are kept."
        ),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: t("Yes, clear now"),
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-outline-danger ms-1",
        },
        buttonsStyling: false,
      })
      .then((result) => {
        if (!result.isConfirmed) return;
        dispatch(clearApiCalls()).then(() => load());
      });
  };

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / (serverPerPage || 25))),
    [total, serverPerPage]
  );

  return (
    <Fragment>
      <Row className="mb-1">
        <StatTile
          label={t("Total calls")}
          value={(stats?.total ?? 0).toLocaleString()}
          hint={from || to ? t("in selected range") : t("today only")}
        />
        <StatTile
          label={t("Error rate")}
          value={`${stats?.error_rate_pct ?? 0}%`}
          hint={`${(stats?.errors ?? 0).toLocaleString()} ${t("errors")}`}
        />
        <StatTile
          label={t("p95 latency")}
          value={stats?.p95 != null ? `${stats.p95} ms` : "—"}
          hint={stats?.p50 != null ? `p50 ${stats.p50} ms` : ""}
        />
        <StatTile
          label={t("p99 latency")}
          value={stats?.p99 != null ? `${stats.p99} ms` : "—"}
        />
      </Row>

      <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-1">
        <div className="text-muted small">
          {t(
            "API calls are cleared every night at 4am. Older activity survives only as daily totals on the Usage tab."
          )}
        </div>
        <Button
          color="danger"
          outline
          size="sm"
          onClick={handleClearNow}
          disabled={store.clearing}
        >
          {store.clearing ? (
            <Spinner size="sm" className="me-50" />
          ) : (
            <Trash2 size={14} className="me-50" />
          )}
          {t("Clear now")}
        </Button>
      </div>

      <Row className="mb-2">
        <Col md="3" className="mb-1">
          <Label className="form-label">{t("Route contains")}</Label>
          <Input
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            placeholder="e.g. quotation"
          />
        </Col>
        <Col md="3" className="mb-1">
          <Label className="form-label">{t("Status")}</Label>
          <Select
            classNamePrefix="select"
            options={STATUS_OPTIONS}
            value={STATUS_OPTIONS.find((o) => o.value === statusClass)}
            onChange={(opt) => setStatusClass(opt?.value || "")}
          />
        </Col>
        <Col md="3" className="mb-1">
          <Label className="form-label">{t("From")}</Label>
          <DateInput
            id="calls-from"
            value={from}
            onChange={(d, str, iso) => setFrom(iso || "")}
            placeholder={t("YYYY-MM-DD")}
          />
        </Col>
        <Col md="3" className="mb-1">
          <Label className="form-label">{t("To")}</Label>
          <DateInput
            id="calls-to"
            value={to}
            onChange={(d, str, iso) => setTo(iso || "")}
            placeholder={t("YYYY-MM-DD")}
          />
        </Col>
      </Row>

      {store.loadingApiCalls ? (
        <div className="text-center py-4">
          <Spinner />
        </div>
      ) : !items?.length ? (
        <div className="text-center text-muted py-4">
          {t("No API calls recorded for this filter.")}
        </div>
      ) : (
        <div className="table-responsive">
          <Table size="sm" className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 185 }}>{t("When")}</th>
                <th style={{ width: 140 }}>{t("Who")}</th>
                <th style={{ width: 70 }}>{t("Method")}</th>
                <th>{t("Route")}</th>
                <th style={{ width: 80 }} className="text-center">
                  {t("Status")}
                </th>
                <th style={{ width: 90 }} className="text-end">
                  {t("Time")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row._id}>
                  <td className="text-nowrap small text-muted">
                    {formatDateTime(row.at)}
                  </td>
                  <td className="text-nowrap">{row.actor_name}</td>
                  <td>
                    <Badge color="light-secondary">{row.method}</Badge>
                  </td>
                  <td className="small">
                    <code>{row.route}</code>
                  </td>
                  <td className="text-center">
                    <Badge color={statusColor(row.status_code)}>
                      {row.status_code}
                    </Badge>
                  </td>
                  <td
                    className={`text-end ${
                      row.duration_ms > 1000 ? "text-danger fw-bold" : ""
                    }`}
                  >
                    {row.duration_ms} ms
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {total > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-1">
          <div className="d-flex align-items-center">
            <span className="me-1">{t("Show")}</span>
            <Input
              type="select"
              bsSize="sm"
              style={{ width: 90 }}
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </Input>
            <span className="ms-1 text-muted">
              {t("of")} {total.toLocaleString()} {t("entries")}
            </span>
          </div>
          <ReactPaginate
            previousLabel=""
            nextLabel=""
            forcePage={page - 1}
            onPageChange={(p) => setPage(p.selected + 1)}
            pageCount={pageCount}
            breakLabel="..."
            pageRangeDisplayed={2}
            marginPagesDisplayed={2}
            activeClassName="active"
            pageClassName="page-item"
            breakClassName="page-item"
            nextLinkClassName="page-link"
            pageLinkClassName="page-link"
            breakLinkClassName="page-link"
            previousLinkClassName="page-link"
            nextClassName="page-item next"
            previousClassName="page-item prev"
            containerClassName="pagination react-paginate justify-content-end mb-0"
          />
        </div>
      )}
    </Fragment>
  );
};

export default ApiCallsTab;
