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
// are click-to-toggle; Total + money tiles are inert.

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Col, Row, Spinner } from "reactstrap";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { formatIndianMoney } from "@src/utility/indianMoney";
import { STATS_CONFIG } from "./stats.config";

const COLOR_BG = {
  info: "#00cfe8",
  success: "#28c76f",
  warning: "#ff9f43",
  danger: "#ea5455",
  secondary: "#82868b",
};

const isSameStatusKey = (a, b) => {
  // a and b are either "" or a single status or a csv. Normalize.
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

  // Stringify filters for stable dep — avoids refetch when caller
  // recreates the object identically.
  const filterKey = useMemo(() => JSON.stringify(filters || {}), [filters]);

  useEffect(() => {
    if (!endpoint) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setErrored(false);
      instance
        .get(endpoint, { params: filters })
        .then((resp) => {
          setData(resp?.data?.data || null);
        })
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
  }, [filterKey, endpoint]);

  if (!config) return null;

  const renderValue = (tile) => {
    if (errored) return "—";
    if (loading && !data) return <Spinner size="sm" />;
    if (!data) return "0";
    if (tile.money) return formatIndianMoney(data[tile.money]);
    // Generic top-level metric (e.g. follow_ups_overdue, unassigned_count).
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
        return (
          <Col
            sm={6}
            key={tile.key}
            style={{ flex: "1 1 0" }}
          >
            <div
              className="d-flex flex-column justify-content-center py-2 px-3 rounded-3 shadow-sm"
              style={{
                backgroundColor: COLOR_BG[tile.color] || COLOR_BG.secondary,
                color: "#fff",
                cursor: clickable ? "pointer" : "default",
                outline: active ? "3px solid rgba(255,255,255,0.65)" : "none",
                outlineOffset: -3,
                minHeight: 72,
              }}
              onClick={
                clickable ? () => onStatusClick(tileCsv(tile)) : undefined
              }
            >
              <div
                className="fw-bold"
                style={{ fontSize: "1.6rem", lineHeight: 1.1, color: "#fff" }}
              >
                {renderValue(tile)}
              </div>
              <div
                className="small mt-1"
                style={{ opacity: 0.95, color: "#fff" }}
              >
                {t(tile.label)}
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
