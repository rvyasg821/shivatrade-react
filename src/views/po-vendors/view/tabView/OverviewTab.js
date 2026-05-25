// Overview tab — line items table with the four qty columns + derived
// short/undispatched. In draft status, exposes an "Edit Lines" button
// that opens PoVendorLineEditModal to adjust per-line cover qty.
// NOTE: Edit Lines button is currently hidden — qty is locked to PO
// ordered qty by policy, so the modal would be read-only. Kept around
// in case the policy reverses; flip `canEditLines && false` back to
// `canEditLines` to restore.

import { Fragment, useState } from "react";
import { useSelector } from "react-redux";
import { Card, CardBody, Table, Button } from "reactstrap";
import { useTranslation } from "react-i18next";
import { Edit, Truck } from "react-feather";

import PoVendorLineEditModal from "@src/views/_shared/po-vendor/PoVendorLineEditModal";
import PoVendorEditDeliveryModal from "@src/views/_shared/po-vendor/PoVendorEditDeliveryModal";
import { DetailPanel } from "@src/views/_shared/detail-page";
import { isAdminUser } from "@constant/defaultValues";

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);

const OverviewTab = () => {
  const { t } = useTranslation();
  const { poVendorItem } = useSelector((s) => s.poVendor);
  const authStore = useSelector((s) => s.auth);
  const authUserItem = authStore?.authUserItem || null;
  const p = poVendorItem || {};
  const lines = p?.lines || [];
  const sym = p?.currency_symbol || "₹";
  const isDraft = (p?.status || "").toLowerCase() === "draft";

  // Edit Lines permission gate — po-vendors.can_update.
  const isAdmin = isAdminUser(authUserItem);
  const perms = authUserItem?.role?.permissions?.["po-vendors"];
  const canEditLines =
    isDraft && (isAdmin || perms?.can_all || perms?.can_update);
  const canEditDelivery =
    isDraft && (isAdmin || perms?.can_all || perms?.can_update);

  const [editOpen, setEditOpen] = useState(false);
  const [editDeliveryOpen, setEditDeliveryOpen] = useState(false);

  const deliverPanel = (p?.delivery_address || canEditDelivery) && (() => {
    const addr = (p?.delivery_address || "").trim();
    const addrLines = addr
      ? addr.split("\n").map((l) => l.trim()).filter(Boolean)
      : [];
    const heading = addrLines[0] || "";
    const rest = addrLines.slice(1);
    return (
      <div className="mt-3">
        <DetailPanel
          title={
            <span className="d-inline-flex align-items-center">
              <Truck size={16} className="me-50 text-primary" />
              {t("Deliver To")}
            </span>
          }
          action={
            canEditDelivery && (
              <Button
                color="primary"
                outline
                size="sm"
                onClick={() => setEditDeliveryOpen(true)}
              >
                <Edit size={14} className="me-50" /> {t("Edit")}
              </Button>
            )
          }
        >
          {addr ? (
            <div
              className="rounded-3 border"
              style={{
                padding: "1rem 1.25rem",
                backgroundColor: "#f8f9fa",
              }}
            >
              {heading && (
                <div
                  className="fw-bolder mb-25"
                  style={{ color: "#212529", fontSize: "1rem" }}
                >
                  {heading}
                </div>
              )}
              <div className="small text-muted lh-base">
                {rest.length ? (
                  rest.map((ln, idx) => <div key={idx}>{ln}</div>)
                ) : !heading ? (
                  <span>—</span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="text-muted small fst-italic">
              {t("No delivery address set yet.")}
            </div>
          )}
        </DetailPanel>
      </div>
    );
  })();

  return (
    <Fragment>
      <Card>
        <CardBody>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4 className="mb-0">{t("Line Items")}</h4>
            {/* Edit Lines hidden — qty is locked to PO ordered qty.
                Restore by removing the `&& false` below. */}
            {canEditLines && false && (
              <Button
                color="primary"
                outline
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                <Edit size={14} className="me-50" /> {t("Edit Lines")}
              </Button>
            )}
          </div>
          {lines.length === 0 ? (
            <div className="text-muted py-3 text-center">
              {t("No lines on this POV.")}
            </div>
          ) : (
            <Table responsive bordered size="sm" className="align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th style={{ minWidth: 200 }}>{t("Product")}</th>
                  <th style={{ width: 80 }}>{t("HSN")}</th>
                  <th style={{ width: 70 }}>{t("Unit")}</th>
                  <th style={{ width: 90 }} className="text-end">
                    {t("Rate")}
                  </th>
                  <th style={{ width: 90 }} className="text-end">
                    {t("Ordered")}
                  </th>
                  <th style={{ width: 90 }} className="text-end">
                    {t("Dispatched")}
                  </th>
                  <th style={{ width: 90 }} className="text-end">
                    {t("Received")}
                  </th>
                  <th style={{ width: 90 }} className="text-end text-warning">
                    {t("Short")}
                  </th>
                  <th style={{ width: 100 }} className="text-end">
                    {t("Undispatched")}
                  </th>
                  <th style={{ width: 110 }} className="text-end">
                    {t("Line Total")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={l._id || idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <div className="fw-semibold">{l?.product_name || "-"}</div>
                      {l?.product_code && (
                        <small className="text-muted">{l.product_code}</small>
                      )}
                    </td>
                    <td>{l?.hsn_code || "-"}</td>
                    <td>{l?.unit || "-"}</td>
                    <td className="text-end">
                      {sym} {num(l?.unit_price).toLocaleString()}
                    </td>
                    <td className="text-end fw-semibold">
                      {num(l?.ordered_qty).toLocaleString()}
                    </td>
                    <td className="text-end">
                      {num(l?.dispatched_qty).toLocaleString()}
                    </td>
                    <td className="text-end">
                      {num(l?.received_qty).toLocaleString()}
                    </td>
                    <td className="text-end text-warning">
                      {num(l?.short_qty) > 0
                        ? num(l.short_qty).toLocaleString()
                        : "-"}
                    </td>
                    <td className="text-end">
                      {num(l?.undispatched_qty) > 0
                        ? num(l.undispatched_qty).toLocaleString()
                        : "-"}
                    </td>
                    <td className="text-end fw-bold">
                      {sym} {num(l?.line_total).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {p?.notes && (
            <Fragment>
              <h6 className="mt-2 mb-1">{t("Notes")}</h6>
              <div
                className="small text-muted"
                style={{ whiteSpace: "pre-wrap" }}
              >
                {p.notes}
              </div>
            </Fragment>
          )}
          {p?.internal_notes && (
            <Fragment>
              <h6 className="mt-2 mb-1">{t("Internal Notes")}</h6>
              <div
                className="small text-muted"
                style={{ whiteSpace: "pre-wrap" }}
              >
                {p.internal_notes}
              </div>
            </Fragment>
          )}
        </CardBody>
      </Card>

      {deliverPanel}

      <PoVendorLineEditModal
        isOpen={editOpen}
        toggle={() => setEditOpen((s) => !s)}
      />
      <PoVendorEditDeliveryModal
        isOpen={editDeliveryOpen}
        toggle={() => setEditDeliveryOpen((s) => !s)}
      />
    </Fragment>
  );
};

export default OverviewTab;
