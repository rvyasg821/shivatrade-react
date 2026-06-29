// Role-aware ERP dashboard.
//
// One rule drives the whole page: a card renders ONLY if the signed-in user
// can see that module — `isAdmin || perms[module]?.can_all || .can_read`.
// We also fetch a module's stats ONLY when it's visible, so a restricted user
// makes fewer calls and never sees data they're not allowed to.
//
// Layout: KPI numbers → "Needs attention" lists → Sales leaderboard.

import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Row, Col, Card, CardBody, CardHeader, CardTitle, Table, Spinner } from "reactstrap";
import { useTranslation } from "react-i18next";
import {
  DollarSign,
  Truck,
  FileText,
  Package,
  Box,
  UserPlus,
  AlertTriangle,
  Inbox,
  CornerUpLeft,
  Clock,
  Users,
  Award,
} from "react-feather";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot, isAdminUser } from "@constant/defaultValues";

// ERP module permission keys the dashboard cares about.
export const ERP_MODULES = [
  "invoices",
  "purchase-orders",
  "quotations",
  "po-vendors",
  "inventory",
  "leads",
  "customers",
  "vendors",
  "products",
];

// True when the user is an admin OR has read access to any ERP module — used by
// the dashboard to decide whether this is an ERP user (show ERP cards only) or
// a pure HR employee (show the attendance / leave view instead).
export const hasErpAccess = (authUserItem) => {
  if (isAdminUser(authUserItem)) return true;
  const perms = authUserItem?.role?.permissions || {};
  return ERP_MODULES.some(
    (m) => perms?.[m]?.can_all || perms?.[m]?.can_read
  );
};

// Shared grid for the stat-card blocks. auto-fill keeps a fixed track size so
// every card is the same width across KPIs / attention / counts; the last row
// leaves trailing tracks empty instead of stretching cards unevenly.
const CARD_GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
  gap: "1rem",
  marginBottom: "1rem",
};

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v) || 0);
const inr = (v) =>
  `₹${num(v).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

// Safe GET — never throws, returns the `data` envelope or null.
const get = (url, params) =>
  instance
    .get(url, params ? { params } : undefined)
    .then((r) => r?.data?.data ?? r?.data ?? null)
    .catch(() => null);

// Read a list endpoint's total count cheaply (perPage=1 → pagination.total).
const countOf = (url, params) =>
  instance
    .get(url, { params: { page: 1, perPage: 1, ...(params || {}) } })
    .then((r) => Number(r?.data?.pagination?.total ?? (r?.data?.data || []).length) || 0)
    .catch(() => 0);

const ErpDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const authUserItem = useSelector((s) => s.auth?.authUserItem) || null;
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions || {};

  // The one permission rule for every card.
  const can = (moduleKey) =>
    isAdmin || !!(perms?.[moduleKey]?.can_all || perms?.[moduleKey]?.can_read);

  // Which modules this user may see — drives both fetching and rendering.
  const vis = useMemo(
    () => ({
      invoices: can("invoices"),
      sales: can("purchase-orders"), // Sales Orders live in the PO module
      quotations: can("quotations"),
      pov: can("po-vendors"), // POV + GRN + Debit Note all gate on this
      inventory: can("inventory"),
      leads: can("leads"),
      customers: can("customers"),
      vendors: can("vendors"),
      products: can("products"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authUserItem?._id, isAdmin]
  );

  const anyVisible = Object.values(vis).some(Boolean);

  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!anyVisible) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);

    // Fetch only what the role can see; everything else stays undefined.
    const jobs = {
      invoiceStats: vis.invoices ? get(API_ENDPOINTS.invoices.stats) : null,
      leaderboard: vis.invoices ? get(API_ENDPOINTS.invoices.leaderboard) : null,
      soStats: vis.sales ? get(API_ENDPOINTS.purchaseOrders.stats) : null,
      quoteStats: vis.quotations ? get(API_ENDPOINTS.quotations.stats) : null,
      povStats: vis.pov ? get(API_ENDPOINTS.poVendors.stats) : null,
      grnStats: vis.pov ? get(API_ENDPOINTS.grn.stats) : null,
      dnOpen: vis.pov
        ? countOf(API_ENDPOINTS.debitNotes.list, { status: "issued" })
        : null,
      invStats: vis.inventory ? get(API_ENDPOINTS.inventory.stats) : null,
      leadStats: vis.leads ? get(API_ENDPOINTS.leads.stats) : null,
      customers: vis.customers ? countOf(API_ENDPOINTS.customers.list) : null,
      vendors: vis.vendors ? countOf(API_ENDPOINTS.vendors.list) : null,
      products: vis.products ? countOf(API_ENDPOINTS.products.list) : null,
    };

    Promise.all(Object.values(jobs)).then((vals) => {
      if (!mounted) return;
      const keys = Object.keys(jobs);
      const out = {};
      keys.forEach((k, i) => (out[k] = vals[i]));
      setD(out);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyVisible, authUserItem?._id]);

  if (!anyVisible) return null;

  // ── Derived figures ──────────────────────────────────────────────────
  const bySo = d?.soStats?.by_status || {};
  const byPov = d?.povStats?.by_status || {};
  const byQuote = d?.quoteStats?.by_status || {};
  const byGrn = d?.grnStats?.by_status || {};

  const openSos = num(bySo.draft) + num(bySo.confirmed) + num(bySo.in_process);
  const openPovs = num(byPov.draft) + num(byPov.dispatched);

  // ── KPI cards (Row 1) ────────────────────────────────────────────────
  const kpis = [
    vis.invoices && {
      key: "revenue",
      icon: DollarSign,
      tone: "success",
      label: t("Total Revenue"),
      value: inr(d?.invoiceStats?.total_amount_inr),
      to: `${appsRoot}/invoices`,
    },
    vis.sales && {
      key: "open-so",
      icon: Truck,
      tone: "primary",
      label: t("Open Sales Orders"),
      value: openSos,
      to: `${appsRoot}/purchase-orders`,
    },
    vis.quotations && {
      key: "quotes",
      icon: FileText,
      tone: "info",
      label: t("Quotations"),
      value: num(d?.quoteStats?.total),
      to: `${appsRoot}/quotations`,
    },
    vis.pov && {
      key: "open-pov",
      icon: Package,
      tone: "warning",
      label: t("Open Vendor POs"),
      value: openPovs,
      to: `${appsRoot}/po-vendors`,
    },
    vis.inventory && {
      key: "stock",
      icon: Box,
      tone: "secondary",
      label: t("Stock Value"),
      value: inr(d?.invStats?.stock_value),
      sub: `${num(d?.invStats?.product_count)} ${t("products")}`,
      to: `${appsRoot}/inventory`,
    },
    vis.leads && {
      key: "leads",
      icon: UserPlus,
      tone: "primary",
      label: t("Leads"),
      value: num(d?.leadStats?.total),
      to: `${appsRoot}/leads`,
    },
  ].filter(Boolean);

  // ── "Needs attention" cards (Row 2) ──────────────────────────────────
  const attention = [
    vis.quotations && {
      key: "quote-draft",
      icon: FileText,
      tone: "info",
      label: t("Quotations draft / sent"),
      value: num(byQuote.draft) + num(byQuote.sent),
      to: `${appsRoot}/quotations`,
    },
    vis.sales && {
      key: "wait-pov",
      icon: Clock,
      tone: "warning",
      label: t("SOs waiting for POV"),
      value: num(d?.soStats?.pending_pov),
      to: `${appsRoot}/purchase-orders`,
    },
    vis.pov && {
      key: "grn-pending",
      icon: Inbox,
      tone: "primary",
      label: t("GRNs pending receipt"),
      value: num(byGrn.draft),
      to: `${appsRoot}/po-vendors`,
    },
    vis.pov && {
      key: "dn-open",
      icon: CornerUpLeft,
      tone: "secondary",
      label: t("Debit Notes open"),
      value: num(d?.dnOpen),
      to: `${appsRoot}/po-vendors`,
    },
    vis.invoices && {
      key: "overdue",
      icon: AlertTriangle,
      tone: "danger",
      label: t("Invoices overdue"),
      value: num(d?.invoiceStats?.overdue),
      sub: num(d?.invoiceStats?.overdue) > 0 ? inr(d?.invoiceStats?.overdue_amount_inr) : null,
      to: `${appsRoot}/invoices`,
    },
  ].filter(Boolean);

  // ── Quick counts (customers / vendors / products) ────────────────────
  const counts = [
    vis.customers && {
      key: "customers",
      icon: Users,
      label: t("Customers"),
      value: num(d?.customers),
      to: `${appsRoot}/customers`,
    },
    vis.vendors && {
      key: "vendors",
      icon: Truck,
      label: t("Vendors"),
      value: num(d?.vendors),
      to: `${appsRoot}/vendors`,
    },
    vis.products && {
      key: "products",
      icon: Box,
      label: t("Products"),
      value: num(d?.products),
      to: `${appsRoot}/products`,
    },
  ].filter(Boolean);

  const lb = d?.leaderboard || {};
  const topCustomers = vis.invoices ? lb.top_customers || [] : [];
  const topProducts = vis.invoices ? lb.top_products || [] : [];

  if (loading && !d) {
    return (
      <div className="text-center py-4">
        <Spinner color="primary" /> <span className="ms-1">{t("Loading…")}</span>
      </div>
    );
  }

  const StatCard = ({ item }) => {
    const Icon = item.icon;
    return (
      <Card
        className="mb-0 h-100"
        onClick={item.to ? () => navigate(item.to) : undefined}
        style={item.to ? { cursor: "pointer" } : undefined}
      >
        <CardBody className="d-flex align-items-center">
          <div className={`avatar bg-light-${item.tone || "primary"} me-2`}>
            <div className="avatar-content">
              <Icon size={20} />
            </div>
          </div>
          <div className="min-w-0">
            <h4 className="fw-bolder mb-0 text-truncate">{item.value}</h4>
            <small className="text-muted">{item.label}</small>
            {item.sub ? (
              <div className="small text-muted">{item.sub}</div>
            ) : null}
          </div>
        </CardBody>
      </Card>
    );
  };

  return (
    <Fragment>
      {/* Row 1 — KPIs. Uniform CSS grid so every card is the same width
          across all blocks (auto-fill keeps a fixed track size; trailing
          tracks stay empty rather than stretching the cards unevenly). */}
      {kpis.length > 0 && (
        <div style={CARD_GRID}>
          {kpis.map((k) => (
            <StatCard key={k.key} item={k} />
          ))}
        </div>
      )}

      {/* Row 2 — Needs attention */}
      {attention.length > 0 && (
        <Fragment>
          <h5 className="mt-1 mb-1 text-muted">{t("Needs attention")}</h5>
          <div style={CARD_GRID}>
            {attention.map((a) => (
              <StatCard key={a.key} item={a} />
            ))}
          </div>
        </Fragment>
      )}

      {/* Quick counts */}
      {counts.length > 0 && (
        <div style={CARD_GRID}>
          {counts.map((c) => (
            <StatCard key={c.key} item={{ ...c, tone: "secondary" }} />
          ))}
        </div>
      )}

      {/* Row 3 — Leaderboard (invoices only) */}
      {vis.invoices && (topCustomers.length > 0 || topProducts.length > 0) && (
        <Row className="mt-1">
          <Col lg="6" className="mb-1">
            <Card className="mb-0 h-100">
              <CardHeader>
                <CardTitle tag="h6" className="mb-0 d-flex align-items-center">
                  <Award size={16} className="me-50" /> {t("Top Customers")}
                </CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <Table responsive size="sm" className="mb-0 align-middle">
                  <tbody>
                    {topCustomers.length === 0 ? (
                      <tr>
                        <td className="text-muted text-center py-2">
                          {t("No data yet.")}
                        </td>
                      </tr>
                    ) : (
                      topCustomers.map((r, i) => (
                        <tr key={r.customer_id || i}>
                          <td className="text-muted" style={{ width: 28 }}>
                            {i + 1}
                          </td>
                          <td className="text-capitalize">{r.name}</td>
                          <td className="text-end text-muted" style={{ width: 70 }}>
                            {num(r.invoices)} {t("inv")}
                          </td>
                          <td className="text-end fw-bold" style={{ width: 120 }}>
                            {inr(r.amount_inr)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          </Col>
          <Col lg="6" className="mb-1">
            <Card className="mb-0 h-100">
              <CardHeader>
                <CardTitle tag="h6" className="mb-0 d-flex align-items-center">
                  <Award size={16} className="me-50" /> {t("Top Products")}
                </CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <Table responsive size="sm" className="mb-0 align-middle">
                  <tbody>
                    {topProducts.length === 0 ? (
                      <tr>
                        <td className="text-muted text-center py-2">
                          {t("No data yet.")}
                        </td>
                      </tr>
                    ) : (
                      topProducts.map((r, i) => (
                        <tr key={r.product_id || i}>
                          <td className="text-muted" style={{ width: 28 }}>
                            {i + 1}
                          </td>
                          <td className="text-capitalize">{r.name}</td>
                          <td className="text-end text-muted" style={{ width: 70 }}>
                            {num(r.qty).toLocaleString()}
                          </td>
                          <td className="text-end fw-bold" style={{ width: 120 }}>
                            {inr(r.amount_inr)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}
    </Fragment>
  );
};

export default ErpDashboard;
