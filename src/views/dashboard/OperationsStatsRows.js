// Dashboard rows for Sales / Purchase / Operations. Each card is gated by
// the matching module's `can_read` permission. Admin / Super Admin /
// Company Admin bypass all checks via `isAdminUser`. Cards navigate to the
// corresponding listing on click (filter wiring deferred — listing opens
// unfiltered for now).

import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardBody, Row, Col, Spinner, Badge } from "reactstrap";
import {
  Users as UsersIcon,
  FileText,
  TrendingUp,
  Truck,
  Package,
  Archive,
  AlertTriangle,
  Activity,
  DollarSign,
} from "react-feather";
import { useTranslation } from "react-i18next";

import { fetchOperationsStats } from "./store";
import { appsRoot, isAdminUser } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";

const fmt = (v) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString();

const Tile = ({ icon: Icon, label, value, sub, color = "primary", onClick }) => (
  <Card
    className="h-100"
    style={{ cursor: onClick ? "pointer" : "default" }}
    onClick={onClick}
  >
    <CardBody className="d-flex align-items-start">
      <div
        className={`d-flex align-items-center justify-content-center rounded bg-light-${color} me-1`}
        style={{ width: 44, height: 44, flexShrink: 0 }}
      >
        <Icon size={20} className={`text-${color}`} />
      </div>
      <div className="flex-grow-1">
        <div
          className="text-muted text-uppercase fw-bold mb-25"
          style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}
        >
          {label}
        </div>
        <div className="fw-bolder" style={{ fontSize: "1.4rem", lineHeight: 1 }}>
          {value}
        </div>
        {sub && <small className="text-muted d-block mt-25">{sub}</small>}
      </div>
    </CardBody>
  </Card>
);

const SectionHeader = ({ title, subtitle }) => (
  <div className="d-flex align-items-end justify-content-between mb-1 mt-2">
    <div>
      <h4 className="mb-0">{title}</h4>
      {subtitle && <small className="text-muted">{subtitle}</small>}
    </div>
  </div>
);

const OperationsStatsRows = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { operationsStats, operationsStatsLoading } = useSelector(
    (s) => s.DashboardWidgets || {}
  );
  const authUserItem = useSelector((s) => s.auth?.authUserItem);
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions || {};
  const can = (slug) =>
    isAdmin || perms?.[slug]?.can_all || perms?.[slug]?.can_read;

  useEffect(() => {
    dispatch(fetchOperationsStats("month"));
  }, [dispatch]);

  const sales = operationsStats?.sales || null;
  const purchase = operationsStats?.purchase || null;
  const operations = operationsStats?.operations || null;

  const showSales =
    can("leads") || can("quotations") || can("pfi");
  const showPurchase = can("purchase-orders") || can("po-vendors");
  const showOps = can("po-vendors") || can("tracking");

  // Resolve home currency symbol from authUserItem -> companyItem fallback.
  const companyItem = useSelector((s) => s.company?.companyItem);
  const sym = companyItem?.currency_symbol || "₹";

  if (operationsStatsLoading && !operationsStats) {
    return (
      <div className="text-center py-3">
        <Spinner /> <span className="ms-2">{t("Loading dashboard…")}</span>
      </div>
    );
  }

  return (
    <div className="dashboard-ops-rows">
      {/* ── Sales ── */}
      {showSales && sales && (
        <>
          <SectionHeader
            title={t("Sales")}
            subtitle={t("Pipeline activity this month")}
          />
          <Row>
            {can("leads") && (
              <Col md="3" sm="6" className="mb-2">
                <Tile
                  icon={UsersIcon}
                  label={t("Active Leads")}
                  value={fmt(sales.activeLeads)}
                  color="info"
                  onClick={() => navigate(`${appsRoot}/leads`)}
                />
              </Col>
            )}
            {can("quotations") && (
              <Col md="3" sm="6" className="mb-2">
                <Tile
                  icon={FileText}
                  label={t("Open Quotations")}
                  value={fmt(sales.openQuotations)}
                  color="primary"
                  onClick={() => navigate(`${appsRoot}/quotations`)}
                />
              </Col>
            )}
            {can("pfi") && (
              <Col md="3" sm="6" className="mb-2">
                <Tile
                  icon={FileText}
                  label={t("Approved PFIs")}
                  value={fmt(sales.approvedPfis)}
                  color="success"
                  onClick={() => navigate(`${appsRoot}/pfi`)}
                />
              </Col>
            )}
            {can("quotations") && (
              <Col md="3" sm="6" className="mb-2">
                <Tile
                  icon={TrendingUp}
                  label={t("Pipeline Value")}
                  value={`${sym} ${fmt(sales.pipelineValue)}`}
                  sub={t("Open quotations · home currency")}
                  color="warning"
                  onClick={() => navigate(`${appsRoot}/quotations`)}
                />
              </Col>
            )}
          </Row>
        </>
      )}

      {/* ── Purchase ── */}
      {showPurchase && purchase && (
        <>
          <SectionHeader
            title={t("Purchase")}
            subtitle={t("Procurement health")}
          />
          <Row>
            {can("purchase-orders") && (
              <Col md="3" sm="6" className="mb-2">
                <Tile
                  icon={Truck}
                  label={t("Open POs")}
                  value={fmt(
                    (purchase.posByStatus?.confirmed || 0) +
                      (purchase.posByStatus?.in_process || 0)
                  )}
                  sub={`${t("Draft")}: ${
                    purchase.posByStatus?.draft || 0
                  } · ${t("Completed")}: ${
                    purchase.posByStatus?.completed || 0
                  }`}
                  color="primary"
                  onClick={() => navigate(`${appsRoot}/purchase-orders`)}
                />
              </Col>
            )}
            {can("po-vendors") && (
              <Col md="3" sm="6" className="mb-2">
                <Tile
                  icon={Package}
                  label={t("POVs Draft")}
                  value={fmt(purchase.povsByStatus?.draft || 0)}
                  color="secondary"
                  onClick={() => navigate(`${appsRoot}/po-vendors`)}
                />
              </Col>
            )}
            {can("po-vendors") && (
              <Col md="3" sm="6" className="mb-2">
                <Tile
                  icon={Truck}
                  label={t("POVs Dispatched")}
                  value={fmt(purchase.povsByStatus?.dispatched || 0)}
                  color="warning"
                  onClick={() => navigate(`${appsRoot}/po-vendors`)}
                />
              </Col>
            )}
            {can("po-vendors") && (
              <Col md="3" sm="6" className="mb-2">
                <Tile
                  icon={Archive}
                  label={t("POVs Closed")}
                  value={fmt(purchase.povsByStatus?.closed || 0)}
                  color="success"
                  onClick={() => navigate(`${appsRoot}/po-vendors`)}
                />
              </Col>
            )}
          </Row>

          {/* Top vendors */}
          {can("po-vendors") &&
            purchase.topVendorsThisMonth?.length > 0 && (
              <Card className="mb-2">
                <CardBody>
                  <h6
                    className="text-uppercase fw-bold text-muted mb-1"
                    style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}
                  >
                    {t("Top vendors this month")}
                  </h6>
                  <ul className="list-unstyled mb-0">
                    {purchase.topVendorsThisMonth.map((v) => (
                      <li
                        key={v.vendor_id}
                        className="d-flex justify-content-between align-items-center py-25 border-bottom"
                      >
                        <span className="fw-semibold">{v.vendor_name}</span>
                        <span className="text-end">
                          <div>
                            <b>{v.povCount}</b>{" "}
                            <small className="text-muted">{t("POVs")}</small>
                          </div>
                          {v.totalValue > 0 && (
                            <small className="text-muted">
                              {sym} {fmt(v.totalValue)}
                            </small>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}
        </>
      )}

      {/* ── Operations ── */}
      {showOps && operations && (
        <>
          <SectionHeader
            title={t("Operations")}
            subtitle={t("Dispatch / receipt activity")}
          />
          <Row>
            {can("tracking") && (
              <Col md="3" sm="6" className="mb-2">
                <Tile
                  icon={Activity}
                  label={t("Tracking events today")}
                  value={fmt(operations.trackingEventsToday)}
                  color="info"
                  onClick={() => navigate(`${appsRoot}/tracking`)}
                />
              </Col>
            )}
            {can("po-vendors") && (
              <Col md="3" sm="6" className="mb-2">
                <Tile
                  icon={Truck}
                  label={t("POVs Awaiting Receipt")}
                  value={fmt(operations.povsAwaitingReceipt)}
                  color="warning"
                  onClick={() => navigate(`${appsRoot}/po-vendors`)}
                />
              </Col>
            )}
            {can("po-vendors") && (
              <Col md="3" sm="6" className="mb-2">
                <Tile
                  icon={AlertTriangle}
                  label={t("Overdue Arrivals")}
                  value={fmt(operations.overdueArrivals)}
                  sub={t("Expected date passed")}
                  color={
                    operations.overdueArrivals > 0 ? "danger" : "secondary"
                  }
                  onClick={() => navigate(`${appsRoot}/po-vendors`)}
                />
              </Col>
            )}
          </Row>

          {/* Recent tracking feed */}
          {can("tracking") &&
            operations.recentTrackingEvents?.length > 0 && (
              <Card className="mb-2">
                <CardBody>
                  <h6
                    className="text-uppercase fw-bold text-muted mb-1"
                    style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}
                  >
                    {t("Recent tracking events")}
                  </h6>
                  <ul className="list-unstyled mb-0">
                    {operations.recentTrackingEvents.map((e) => (
                      <li
                        key={e._id}
                        className="py-25 border-bottom small"
                      >
                        <div className="d-flex justify-content-between">
                          <span className="fw-semibold text-capitalize">
                            {e.event_type || "event"}
                          </span>
                          <span className="text-muted">
                            {e.event_at ? formatDate(e.event_at) : ""}
                          </span>
                        </div>
                        {e.location && (
                          <small className="text-muted">{e.location}</small>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}
        </>
      )}
    </div>
  );
};

export default OperationsStatsRows;
