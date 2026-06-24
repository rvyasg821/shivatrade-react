// Inventory listing KPI cards (read-only). Mirrors the VoucherStatsTiles
// visual style — white card, tinted-square icon, uppercase label + bold
// number — but these are inert metrics (no statuses to click-filter), and
// they reflect the listing's active filters (the parent re-fetches stats
// whenever a filter changes).
//
//   • Stock Value (₹)   — Σ(received_qty × unit_price), goods-inward valuation
//   • Stock Lines       — receipt lines in the filtered set
//   • Distinct Products — SKUs in stock
//   • Vendors           — vendors supplying the current stock

import { Col, Row } from "reactstrap";
import { DollarSign, Layers, Package, Truck } from "react-feather";
import { useTranslation } from "react-i18next";

import { formatIndianMoney } from "@src/utility/indianMoney";

const PALETTE = {
  success: { iconBg: "#d9f5e3", iconFg: "#28c76f" },
  info: { iconBg: "#e0f7fb", iconFg: "#00cfe8" },
  warning: { iconBg: "#ffe5d0", iconFg: "#ff9f43" },
  secondary: { iconBg: "#eaeaeb", iconFg: "#82868b" },
};

const Tile = ({ icon: Icon, color, label, value, subtitle }) => {
  const { t } = useTranslation();
  const palette = PALETTE[color] || PALETTE.secondary;
  return (
    <Col sm={6} style={{ flex: "1 1 0" }}>
      <div
        className="d-flex align-items-center"
        style={{
          background: "#fff",
          border: "1px solid #ebe9f1",
          borderRadius: "0.5rem",
          boxShadow: "0 4px 24px 0 rgba(34, 41, 47, 0.06)",
          padding: "1rem 1.25rem",
          gap: "1rem",
          minHeight: 92,
        }}
      >
        <div
          className="d-flex align-items-center justify-content-center"
          style={{
            background: palette.iconBg,
            color: palette.iconFg,
            width: 48,
            height: 48,
            borderRadius: "0.5rem",
            flexShrink: 0,
          }}
        >
          <Icon size={22} />
        </div>
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div
            className="text-uppercase"
            style={{
              fontSize: "0.72rem",
              letterSpacing: "0.5px",
              fontWeight: 500,
              color: "#6e6b7b",
              marginBottom: "0.35rem",
            }}
          >
            {t(label)}
          </div>
          <div
            className="fw-bold text-truncate"
            style={{ fontSize: "1.5rem", lineHeight: 1.1, color: "#1a2238" }}
          >
            {value}
          </div>
          {subtitle ? (
            <div
              className="small mt-25"
              style={{ fontSize: "0.72rem", color: "#6e6b7b" }}
            >
              {t(subtitle)}
            </div>
          ) : null}
        </div>
      </div>
    </Col>
  );
};

const InventoryStatsCards = ({ stats }) => {
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <Row className="g-2 mb-1">
      <Tile
        icon={DollarSign}
        color="success"
        label="Stock Value"
        value={formatIndianMoney(num(stats?.stock_value))}
        subtitle="Received & accepted (INR)"
      />
      <Tile
        icon={Layers}
        color="info"
        label="Stock Lines"
        value={num(stats?.line_count).toLocaleString("en-IN")}
      />
      <Tile
        icon={Package}
        color="warning"
        label="Distinct Products"
        value={num(stats?.product_count).toLocaleString("en-IN")}
      />
      <Tile
        icon={Truck}
        color="secondary"
        label="Vendors"
        value={num(stats?.vendor_count).toLocaleString("en-IN")}
      />
    </Row>
  );
};

export default InventoryStatsCards;
