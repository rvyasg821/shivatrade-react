// Employee listing KPI cards (read-only). Same visual language as
// InventoryStatsCards — white card, tinted-square icon, uppercase label +
// bold number.
//
// The numbers describe the CURRENT listing: search and location narrow them,
// and a Location Admin only ever sees their own scope, because the backend
// builds them from the same filter as /list. The status filter is the one
// exception — Active and Inactive are tiles here, so filtering the table to
// ACTIVE must not zero the Inactive tile.
//
//   • Total Employees — everyone in the filtered set
//   • Active          — is_active
//   • Inactive        — total − active
//   • Locations       — distinct locations they sit across

import { Col, Row } from "reactstrap";
import { Users, UserCheck, UserX, MapPin } from "react-feather";
import { useTranslation } from "react-i18next";

const PALETTE = {
  primary: { iconBg: "#e0e3ff", iconFg: "#7367f0" },
  success: { iconBg: "#d9f5e3", iconFg: "#28c76f" },
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

const EmployeeStatsCards = ({ stats }) => {
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const fmt = (v) => num(v).toLocaleString("en-IN");

  return (
    <Row className="g-2 mb-1">
      <Tile
        icon={Users}
        color="primary"
        label="Total Employees"
        value={fmt(stats?.total)}
        subtitle="in the current view"
      />
      <Tile
        icon={UserCheck}
        color="success"
        label="Active"
        value={fmt(stats?.active)}
      />
      <Tile
        icon={UserX}
        color="warning"
        label="Inactive"
        value={fmt(stats?.inactive)}
      />
      <Tile
        icon={MapPin}
        color="secondary"
        label="Locations"
        value={fmt(stats?.locations)}
        subtitle="distinct locations covered"
      />
    </Row>
  );
};

export default EmployeeStatsCards;
