// VoucherStatsTiles — reusable KPI strip rendered above a listing page.
//
// Usage:
//   <VoucherStatsTiles
//     module="lead"                       // key into STATS_CONFIG
//     filters={{ status, source, search, ... }}
//     activeStatuses={statusFilter || ""} // current list filter value (csv or single)
//     onStatusClick={(csvOrSingle) => {   // toggle the list's status filter
//       setStatusFilter(prev => prev === csvOrSingle ? "" : csvOrSingle);
//     }}
//   />
//
// One fetch per `filters` change (debounced 250ms). Tiles with `statuses`
// are click-to-toggle; Total / money / metric tiles are inert.
//
// Visual style: white card, subtle border + soft shadow, tinted-square
// icon on the left, uppercase label + bold number on the right. Active
// (filtered) state highlights with a ring in the tile's accent color.

import { useEffect, useMemo, useRef, useState } from "react";
import { Col, Row, Spinner } from "reactstrap";
import { useTranslation } from "react-i18next";
import * as Icons from "react-feather";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { formatIndianMoney } from "@src/utility/indianMoney";
import { STATS_CONFIG } from "./stats.config";

// (color → { iconBg: light tint behind the icon, iconFg: icon foreground })
const COLOR_PALETTE = {
  info:      { iconBg: "#e0f7fb", iconFg: "#00cfe8" },
  success:   { iconBg: "#d9f5e3", iconFg: "#28c76f" },
  warning:   { iconBg: "#ffe5d0", iconFg: "#ff9f43" },
  danger:    { iconBg: "#fde0e0", iconFg: "#ea5455" },
  secondary: { iconBg: "#eaeaeb", iconFg: "#82868b" },
};

const isSameStatusKey = (a, b) => {
  const norm = (v) =>
    typeof v === "string"
      ? v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .sort()
          .join(",")
      : "";
  return norm(a) === norm(b);
};

const VoucherStatsTiles = ({
  module,
  filters = {},
  activeStatuses = "",
  onStatusClick,
  // Bump this from the parent (e.g. after a delete) to force a re-fetch even
  // when `filters` haven't changed.
  refreshKey = 0,
}) => {
  const { t } = useTranslation();
  const config = STATS_CONFIG[module];
  const endpoint =
    config && API_ENDPOINTS[config.endpointKey]?.stats
      ? API_ENDPOINTS[config.endpointKey].stats
      : null;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const debounceRef = useRef(null);

  const filterKey = useMemo(() => JSON.stringify(filters || {}), [filters]);

  useEffect(() => {
    if (!endpoint) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setErrored(false);
      instance
        .get(endpoint, { params: filters })
        .then((resp) => setData(resp?.data?.data || null))
        .catch(() => {
          setErrored(true);
          setData(null);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, endpoint, refreshKey]);

  if (!config) return null;

  const renderValue = (tile) => {
    if (errored) return "—";
    if (loading && !data) return <Spinner size="sm" />;
    if (!data) return "0";
    if (tile.money) return formatIndianMoney(data[tile.money]);
    if (tile.metric) return data[tile.metric] ?? 0;
    if (tile.key === "total") return data.total ?? 0;
    if (tile.statuses?.length) {
      return tile.statuses.reduce(
        (sum, s) => sum + (data.by_status?.[s] || 0),
        0
      );
    }
    return 0;
  };

  const tileCsv = (tile) =>
    tile.statuses?.length ? tile.statuses.join(",") : "";

  return (
    <Row className="g-2 mb-1">
      {config.tiles.map((tile) => {
        const clickable = !!tile.statuses?.length && !!onStatusClick;
        const active =
          clickable && isSameStatusKey(activeStatuses, tileCsv(tile));
        const palette =
          COLOR_PALETTE[tile.color] || COLOR_PALETTE.secondary;
        const Icon = (tile.icon && Icons[tile.icon]) || Icons.Activity;
        return (
          <Col xs={6} sm={6} key={tile.key} className="voucher-stat-col">
            <div
              className="d-flex align-items-center voucher-stat-tile"
              style={{
                background: "#fff",
                border: active
                  ? `2px solid ${palette.iconFg}`
                  : "1px solid #ebe9f1",
                borderRadius: "0.5rem",
                boxShadow: "0 4px 24px 0 rgba(34, 41, 47, 0.06)",
                cursor: clickable ? "pointer" : "default",
                padding: "1rem 1.25rem",
                gap: "1rem",
                minHeight: 92,
                transition: "border-color 120ms ease",
              }}
              onClick={
                clickable ? () => onStatusClick(tileCsv(tile)) : undefined
              }
            >
              <div
                className="d-flex align-items-center justify-content-center voucher-stat-icon"
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
                  {t(tile.label)}
                </div>
                <div
                  className="fw-bold voucher-stat-value text-break"
                  style={{
                    fontSize: "1.5rem",
                    lineHeight: 1.1,
                    color: "#1a2238",
                  }}
                >
                  {renderValue(tile)}
                </div>
                {tile.subtitle && (
                  <div
                    className="small mt-1"
                    style={{ fontSize: "0.72rem", color: "#6e6b7b" }}
                  >
                    {t(tile.subtitle)}
                  </div>
                )}
              </div>
            </div>
          </Col>
        );
      })}
    </Row>
  );
};

export default VoucherStatsTiles;

export { isSameStatusKey };
