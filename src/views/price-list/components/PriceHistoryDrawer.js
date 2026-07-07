// Price history for one (vendor, product) pair, shown in a right-side drawer
// (Offcanvas) — mirrors the Vendor Pricing drawer on the product listing.
// Lists every version newest first, reusing GET /price-list/list with both
// filters (all versions, not current-only).

import { useEffect, useState } from "react";
import {
  Offcanvas,
  OffcanvasHeader,
  OffcanvasBody,
  Spinner,
  Table,
  Badge,
} from "reactstrap";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { formatDate } from "@src/utility/dateFormat";

const money = (v, sym) =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v))
    ? "-"
    : `${sym || "₹"}${Number(v).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

const sourceLabel = (r, t) =>
  r?.source_type === "rfq"
    ? r?.source_rfq_voucher_no || t("RFQ")
    : r?.source_type || "manual";

const PriceHistoryDrawer = ({ open, toggle, vendorId, productId, title }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!open || !vendorId || !productId) return;
    let alive = true;
    setLoading(true);
    instance
      .get(API_ENDPOINTS.priceList.list, {
        params: {
          vendor_id: vendorId,
          product_id: productId,
          perPage: 200,
          page: 1,
          orderBy: "effective_date",
          orderDirection: "desc",
        },
      })
      .then((res) => {
        if (!alive) return;
        setRows(res?.data?.data || []);
      })
      .catch(() => alive && setRows([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open, vendorId, productId]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Offcanvas
      direction="end"
      isOpen={open}
      toggle={toggle}
      style={{ width: 540 }}
    >
      <OffcanvasHeader toggle={toggle}>
        <div className="fw-bold">{t("Price History")}</div>
        {title ? (
          <div className="small text-muted text-capitalize">{title}</div>
        ) : null}
      </OffcanvasHeader>
      <OffcanvasBody>
        {loading ? (
          <div className="d-flex justify-content-center py-4">
            <Spinner color="primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center text-muted py-4">
            {t("No price history.")}
          </div>
        ) : (
          <Table responsive size="sm" className="mb-0">
            <thead className="table-light">
              <tr>
                <th>{t("Price")}</th>
                <th className="text-nowrap">{t("Effective From")}</th>
                <th className="text-end">{t("Lead")}</th>
                <th>{t("Source")}</th>
                <th className="text-center">{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const sym = r?.currency_symbol || r?.currency_code || "";
                const end = r?.effective_until
                  ? String(r.effective_until).slice(0, 10)
                  : null;
                // The newest non-expired row is the current one.
                const isCurrent = idx === 0 && (!end || end >= today);
                return (
                  <tr key={r._id}>
                    <td className="fw-semibold">
                      {money(r.unit_price, sym)}
                    </td>
                    <td>{formatDate(r.effective_date)}</td>
                    <td className="text-end">
                      {r.lead_time_days != null ? r.lead_time_days : "-"}
                    </td>
                    <td className="text-capitalize text-nowrap">
                      {sourceLabel(r, t)}
                    </td>
                    <td className="text-center">
                      {isCurrent ? (
                        <Badge color="light-success" pill>
                          {t("Current")}
                        </Badge>
                      ) : (
                        <Badge color="light-secondary" pill>
                          {t("Past")}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </OffcanvasBody>
    </Offcanvas>
  );
};

export default PriceHistoryDrawer;
