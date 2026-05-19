// Chain tab — parent POV (if any) and child POVs of the current POV.
// Children are fetched live via the list endpoint filtered by the same
// source PO, then filtered client-side by parent_po_vendor_id.

import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Card, CardBody, Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "react-feather";

import instance from "@src/utility/AxiosConfig";
import { API_ENDPOINTS } from "@src/utility/ApiEndPoints";
import { appsRoot } from "@constant/defaultValues";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);

const summarizeQty = (lines = []) => {
  const ordered = lines.reduce((s, l) => s + num(l.ordered_qty), 0);
  const dispatched = lines.reduce((s, l) => s + num(l.dispatched_qty), 0);
  const received = lines.reduce((s, l) => s + num(l.received_qty), 0);
  return { ordered, dispatched, received };
};

const ChainRow = ({ row, label }) => {
  const { t } = useTranslation();
  const { ordered, dispatched, received } = summarizeQty(row?.lines || []);
  return (
    <tr>
      <td>
        <span className="text-uppercase small text-muted me-50">{label}</span>
        <Link
          to={`${appsRoot}/po-vendors/view/${row?._id || ""}`}
          className="d-inline-flex align-items-center"
        >
          <span className="fw-bold">{row?.voucher_no || "-"}</span>
          <ExternalLink size={12} className="ms-50" />
        </Link>
      </td>
      <td className="text-capitalize">{row?.status || "-"}</td>
      <td className="text-end small">
        <div>
          {t("Ordered")}: <b>{ordered.toLocaleString()}</b>
        </div>
        <div>
          {t("Dispatched")}: {dispatched.toLocaleString()}
        </div>
        <div>
          {t("Received")}: {received.toLocaleString()}
        </div>
      </td>
    </tr>
  );
};

const ChainTab = () => {
  const { t } = useTranslation();
  const { poVendorItem } = useSelector((s) => s.poVendor);
  const p = poVendorItem || {};

  const [parent, setParent] = useState(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!p?._id || !p?.purchase_order_id) return;
    let mounted = true;
    setLoading(true);

    // Pull all POVs for the same source PO; this is a small bounded set.
    instance
      .get(API_ENDPOINTS.poVendors.list, {
        params: {
          purchase_order_id: p.purchase_order_id,
          page: 1,
          perPage: 200,
          orderBy: "createdAt",
          orderDirection: "asc",
        },
      })
      .then((resp) => {
        if (!mounted) return;
        const items = resp?.data?.data || [];
        const par =
          (p?.parent_po_vendor_id &&
            items.find(
              (it) => it._id === p.parent_po_vendor_id
            )) ||
          null;
        const kids = items.filter(
          (it) => it.parent_po_vendor_id === p._id
        );
        setParent(par);
        setChildren(kids);
      })
      .catch(() => {
        if (!mounted) return;
        setParent(null);
        setChildren([]);
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [p?._id, p?.purchase_order_id, p?.parent_po_vendor_id]);

  return (
    <Fragment>
      <Card>
        <CardBody>
          <h4 className="mb-2">{t("Chain")}</h4>
          {loading ? (
            <div className="text-muted py-3 text-center">
              {t("Loading chain…")}
            </div>
          ) : !parent && children.length === 0 ? (
            <div className="text-muted py-3 text-center">
              {t("This POV has no parent and no children.")}
            </div>
          ) : (
            <Table responsive bordered size="sm" className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>{t("POV")}</th>
                  <th style={{ width: 130 }}>{t("Status")}</th>
                  <th style={{ width: 220 }} className="text-end">
                    {t("Qty Summary")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {parent && <ChainRow row={parent} label={`↑ ${t("Parent")}`} />}
                <tr className="table-active">
                  <td>
                    <span className="text-uppercase small text-muted me-50">
                      {t("This")}
                    </span>
                    <span className="fw-bold">{p?.voucher_no || "-"}</span>
                  </td>
                  <td className="text-capitalize">{p?.status || "-"}</td>
                  <td className="text-end small">
                    {(() => {
                      const { ordered, dispatched, received } = summarizeQty(
                        p?.lines || []
                      );
                      return (
                        <Fragment>
                          <div>
                            {t("Ordered")}:{" "}
                            <b>{ordered.toLocaleString()}</b>
                          </div>
                          <div>
                            {t("Dispatched")}: {dispatched.toLocaleString()}
                          </div>
                          <div>
                            {t("Received")}: {received.toLocaleString()}
                          </div>
                        </Fragment>
                      );
                    })()}
                  </td>
                </tr>
                {children.map((c) => (
                  <ChainRow
                    key={c._id}
                    row={c}
                    label={`↓ ${t("Child")}`}
                  />
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default ChainTab;
