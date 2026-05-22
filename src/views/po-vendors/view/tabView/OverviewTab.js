// Overview tab — line items table with the four qty columns + derived
// short/undispatched. In draft status, exposes an "Edit Lines" button
// that opens PoVendorLineEditModal to adjust per-line cover qty.

import { Fragment, useState } from "react";
import { useSelector } from "react-redux";
import { Card, CardBody, Table, Button } from "reactstrap";
import { useTranslation } from "react-i18next";
import { Edit } from "react-feather";

import PoVendorLineEditModal from "@src/views/_shared/po-vendor/PoVendorLineEditModal";
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

  const [editOpen, setEditOpen] = useState(false);

  return (
    <Fragment>
      <Card>
        <CardBody>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4 className="mb-0">{t("Line Items")}</h4>
            {canEditLines && (
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
                      {l?.description && (
                        <div className="small text-muted text-wrap">
                          {l.description}
                        </div>
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

      <PoVendorLineEditModal
        isOpen={editOpen}
        toggle={() => setEditOpen((s) => !s)}
      />
    </Fragment>
  );
};

export default OverviewTab;
