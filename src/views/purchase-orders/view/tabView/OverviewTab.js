// ── PO Overview tab ─────────────────────────────────────────────────
// Internal read-only view: parties + line items + tax breakdown + notes.

import { Fragment, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Row, Col, Table } from "reactstrap";
import { useTranslation } from "react-i18next";
import { Briefcase, User, Truck, FileText } from "react-feather";

import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";

const CARD_BASE = "rounded-3 border h-100 d-flex flex-column";
const CARD_PAD = {
  padding: "1rem 1.1rem",
  backgroundColor: "#f8f9fa",
  color: "#212529",
};
const FIELD_LABEL_STYLE = {
  fontSize: "0.7rem",
  letterSpacing: "0.5px",
  textTransform: "uppercase",
};

const SectionHeader = ({ icon: Icon, label, color = "primary" }) => (
  <div className="d-flex align-items-center mb-1">
    <div
      className={`d-flex align-items-center justify-content-center rounded-circle bg-light-${color} me-75`}
      style={{ width: 28, height: 28, flexShrink: 0 }}
    >
      <Icon size={14} className={`text-${color}`} />
    </div>
    <h6 className="text-muted mb-0 fw-bold" style={FIELD_LABEL_STYLE}>
      {label}
    </h6>
  </div>
);

const Field = ({ label, value, md = 4 }) => {
  if (!value) return null;
  return (
    <Col md={md} className="mb-1">
      <div className="text-muted mb-25" style={FIELD_LABEL_STYLE}>
        {label}
      </div>
      <div className="fw-semibold" style={{ color: "#212529" }}>
        {value}
      </div>
    </Col>
  );
};

const fmt = (v) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString();

const num = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v);

const OverviewTab = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { purchaseOrderItem } = useSelector((s) => s.purchaseOrder);
  const { companyItem } = useSelector((s) => s.company || { companyItem: {} });
  const p = purchaseOrderItem || {};
  const lines = p?.lines || [];

  useEffect(() => {
    if (!companyItem?._id) dispatch(getCompanyDetails());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seller = companyItem || {};
  const intraState =
    num(p?.cgst_total) + num(p?.sgst_total) > 0 && num(p?.igst_total) === 0;

  return (
    <Fragment>
      {/* Parties */}
      <Row className="g-3 mb-3">
        <Col md="6">
          <div className={CARD_BASE} style={CARD_PAD}>
            <SectionHeader icon={Briefcase} label={t("Buyer")} color="primary" />
            <div className="mt-1">
              <div className="fw-bolder mb-25">
                {seller.company_name || "-"}
              </div>
              <div className="small text-muted lh-base">
                {seller.address_1 && <div>{seller.address_1}</div>}
                {seller.address_2 && <div>{seller.address_2}</div>}
                {(seller.city || seller.state || seller.zipcode) && (
                  <div>
                    {[seller.city, seller.state, seller.zipcode]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}
                {seller.country && <div>{seller.country}</div>}
                {seller.iec && (
                  <div className="mt-25">
                    <strong>IEC:</strong> {seller.iec}
                  </div>
                )}
                {seller.tax_number && (
                  <div>
                    <strong>GSTIN:</strong> {seller.tax_number}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Col>
        <Col md="6">
          <div className={CARD_BASE} style={CARD_PAD}>
            <SectionHeader icon={User} label={t("Vendor")} color="info" />
            <div className="mt-1">
              <div className="fw-bolder mb-25">{p?.vendor_name || "-"}</div>
              <div className="small text-muted lh-base">
                {p?.vendor_contact_name && <div>{p.vendor_contact_name}</div>}
                {p?.vendor_contact_email && <div>{p.vendor_contact_email}</div>}
                {p?.vendor_contact_phone && (
                  <div>
                    {p?.vendor_contact_country_code?.formatted ||
                      p.vendor_contact_phone}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Header fields */}
      <Row className="g-2 mb-3">
        <Field label={t("PO Date")} value={(p?.po_date || "").slice(0, 10)} md="3" />
        <Field
          label={t("Expected Delivery")}
          value={(p?.expected_delivery_date || "").slice(0, 10)}
          md="3"
        />
        <Field label={t("Payment Terms")} value={p?.payment_terms} md="3" />
        <Field label={t("Delivery Terms")} value={p?.delivery_terms} md="3" />
        <Field
          label={t("Delivery Address")}
          value={p?.delivery_address}
          md="12"
        />
      </Row>

      {/* Line items */}
      <div className="d-flex align-items-center mb-2">
        <SectionHeader
          icon={FileText}
          label={t("Line Items")}
          color="primary"
        />
      </div>
      <div className="table-responsive mb-3">
        <Table bordered size="sm" className="align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>{t("Product")}</th>
              <th style={{ width: 80 }}>{t("HSN")}</th>
              <th style={{ width: 70 }} className="text-end">
                {t("Qty")}
              </th>
              <th style={{ width: 60 }}>{t("Unit")}</th>
              <th style={{ width: 90 }} className="text-end">
                {t("Rate")}
              </th>
              <th style={{ width: 60 }} className="text-end">
                {t("Disc%")}
              </th>
              <th style={{ width: 60 }} className="text-end">
                {t("GST%")}
              </th>
              {intraState ? (
                <>
                  <th style={{ width: 80 }} className="text-end">
                    {t("CGST")}
                  </th>
                  <th style={{ width: 80 }} className="text-end">
                    {t("SGST")}
                  </th>
                </>
              ) : (
                <th style={{ width: 80 }} className="text-end">
                  {t("IGST")}
                </th>
              )}
              <th style={{ width: 100 }} className="text-end">
                {t("Amount")}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan="11" className="text-center text-muted py-3">
                  {t("No line items.")}
                </td>
              </tr>
            )}
            {lines.map((l, idx) => (
              <tr key={l._id || idx}>
                <td>{l.seq || idx + 1}</td>
                <td>
                  <div className="fw-semibold">{l.product_name || "-"}</div>
                  {l.product_code && (
                    <small className="text-muted">{l.product_code}</small>
                  )}
                  {l.description && (
                    <div className="small text-muted">{l.description}</div>
                  )}
                </td>
                <td>{l.hsn_code || "-"}</td>
                <td className="text-end">{fmt(l.qty)}</td>
                <td>{l.unit || "-"}</td>
                <td className="text-end">{fmt(l.unit_price)}</td>
                <td className="text-end">{fmt(l.discount_pct)}</td>
                <td className="text-end">{fmt(l.tax_pct)}</td>
                {intraState ? (
                  <>
                    <td className="text-end">{fmt(l.cgst)}</td>
                    <td className="text-end">{fmt(l.sgst)}</td>
                  </>
                ) : (
                  <td className="text-end">{fmt(l.igst)}</td>
                )}
                <td className="text-end fw-bold">{fmt(l.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Totals + Notes */}
      <Row className="g-3">
        <Col md="7">
          {p?.notes_to_vendor && (
            <div className="mb-2">
              <SectionHeader
                icon={FileText}
                label={t("Notes to Vendor")}
                color="warning"
              />
              <div className="small" style={{ whiteSpace: "pre-wrap" }}>
                {p.notes_to_vendor}
              </div>
            </div>
          )}
          {p?.internal_notes && (
            <div className="mb-2">
              <SectionHeader
                icon={FileText}
                label={t("Internal Notes")}
                color="secondary"
              />
              <div className="small" style={{ whiteSpace: "pre-wrap" }}>
                {p.internal_notes}
              </div>
            </div>
          )}
        </Col>
        <Col md="5">
          <div className={CARD_BASE} style={CARD_PAD}>
            <SectionHeader icon={Truck} label={t("Totals")} color="success" />
            <Table borderless size="sm" className="mb-0 mt-1">
              <tbody>
                <tr>
                  <td>{t("Subtotal")}</td>
                  <td className="text-end">₹ {fmt(p?.subtotal)}</td>
                </tr>
                {intraState ? (
                  <>
                    <tr>
                      <td>{t("CGST")}</td>
                      <td className="text-end">₹ {fmt(p?.cgst_total)}</td>
                    </tr>
                    <tr>
                      <td>{t("SGST")}</td>
                      <td className="text-end">₹ {fmt(p?.sgst_total)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td>{t("IGST")}</td>
                    <td className="text-end">₹ {fmt(p?.igst_total)}</td>
                  </tr>
                )}
                <tr>
                  <td>{t("Round-off")}</td>
                  <td className="text-end">₹ {fmt(p?.round_off)}</td>
                </tr>
                <tr className="border-top">
                  <td className="fw-bold">{t("Grand Total")}</td>
                  <td className="text-end fw-bold">
                    ₹ {fmt(p?.grand_total)}
                  </td>
                </tr>
              </tbody>
            </Table>
          </div>
        </Col>
      </Row>
    </Fragment>
  );
};

export default OverviewTab;
