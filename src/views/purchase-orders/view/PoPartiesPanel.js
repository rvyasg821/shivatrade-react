// Buyer (our company) + Vendor + delivery/terms grid for the PO summary card.

import { Fragment, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Row, Col } from "reactstrap";
import { useTranslation } from "react-i18next";
import {
  Briefcase,
  User,
  Truck,
  Calendar,
  CreditCard,
  MapPin,
  FileText,
} from "react-feather";

import { formatDate } from "@src/utility/dateFormat";
import { getCompanyDetails } from "@src/views/auth/profile/editCompany/store";

const SectionLabel = ({ children, icon: Icon }) => (
  <div className="d-flex align-items-center mb-50">
    {Icon ? (
      <Icon size={14} className="me-50" style={{ color: "#1a2238" }} />
    ) : null}
    <span
      className="fw-bold text-uppercase"
      style={{ fontSize: "0.7rem", letterSpacing: "0.5px", color: "#1a2238" }}
    >
      {children}
    </span>
  </div>
);

const PartyCard = ({ icon: Icon, label, children }) => (
  <div className="p-1 h-100">
    <SectionLabel icon={Icon}>{label}</SectionLabel>
    <div className="small lh-base" style={{ color: "#212529" }}>
      {children}
    </div>
  </div>
);

const Field = ({ label, value, icon: Icon, md = 4 }) => {
  if (value === undefined || value === null || value === "" || value === "-")
    return null;
  return (
    <Col md={md} className="mb-1">
      <div
        className="text-muted mb-25 d-flex align-items-center"
        style={{
          fontSize: "0.7rem",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
        }}
      >
        {Icon ? <Icon size={12} className="me-25" /> : null}
        {label}
      </div>
      <div className="fw-semibold" style={{ color: "#212529" }}>
        {value}
      </div>
    </Col>
  );
};

const PoPartiesPanel = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { purchaseOrderItem } = useSelector((s) => s.purchaseOrder);
  const { companyItem } = useSelector((s) => s.company || { companyItem: {} });
  const p = purchaseOrderItem || {};
  const seller = companyItem || {};

  useEffect(() => {
    if (!companyItem?._id) dispatch(getCompanyDetails());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vendorPhone = (() => {
    const cc = p?.vendor_contact_country_code;
    const code =
      cc && typeof cc === "object"
        ? cc.formatted || cc.dial_code || cc.code || ""
        : cc || "";
    if (cc && typeof cc === "object" && cc.formatted) return cc.formatted;
    const prefix = code ? `+${String(code).replace(/^\+/, "")} ` : "";
    return p?.vendor_contact_phone ? `${prefix}${p.vendor_contact_phone}` : "";
  })();

  return (
    <Fragment>
      <Row className="g-1">
        <Col md="6">
          <PartyCard icon={Briefcase} label={t("Buyer")}>
            <div className="fw-bolder mb-25" style={{ color: "#212529" }}>
              {seller.company_name || "-"}
            </div>
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
            {seller.tax_number && (
              <div className="mt-50">
                <span className="text-muted">GSTIN </span>
                <span className="fw-semibold">{seller.tax_number}</span>
              </div>
            )}
            {seller.iec && (
              <div>
                <span className="text-muted">IEC </span>
                <span className="fw-semibold">{seller.iec}</span>
              </div>
            )}
          </PartyCard>
        </Col>
        <Col md="6">
          <PartyCard icon={User} label={t("Vendors")}>
            {(() => {
              // Multi-vendor PO: derive unique vendors from line items.
              // Legacy POs fall back to the header vendor_id.
              const linesVendors = [];
              const seen = new Set();
              for (const ln of p?.lines || []) {
                const vid = ln?.vendor_id;
                if (!vid || seen.has(vid)) continue;
                seen.add(vid);
                linesVendors.push({
                  id: vid,
                  name: ln?.vendor_name || vid,
                });
              }
              if (linesVendors.length === 0 && p?.vendor_name) {
                linesVendors.push({
                  id: p?.vendor_id,
                  name: p?.vendor_name,
                });
              }
              if (linesVendors.length === 0) {
                return <div className="text-muted small">-</div>;
              }
              return linesVendors.map((v) => (
                <div key={v.id} className="mb-25" style={{ color: "#212529" }}>
                  • {v.name}
                </div>
              ));
            })()}
          </PartyCard>
        </Col>
      </Row>

      {p?.internal_notes && (
        <Row className="g-1 mt-1">
          <Col md="12">
            <SectionLabel icon={FileText}>{t("Internal Notes")}</SectionLabel>
            <div className="small lh-base" style={{ whiteSpace: "pre-line" }}>
              {p.internal_notes}
            </div>
          </Col>
        </Row>
      )}
    </Fragment>
  );
};

export default PoPartiesPanel;
