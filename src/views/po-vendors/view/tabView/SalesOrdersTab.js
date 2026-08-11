// POV Sales Orders tab — read-only list of every Sales Order tied to this
// Vendor PO: the Source SO it was generated from (coverage FK,
// `purchase_order_id`) plus any soft-linked SOs (`linked_sales_orders`, added
// for traceability even when the POV was raised before those SOs). Each row is
// a blue clickable link opening the SO detail in a new tab.

import { Fragment, useMemo } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "react-feather";

import { appsRoot } from "@constant/defaultValues";

const SalesOrdersTab = () => {
  const { t } = useTranslation();
  const { poVendorItem } = useSelector((s) => s.poVendor);
  const p = poVendorItem || {};

  // Combine the Source SO + soft-linked SOs, de-duped (the source may also be
  // present in the linked list). Source is flagged so it reads as coverage, the
  // rest as pure reference.
  const salesOrders = useMemo(() => {
    const list = [];
    const seen = new Set();
    if (p?.purchase_order_id) {
      list.push({
        id: p.purchase_order_id,
        voucher_no: p.purchase_order_voucher_no || p.purchase_order_id,
        relation: "source",
      });
      seen.add(String(p.purchase_order_id));
    }
    (Array.isArray(p?.linked_sales_orders) ? p.linked_sales_orders : []).forEach(
      (so) => {
        if (!so?.id || seen.has(String(so.id))) return;
        seen.add(String(so.id));
        list.push({
          id: so.id,
          voucher_no: so.voucher_no || so.id,
          relation: "linked",
        });
      }
    );
    return list;
  }, [
    p?.purchase_order_id,
    p?.purchase_order_voucher_no,
    p?.linked_sales_orders,
  ]);

  if (!salesOrders.length) {
    return (
      <div className="text-muted py-3 text-center">
        {t("No Sales Orders are linked to this Vendor PO.")}
      </div>
    );
  }

  return (
    <Fragment>
      <div className="table-responsive">
        <table className="table table-sm table-bordered align-middle mb-0">
          <thead>
            <tr>
              <th style={{ width: 48 }}>#</th>
              <th>{t("Sales Order")}</th>
              <th>{t("Relation")}</th>
            </tr>
          </thead>
          <tbody>
            {salesOrders.map((so, i) => (
              <tr key={so.id}>
                <td>{i + 1}</td>
                <td>
                  <a
                    href={`${appsRoot}/purchase-orders/view/${so.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary fw-bold d-inline-flex align-items-center"
                  >
                    <ExternalLink size={13} className="me-25" />
                    {so.voucher_no}
                  </a>
                </td>
                <td>
                  <span
                    className={`doc-badge ${
                      so.relation === "source"
                        ? "doc-badge-green"
                        : "doc-badge-gray"
                    }`}
                  >
                    {so.relation === "source" ? t("Source SO") : t("Linked")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Fragment>
  );
};

export default SalesOrdersTab;
