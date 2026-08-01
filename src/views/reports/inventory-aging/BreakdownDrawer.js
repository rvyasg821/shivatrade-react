// Drill-down behind one product's closing inventory in the Inventory Aging
// report: the PURCHASES (GRN receipts) and SALES (invoice lines) that net to
// the closing stock, plus a summary (purchased / sold / closing qty + ₹value).
// All money is INR — the same basis the aging report values stock at.

import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Offcanvas,
  OffcanvasHeader,
  OffcanvasBody,
  Spinner,
  Table,
  Row,
  Col,
  Card,
  CardBody,
} from "reactstrap";
import { ExternalLink, ArrowDownLeft, ArrowUpRight } from "react-feather";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot } from "@constant/defaultValues";

const grp = (v) =>
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const qtyFmt = (v) =>
  Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const Tile = ({ label, qty, value, tone }) => (
  <Col xs="4" className="mb-1">
    <Card className="mb-0 border">
      <CardBody className="py-1 px-1 text-center">
        <div className="text-muted small">{label}</div>
        <div className={`fw-bolder ${tone || ""}`} style={{ fontSize: "1.1rem" }}>
          {qtyFmt(qty)}
        </div>
        <div className="text-muted small">₹ {grp(value)}</div>
      </CardBody>
    </Card>
  </Col>
);

const BreakdownDrawer = ({ isOpen, productId, asOf, toggle }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !productId) return;
    let alive = true;
    setLoading(true);
    setError("");
    setData(null);
    instance
      .get(API_ENDPOINTS.reports.inventoryAgingBreakdown, {
        params: { product_id: productId, as_of: asOf || undefined },
      })
      .then((r) => {
        if (alive) setData(r?.data?.data || null);
      })
      .catch(() => {
        if (alive) setError(t("Failed to load the breakdown."));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [isOpen, productId, asOf, t]);

  const product = data?.product || {};
  const purchases = data?.purchases || [];
  const sales = data?.sales || [];
  const s = data?.summary || {};

  return (
    <Offcanvas
      direction="end"
      isOpen={isOpen}
      toggle={toggle}
      style={{ width: "min(1040px, 100vw)" }}
    >
      <OffcanvasHeader toggle={toggle}>
        <div className="fw-bold">{t("Closing Inventory — Breakdown")}</div>
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
        ) : !data ? (
          <div className="text-center text-muted py-4">
            {t("No data.")}
          </div>
        ) : (
          <Fragment>
            {/* Purchased − Sold = Closing (qty + ₹value). */}
            <Row className="mb-1">
              <Tile
                label={t("Purchased")}
                qty={s.purchased_qty}
                value={s.purchased_value_inr}
                tone="text-success"
              />
              <Tile
                label={t("Sold")}
                qty={s.sold_qty}
                value={s.sold_value_inr}
                tone="text-danger"
              />
              <Tile
                label={t("Closing Stock")}
                qty={s.closing_qty}
                value={s.closing_value_inr}
              />
            </Row>
            <div className="small text-muted mb-2">
              {t("Closing valued at weighted-avg cost")} ₹
              {grp(s.avg_cost_inr)}/{t("unit")}
              {data.as_of ? ` · ${t("as of")} ${data.as_of}` : ""}
            </div>

            {/* Purchases */}
            <h6 className="fw-bolder d-flex align-items-center mb-1">
              <ArrowDownLeft size={14} className="me-50 text-success" />
              {t("Purchases")} ({t("GRN receipts")})
            </h6>
            <div className="table-responsive mb-2">
              <Table bordered size="sm" className="align-middle mb-0">
                <thead className="table-light">
                  <tr className="text-nowrap">
                    <th>{t("Date")}</th>
                    <th>{t("GRN")}</th>
                    <th>{t("Vendor PO")}</th>
                    <th style={{ minWidth: 200 }}>{t("Vendor")}</th>
                    <th className="text-end">{t("Qty")}</th>
                    <th className="text-end">{t("Rate")} (₹)</th>
                    <th className="text-end">{t("Value")} (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-2">
                        {t("No purchases.")}
                      </td>
                    </tr>
                  ) : (
                    purchases.map((p, i) => (
                      <tr key={`${p.grn_id}-${i}`}>
                        <td className="text-nowrap">{p.date}</td>
                        <td className="text-nowrap">
                          {p.grn_id ? (
                            <Link
                              to={`${appsRoot}/grn/view/${p.grn_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="d-inline-flex align-items-center"
                            >
                              {p.grn_voucher_no}
                              <ExternalLink size={10} className="ms-50" />
                            </Link>
                          ) : (
                            p.grn_voucher_no
                          )}
                        </td>
                        <td className="text-nowrap">
                          {p.pov_id ? (
                            <Link
                              to={`${appsRoot}/po-vendors/view/${p.pov_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="d-inline-flex align-items-center"
                            >
                              {p.pov_voucher_no}
                              <ExternalLink size={10} className="ms-50" />
                            </Link>
                          ) : (
                            p.pov_voucher_no || "—"
                          )}
                        </td>
                        <td className="text-wrap">{p.vendor_name}</td>
                        <td className="text-end">{qtyFmt(p.qty)}</td>
                        <td className="text-end text-nowrap">
                          {grp(p.rate_inr)}
                        </td>
                        <td className="text-end text-nowrap">
                          {grp(p.value_inr)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {purchases.length > 0 ? (
                  <tfoot className="table-light fw-bold">
                    <tr>
                      <td colSpan={4} className="text-end">
                        {t("Total")}
                      </td>
                      <td className="text-end">{qtyFmt(s.purchased_qty)}</td>
                      <td />
                      <td className="text-end">
                        {grp(s.purchased_value_inr)}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </Table>
            </div>

            {/* Sales */}
            <h6 className="fw-bolder d-flex align-items-center mb-1">
              <ArrowUpRight size={14} className="me-50 text-danger" />
              {t("Sales")} ({t("invoices")})
            </h6>
            <div className="table-responsive">
              <Table bordered size="sm" className="align-middle mb-0">
                <thead className="table-light">
                  <tr className="text-nowrap">
                    <th>{t("Date")}</th>
                    <th>{t("Invoice")}</th>
                    <th>{t("Customer")}</th>
                    <th className="text-end">{t("Qty")}</th>
                    <th className="text-end">{t("Rate")} (₹)</th>
                    <th className="text-end">{t("Value")} (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-2">
                        {t("No sales.")}
                      </td>
                    </tr>
                  ) : (
                    sales.map((x, i) => (
                      <tr key={`${x.invoice_id}-${i}`}>
                        <td className="text-nowrap">{x.date}</td>
                        <td className="text-nowrap">
                          {x.invoice_id ? (
                            <Link
                              to={`${appsRoot}/invoices/view/${x.invoice_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="d-inline-flex align-items-center"
                            >
                              {x.invoice_voucher_no}
                              <ExternalLink size={10} className="ms-50" />
                            </Link>
                          ) : (
                            x.invoice_voucher_no
                          )}
                        </td>
                        <td className="text-wrap">{x.customer_name}</td>
                        <td className="text-end">{qtyFmt(x.qty)}</td>
                        <td className="text-end text-nowrap">
                          {grp(x.rate_inr)}
                        </td>
                        <td className="text-end text-nowrap">
                          {grp(x.value_inr)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {sales.length > 0 ? (
                  <tfoot className="table-light fw-bold">
                    <tr>
                      <td colSpan={3} className="text-end">
                        {t("Total")}
                      </td>
                      <td className="text-end">{qtyFmt(s.sold_qty)}</td>
                      <td />
                      <td className="text-end">{grp(s.sold_value_inr)}</td>
                    </tr>
                  </tfoot>
                ) : null}
              </Table>
            </div>
          </Fragment>
        )}
      </OffcanvasBody>
    </Offcanvas>
  );
};

export default BreakdownDrawer;
