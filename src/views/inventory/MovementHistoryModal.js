// Stock movement history for one product — drill-in from the Stock Summary.
// Read-only ledger view: Date · Type (IN/OUT) · Source (voucher, hyperlinked)
// · Qty (signed) · Running balance.

import { Fragment, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Offcanvas,
  OffcanvasHeader,
  OffcanvasBody,
  Spinner,
  Badge,
  Table,
} from "reactstrap";
import { ExternalLink, ArrowDownLeft, ArrowUpRight } from "react-feather";
import { useTranslation } from "react-i18next";

import { getMovementHistory, clearMovementHistory } from "./store";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";

const fmtQty = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

// Per source_type → the detail route to hyperlink the voucher.
const SOURCE_ROUTE = {
  grn: (id) => `${appsRoot}/grn/view/${id}`,
  invoice: (id) => `${appsRoot}/invoices/view/${id}`,
};

const MovementHistoryModal = ({ isOpen, productId, toggle }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const store = useSelector((s) => s.inventory);
  const data = store?.movementItem;
  const loading = store?.movementLoading;
  const error = store?.movementError;

  useEffect(() => {
    if (isOpen && productId) dispatch(getMovementHistory(productId));
    if (!isOpen) dispatch(clearMovementHistory());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, productId]);

  const product = data?.product || {};
  // Oldest first (bank-statement style) — the ledger already comes
  // oldest→newest with the running balance, so the latest row sits at the
  // bottom showing the current on-hand.
  const movements = data?.movements || [];

  return (
    <Offcanvas
      direction="end"
      isOpen={isOpen}
      toggle={toggle}
      style={{ width: 620 }}
    >
      <OffcanvasHeader toggle={toggle}>
        <div className="fw-bold">{t("Stock Movements")}</div>
        {product?.product_name ? (
          <div className="small text-muted">
            {product.product_name}
            {product?.product_code ? (
              <span className="text-uppercase"> · {product.product_code}</span>
            ) : null}
          </div>
        ) : null}
      </OffcanvasHeader>
      <OffcanvasBody>
        {loading ? (
          <div className="text-center py-4">
            <Spinner color="primary" />
          </div>
        ) : error ? (
          <div className="alert alert-warning mb-0">{error}</div>
        ) : movements.length === 0 ? (
          <div className="text-center text-muted py-4">
            {t("No stock movements for this product yet.")}
          </div>
        ) : (
          <Table responsive bordered size="sm" className="align-middle mb-0">
            <thead className="table-light">
              <tr className="text-nowrap">
                <th>{t("Date")}</th>
                <th>{t("Type")}</th>
                <th>{t("Source")}</th>
                <th className="text-end">{t("Qty")}</th>
                <th className="text-end">{t("Balance")}</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const qty = Number(m.qty) || 0;
                const isIn = qty >= 0;
                const route = SOURCE_ROUTE[m.source_type];
                return (
                  <tr key={m._id}>
                    <td className="text-nowrap">
                      {m.created_at ? formatDate(m.created_at) : "-"}
                    </td>
                    <td>
                      <Badge
                        color=""
                        className="text-nowrap text-white"
                        style={{
                          backgroundColor: isIn ? "#28c76f" : "#ea5455",
                        }}
                      >
                        {isIn ? (
                          <ArrowDownLeft size={12} className="me-25" />
                        ) : (
                          <ArrowUpRight size={12} className="me-25" />
                        )}
                        {isIn ? t("IN") : t("OUT")}
                      </Badge>
                      <div
                        className="small text-capitalize fw-medium mt-25"
                        style={{ color: "#5e5873" }}
                      >
                        {(m.movement_type || "").replace(/_/g, " ")}
                      </div>
                    </td>
                    <td className="text-nowrap">
                      {m.source_voucher_no ? (
                        route && m.source_id ? (
                          <Link
                            to={route(m.source_id)}
                            target="_blank"
                            rel="noreferrer"
                            className="d-inline-flex align-items-center"
                          >
                            {m.source_voucher_no}
                            <ExternalLink size={11} className="ms-50" />
                          </Link>
                        ) : (
                          m.source_voucher_no
                        )
                      ) : (
                        <span className="text-muted text-capitalize">
                          {m.source_type || "-"}
                        </span>
                      )}
                    </td>
                    <td
                      className={`text-end fw-bold text-nowrap ${
                        isIn ? "text-success" : "text-danger"
                      }`}
                    >
                      {isIn ? "+" : ""}
                      {fmtQty(qty)}
                    </td>
                    <td className="text-end text-nowrap">
                      {fmtQty(m.balance)}
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

export default MovementHistoryModal;
