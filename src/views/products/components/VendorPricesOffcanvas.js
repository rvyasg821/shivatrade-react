// Vendor pricing drawer for a product. Opens from the product listing.
//   • Default view  → latest active price per vendor (GET /by-product/:id),
//     cheapest first, the cheapest tagged "Best".
//   • History       → expand a vendor to see every price entry for it
//     (derived from GET /list?product_id=id), newest effective_date first.

import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Offcanvas,
  OffcanvasHeader,
  OffcanvasBody,
  Spinner,
  Table,
  Button,
} from "reactstrap";
import { ChevronDown, ChevronRight, Sliders } from "react-feather";
import { useTranslation } from "react-i18next";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";

const money = (v, sym) => {
  if (v === null || v === undefined || v === "") return "-";
  const amt = Number(v).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return sym ? `${sym}${amt}` : amt;
};

const sourceLabel = (r, t) =>
  r?.source_type === "rfq"
    ? r?.source_rfq_voucher_no || t("RFQ")
    : (r?.source_type || "manual");

const VendorPricesOffcanvas = ({ open, toggle, product }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState([]); // latest per vendor
  const [historyByVendor, setHistoryByVendor] = useState({}); // vendor_id -> rows[]
  const [expanded, setExpanded] = useState({}); // vendor_id -> bool

  const productId = product?._id;

  useEffect(() => {
    if (!open || !productId) return;
    let alive = true;
    setLoading(true);
    setExpanded({});
    Promise.all([
      instance.get(`${API_ENDPOINTS.priceList.byProduct}/${productId}`),
      instance.get(API_ENDPOINTS.priceList.list, {
        params: { product_id: productId, perPage: 200, page: 1 },
      }),
    ])
      .then(([curRes, listRes]) => {
        if (!alive) return;
        setCurrent(curRes?.data?.data || []);
        // Group every entry by vendor for the history drill-down.
        const all = listRes?.data?.data || [];
        const grouped = {};
        for (const r of all) {
          const vid = r?.vendor_id?.toString();
          if (!vid) continue;
          (grouped[vid] ||= []).push(r);
        }
        for (const vid of Object.keys(grouped)) {
          grouped[vid].sort((a, b) =>
            String(b.effective_date || "").localeCompare(
              String(a.effective_date || "")
            )
          );
        }
        setHistoryByVendor(grouped);
      })
      .catch(() => {
        if (!alive) return;
        setCurrent([]);
        setHistoryByVendor({});
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open, productId]);

  const toggleVendor = (vid) =>
    setExpanded((m) => ({ ...m, [vid]: !m[vid] }));

  return (
    <Offcanvas direction="end" isOpen={open} toggle={toggle} style={{ width: 540 }}>
      <OffcanvasHeader toggle={toggle}>
        <div className="fw-bold">{t("Vendor Pricing")}</div>
        <div className="small text-muted text-capitalize">
          {product?.name || "-"}
          {product?.code ? (
            <span className="text-uppercase"> · {product.code}</span>
          ) : null}
        </div>
      </OffcanvasHeader>
      <OffcanvasBody>
        <div className="d-flex justify-content-end mb-1">
          <Button
            color="primary"
            size="sm"
            onClick={() => {
              if (productId) navigate(`${appsRoot}/price-list/manage/${productId}`);
              toggle();
            }}
          >
            <Sliders size={14} className="me-25" /> {t("Manage Pricing")}
          </Button>
        </div>
        {loading ? (
          <div className="d-flex justify-content-center py-4">
            <Spinner color="primary" />
          </div>
        ) : current.length === 0 ? (
          <div className="text-center text-muted py-4">
            {t("No active vendor pricing for this product.")}
          </div>
        ) : (
          <Table responsive className="mb-0" size="sm">
            <thead className="table-light">
              <tr>
                <th style={{ width: 28 }} />
                <th>{t("Vendor")}</th>
                <th className="text-end">{t("Price")}</th>
                <th className="text-nowrap">{t("Validity")}</th>
              </tr>
            </thead>
            <tbody>
              {current.map((r, idx) => {
                const vid = r?.vendor_id?.toString();
                const hist = historyByVendor[vid] || [];
                const hasHistory = hist.length > 1;
                const isOpen = !!expanded[vid];
                const sym = r?.currency_symbol || r?.currency_code || "";
                return (
                  <Fragment key={vid || idx}>
                    <tr>
                      <td className="align-middle">
                        {hasHistory ? (
                          <span
                            role="button"
                            onClick={() => toggleVendor(vid)}
                            className="text-muted"
                          >
                            {isOpen ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </span>
                        ) : null}
                      </td>
                      <td className="align-middle">
                        <div className="fw-semibold text-capitalize">
                          {r?.vendor_name || "-"}
                          {idx === 0 ? (
                            <span
                              className="badge rounded-pill ms-1 text-nowrap"
                              ref={(el) => {
                                if (el) {
                                  el.style.setProperty("background-color", "#1985541f", "important");
                                  el.style.setProperty("color", "#198754", "important");
                                }
                              }}
                            >
                              {t("Best")}
                            </span>
                          ) : null}
                        </div>
                        {r?.vendor_code ? (
                          <div className="small text-muted text-uppercase">
                            {r.vendor_code}
                          </div>
                        ) : null}
                        <div className="small text-muted text-capitalize">
                          {sourceLabel(r, t)}
                        </div>
                      </td>
                      <td className="text-end align-middle fw-bold">
                        {money(r?.unit_price, sym)}
                      </td>
                      <td className="align-middle small text-nowrap">
                        <div>
                          {t("Eff")}: {formatDate(r?.effective_date)}
                        </div>
                        <div className="text-muted">
                          {t("Until")}:{" "}
                          {r?.effective_until
                            ? formatDate(r.effective_until)
                            : t("No expiry")}
                        </div>
                      </td>
                    </tr>
                    {isOpen
                      ? hist.map((h) => (
                          <tr key={h._id} className="bg-light">
                            <td />
                            <td
                              colSpan={3}
                              className="small d-flex justify-content-between flex-wrap gap-1"
                            >
                              <span className="fw-semibold">
                                {money(
                                  h?.unit_price,
                                  h?.currency_symbol || h?.currency_code || ""
                                )}
                              </span>
                              <span className="text-muted">
                                {formatDate(h?.effective_date)} →{" "}
                                {h?.effective_until
                                  ? formatDate(h.effective_until)
                                  : t("No expiry")}
                              </span>
                              <span className="text-muted text-capitalize">
                                {sourceLabel(h, t)}
                              </span>
                            </td>
                          </tr>
                        ))
                      : null}
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
        )}
      </OffcanvasBody>
    </Offcanvas>
  );
};

export default VendorPricesOffcanvas;
