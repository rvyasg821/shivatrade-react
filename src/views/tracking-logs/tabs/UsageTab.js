// Usage tab — per-company daily metering, read from `usage_daily_rollups`.
//
// This never touches the raw telemetry table: aggregating pre-aggregated daily
// rows is a handful of reads, not millions. That is the whole reason the nightly
// rollup exists.
//
// The nightly cron writes yesterday's row at 04:00. "Run rollup" lets you
// backfill or refresh a day without waiting — it is idempotent server-side
// (unique on company_id + day), so clicking twice cannot duplicate anything.

import { Fragment, useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Row,
  Col,
  Card,
  CardBody,
  Label,
  Table,
  Spinner,
  Button,
  Badge,
} from "reactstrap";
import { useTranslation } from "react-i18next";
import { Play } from "react-feather";

import DateInput from "@components/date-input";
import { getUsage, runUsageRollup } from "../store";

const todayISO = () => new Date().toISOString().slice(0, 10);

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

// `documents_created` is keyed by TypeORM class name; show the human word.
const DOC_LABELS = {
  QuotationEntity: "Quotations",
  PurchaseOrderEntity: "Sales Orders",
  PoVendorEntity: "Vendor POs",
  GrnEntity: "GRNs",
  DebitNoteEntity: "Debit Notes",
  InvoiceEntity: "Invoices",
  ProductEntity: "Products",
  VendorEntity: "Vendors",
  CustomerEntity: "Customers",
  UserEntity: "Users",
  RoleEntity: "Roles",
  CompanyEntity: "Companies",
};

const docSummary = (docs) => {
  const entries = Object.entries(docs || {});
  if (!entries.length) return "—";
  return entries
    .map(([k, v]) => `${v} ${DOC_LABELS[k] || k}`)
    .join(", ");
};

const UsageTab = ({ reloadKey }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.trackingLogs);
  const { days, totals } = store.usage;

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rollupDay, setRollupDay] = useState(todayISO());

  const load = useCallback(() => {
    dispatch(getUsage({ from: from || undefined, to: to || undefined }));
  }, [dispatch, from, to]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const onRollup = async () => {
    await dispatch(runUsageRollup(rollupDay || undefined));
    load();
  };

  return (
    <Fragment>
      <Row className="mb-1">
        <StatTile
          label={t("API calls")}
          value={(totals?.api_calls ?? 0).toLocaleString()}
        />
        <StatTile
          label={t("Error rate")}
          value={`${totals?.error_rate_pct ?? 0}%`}
          hint={`${(totals?.api_errors ?? 0).toLocaleString()} ${t("errors")}`}
        />
        <StatTile
          label={t("Peak active users")}
          value={totals?.peak_active_users ?? 0}
          hint={t("busiest single day")}
        />
        <StatTile
          label={t("Documents created")}
          value={Object.values(totals?.documents_created || {}).reduce(
            (a, b) => a + Number(b),
            0
          )}
        />
      </Row>

      <Row className="mb-2 align-items-end">
        <Col md="3" className="mb-1">
          <Label className="form-label">{t("From")}</Label>
          <DateInput
            id="usage-from"
            value={from}
            onChange={(d, str, iso) => setFrom(iso || "")}
            placeholder={t("YYYY-MM-DD")}
          />
        </Col>
        <Col md="3" className="mb-1">
          <Label className="form-label">{t("To")}</Label>
          <DateInput
            id="usage-to"
            value={to}
            onChange={(d, str, iso) => setTo(iso || "")}
            placeholder={t("YYYY-MM-DD")}
          />
        </Col>
        <Col md="3" className="mb-1">
          <Label className="form-label">{t("Roll up a day")}</Label>
          <DateInput
            id="usage-rollup-day"
            value={rollupDay}
            onChange={(d, str, iso) => setRollupDay(iso || "")}
            placeholder={t("YYYY-MM-DD")}
          />
        </Col>
        <Col md="3" className="mb-1">
          <Button
            color="primary"
            outline
            disabled={store.rollingUp}
            onClick={onRollup}
          >
            {store.rollingUp ? (
              <Spinner size="sm" className="me-50" />
            ) : (
              <Play size={14} className="me-50" />
            )}
            {t("Run rollup")}
          </Button>
        </Col>
      </Row>

      {store.loadingUsage ? (
        <div className="text-center py-4">
          <Spinner />
        </div>
      ) : !days?.length ? (
        <div className="text-center text-muted py-4">
          {t(
            "No usage rolled up yet. The nightly job runs at 4am — or roll up a day now."
          )}
        </div>
      ) : (
        <div className="table-responsive">
          <Table size="sm" className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 120 }}>{t("Day")}</th>
                <th style={{ width: 240 }}>{t("Company")}</th>
                <th style={{ width: 110 }} className="text-end">
                  {t("API calls")}
                </th>
                <th style={{ width: 90 }} className="text-end">
                  {t("Errors")}
                </th>
                <th style={{ width: 100 }} className="text-end">
                  {t("p95")}
                </th>
                <th style={{ width: 110 }} className="text-end">
                  {t("Active users")}
                </th>
                <th>{t("Documents created")}</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d._id}>
                  <td className="text-nowrap">{d.day}</td>
                  <td className="small text-muted">
                    <code>{d.company_id?.slice(0, 8)}…</code>
                  </td>
                  <td className="text-end">
                    {Number(d.api_calls).toLocaleString()}
                  </td>
                  <td className="text-end">
                    {d.api_errors > 0 ? (
                      <Badge color="light-danger">{d.api_errors}</Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-end">
                    {d.p95_duration_ms != null ? `${d.p95_duration_ms} ms` : "—"}
                  </td>
                  <td className="text-end">{d.active_users}</td>
                  <td className="small">{docSummary(d.documents_created)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Fragment>
  );
};

export default UsageTab;
