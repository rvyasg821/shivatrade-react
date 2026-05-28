// Purchase Orders spawned from this PFI.
// One PFI can spawn N POs (one per vendor) — table includes a Vendor
// column so the user can tell them apart at a glance.

import { Fragment, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Table, UncontrolledTooltip } from "reactstrap";
import { Eye } from "react-feather";
import { useTranslation } from "react-i18next";

import {
  getPurchaseOrderList,
  cleanPurchaseOrderMessage,
} from "@src/views/purchase-orders/store";
import { appsRoot } from "@constant/defaultValues";

const PosTab = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const store = useSelector((s) => s.purchaseOrder);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    dispatch(
      getPurchaseOrderList({
        orderBy: "po_date",
        orderDirection: "desc",
        page: 1,
        perPage: 50,
        search: "",
        pfi_id: id,
      })
    );
    setLoaded(true);
    return () => {
      dispatch(cleanPurchaseOrderMessage(null));
    };
  }, [id, dispatch]);

  const rows = store?.purchaseOrderItems || [];

  return (
    <Fragment>
      <h4 className="mb-2">{t("Sales Orders")}</h4>
      {loaded && rows.length === 0 ? (
        <div className="text-muted py-3 text-center">
          {t("No Sales Orders generated from this PFI yet.")}
        </div>
      ) : (
        <Table responsive bordered className="mb-0">
          <thead>
            <tr>
              <th>{t("Date")}</th>
              <th>{t("SO #")}</th>
              <th>{t("Vendors")}</th>
              <th>{t("Expected Delivery")}</th>
              <th>{t("Total")}</th>
              <th>{t("Status")}</th>
              <th className="text-center">{t("Action")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const sym = row?.currency_symbol || row?.currency_code || "";
              return (
                <tr key={row?._id}>
                  <td>{(row?.po_date || "").slice(0, 10) || "-"}</td>
                  <td className="text-wrap">{row?.voucher_no || "-"}</td>
                  <td className="text-capitalize small">
                    {(() => {
                      const seen = new Set();
                      const list = [];
                      for (const ln of row?.lines || []) {
                        const vid = ln?.vendor_id;
                        if (!vid || seen.has(vid)) continue;
                        seen.add(vid);
                        list.push(ln?.vendor_name || vid);
                      }
                      if (list.length === 0 && row?.vendor_name) {
                        list.push(row.vendor_name);
                      }
                      if (list.length === 0) return "-";
                      return list.map((name, i) => (
                        <div key={i}>{name}</div>
                      ));
                    })()}
                  </td>
                  <td>
                    {(row?.expected_delivery_date || "").slice(0, 10) || "-"}
                  </td>
                  <td>
                    {row?.grand_total !== null &&
                    row?.grand_total !== undefined
                      ? `${sym}${row.grand_total}`
                      : "-"}
                  </td>
                  <td className="text-capitalize">{row?.status || "-"}</td>
                  <td className="text-center">
                    <Link
                      to={`${appsRoot}/purchase-orders/view/${row?._id}`}
                      id={`pfi-po-view-${row?._id}`}
                    >
                      <Eye size={18} />
                    </Link>
                    <UncontrolledTooltip
                      placement="top"
                      target={`pfi-po-view-${row?._id}`}
                    >
                      {t("View")}
                    </UncontrolledTooltip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Fragment>
  );
};

export default PosTab;
