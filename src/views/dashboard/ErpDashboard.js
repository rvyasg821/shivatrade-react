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
import { Row, Col, Card, CardBody, CardHeader, CardTitle, Table, Spinner, Button } from "reactstrap";
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
  Download,
} from "react-feather";
import Notification from "@components/toast/notification";

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
    .then(
      (r) =>
        Number(
          r?.data?._metadata?.pagination?.total ?? (r?.data?.data || []).length
        ) || 0
    )
    .catch(() => 0);

const ErpDashboard = ({ period = "fy", customFrom = "", customTo = "" }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Period window for the time-based figures. "month" = 1st of the current
  // month → today; "fy" = 1 Apr (Indian FY) → today; "custom" = the operator's
  // picked from/to range. Only revenue/leaderboard and the "created in range"
  // KPI counts use it; current-state cards (Stock Value, Needs attention,
  // entity counts) ignore it and stay live.
  const dateParams = useMemo(() => {
    const now = new Date();
    const iso = (dt) =>
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
        dt.getDate()
      ).padStart(2, "0")}`;
    // Custom range: only once BOTH ends are set (else fall back to FY so the
    // dashboard never queries a half-open window).
    if (period === "custom" && customFrom && customTo) {
      return { date_from: customFrom, date_to: customTo };
    }
    const date_to = iso(now);
    let date_from;
    if (period === "month") {
      date_from = iso(new Date(now.getFullYear(), now.getMonth(), 1));
    } else {
      const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      date_from = `${fyStartYear}-04-01`;
    }
    return { date_from, date_to };
  }, [period, customFrom, customTo]);

  const periodLabel =
    period === "month"
      ? t("This Month")
      : period === "custom" && customFrom && customTo
      ? `${customFrom} — ${customTo}`
      : t("Financial Year");

  const authUserItem = useSelector((s) => s.auth?.authUserItem) || null;
  const companyData = useSelector((s) => s.auth?.companyData) || null;
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
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    if (!anyVisible) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);

    // Fetch only what the role can see; everything else stays undefined.
    // Time-based figures pass the period window (dateParams); current-state
    // cards omit it. quoteStatsLive is an UNFILTERED quotation fetch that backs
    // the always-live "Quotations draft / sent" attention count (the filtered
    // quoteStats drives the period-scoped KPI total instead). SO "waiting for
    // POV" and invoice "overdue" stay live server-side, so no twin fetch there.
    const jobs = {
      invoiceStats: vis.invoices
        ? get(API_ENDPOINTS.invoices.stats, dateParams)
        : null,
      leaderboard: vis.invoices
        ? get(API_ENDPOINTS.invoices.leaderboard, dateParams)
        : null,
      soStats: vis.sales
        ? get(API_ENDPOINTS.purchaseOrders.stats, dateParams)
        : null,
      quoteStats: vis.quotations
        ? get(API_ENDPOINTS.quotations.stats, dateParams)
        : null,
      quoteStatsLive: vis.quotations
        ? get(API_ENDPOINTS.quotations.stats)
        : null,
      povStats: vis.pov ? get(API_ENDPOINTS.poVendors.stats, dateParams) : null,
      grnStats: vis.pov ? get(API_ENDPOINTS.grn.stats) : null,
      dnOpen: vis.pov
        ? countOf(API_ENDPOINTS.debitNotes.list, { status: "issued" })
        : null,
      invStats: vis.inventory ? get(API_ENDPOINTS.inventory.stats) : null,
      leadStats: vis.leads ? get(API_ENDPOINTS.leads.stats, dateParams) : null,
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
  }, [anyVisible, authUserItem?._id, period, customFrom, customTo]);

  if (!anyVisible) return null;

  // ── Derived figures ──────────────────────────────────────────────────
  const bySo = d?.soStats?.by_status || {};
  const byPov = d?.povStats?.by_status || {};
  // Attention "draft / sent" reads the UNFILTERED quotation stats so it stays
  // live regardless of the selected period (the KPI total uses the filtered one).
  const byQuote = d?.quoteStatsLive?.by_status || {};
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
      value: inr(d?.invStats?.stock_value_inr),
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

  // WYSIWYG export payload — reuses the already-rendered card/table data
  // (same formatting the screen uses) so the exported file can never drift
  // from what's on screen; the backend only styles it into a file.
  const buildExportPayload = () => ({
    companyName: companyData?.company_name || companyData?.name || "ShivaTrade",
    locationName: authUserItem?.location?.name || "",
    periodLabel,
    kpis: kpis.map((k) => ({ label: k.label, value: String(k.value), sub: k.sub || "" })),
    attention: attention.map((a) => ({ label: a.label, value: String(a.value), sub: a.sub || "" })),
    counts: counts.map((c) => ({ label: c.label, value: String(c.value) })),
    topCustomers: topCustomers.map((r) => ({
      name: r.name,
      invoices: `${num(r.invoices)} ${t("inv")}`,
      amount: inr(r.amount_inr),
    })),
    topProducts: topProducts.map((r) => ({
      name: r.name,
      qty: `${num(r.qty).toLocaleString()}${r.uom ? ` ${r.uom}` : ""}`,
      amount: inr(r.amount_inr),
    })),
  });

  const handleExportFile = async (kind) => {
    setExporting(kind);
    try {
      const url =
        kind === "excel" ? API_ENDPOINTS.dashboard.exportExcel : API_ENDPOINTS.dashboard.exportPdf;
      const res = await instance.post(url, buildExportPayload(), {
        responseType: "blob",
      });
      const blobUrl = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `Dashboard-Summary-${new Date().toISOString().split("T")[0]}.${
        kind === "excel" ? "xlsx" : "pdf"
      }`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      Notification("Error", t("Failed to export dashboard"), "warning");
    } finally {
      setExporting(null);
    }
  };

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
      <div className="d-flex justify-content-end gap-1 mb-1">
        <Button
          color="secondary"
          outline
          size="sm"
          disabled={!d || !!exporting}
          onClick={() => handleExportFile("excel")}
        >
          <Download size={14} className="me-50" />
          {exporting === "excel" ? t("Exporting…") : t("Export Excel")}
        </Button>
        <Button
          color="secondary"
          outline
          size="sm"
          disabled={!d || !!exporting}
          onClick={() => handleExportFile("pdf")}
        >
          <Download size={14} className="me-50" />
          {exporting === "pdf" ? t("Exporting…") : t("Export PDF")}
        </Button>
      </div>

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
                          <td className="text-end text-muted" style={{ width: 90 }}>
                            {num(r.qty).toLocaleString()}
                            {r.uom ? ` ${r.uom}` : ""}
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
