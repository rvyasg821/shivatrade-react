// Right-side details panel for the vendor detail page.
// Sections: About · Tax & Compliance · Terms · Categories · Social.

import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  User,
  Mail,
  Phone,
  Globe,
  FileText,
  Briefcase,
  Hash,
  Clock,
  MapPin,
} from "react-feather";

import {
  DetailPanel,
  DetailFieldList,
  DetailChips,
  DetailSocials,
} from "@src/views/_shared/detail-page";

const VendorDetailsPanel = () => {
  const { t } = useTranslation();
  const { vendorItem } = useSelector((s) => s.vendor);
  const v = vendorItem || {};

  const primaryPhone =
    v?.primary_contact_country_code?.formatted ||
    (v?.primary_contact_country_code?.dial_code && v?.primary_contact_phone
      ? `${v.primary_contact_country_code.dial_code} ${v.primary_contact_phone}`
      : v?.primary_contact_phone) ||
    null;

  const billFrom =
    (v?.addresses || []).find(
      (a) => a.is_default && a.type === "bill_from"
    ) ||
    (v?.addresses || []).find((a) => a.type === "bill_from") ||
    (v?.addresses || [])[0];
  const billLine = billFrom
    ? [billFrom.city, billFrom.state, billFrom.country]
        .filter(Boolean)
        .join(", ")
    : null;

  const aboutFields = [
    {
      icon: User,
      label: t("Primary Contact"),
      value: v?.primary_contact_name,
    },
    {
      icon: Mail,
      label: t("Email"),
      value: v?.primary_contact_email ? (
        <a
          href={`mailto:${v.primary_contact_email}`}
          className="text-reset text-decoration-none"
        >
          {v.primary_contact_email}
        </a>
      ) : null,
    },
    {
      icon: Phone,
      label: t("Phone"),
      value: primaryPhone ? (
        <a
          href={`tel:${String(primaryPhone).replace(/\s/g, "")}`}
          className="text-reset text-decoration-none"
        >
          {primaryPhone}
        </a>
      ) : null,
    },
    {
      icon: Globe,
      label: t("Website"),
      value: v?.website ? (
        <a
          href={
            /^https?:\/\//i.test(v.website) ? v.website : `https://${v.website}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="text-reset text-decoration-none"
        >
          {v.website}
        </a>
      ) : null,
    },
    {
      icon: MapPin,
      label: t("Location"),
      value: billLine,
    },
  ];

  const taxFields = [
    { icon: FileText, label: t("GSTIN / Tax #"), value: v?.gstin },
    { icon: Briefcase, label: t("PAN"), value: v?.pan },
    { icon: Hash, label: t("Vendor Code"), value: v?.vendor_code },
  ];

  const termsFields = [
    { icon: Clock, label: t("Payment Terms"), value: v?.payment_terms },
  ];

  const hasTax = taxFields.some((f) => f.value);
  const hasTerms = termsFields.some((f) => f.value);
  const categoryNames = (v?.categories || [])
    .map((c) => c.name)
    .filter(Boolean);
  const social = v?.social_media || {};
  const hasSocial = Object.values(social).some((val) => !!val);

  return (
    <DetailPanel title={t("Details")}>
      <DetailFieldList title={t("About")} items={aboutFields} />

      {hasTax && (
        <DetailFieldList title={t("Tax & Compliance")} items={taxFields} />
      )}

      {hasTerms && (
        <DetailFieldList title={t("Terms")} items={termsFields} />
      )}

      {categoryNames.length > 0 && (
        <div className="mt-1 pt-1 border-top">
          <div
            className="text-muted text-uppercase fw-bold mb-50"
            style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}
          >
            {t("Categories")}
          </div>
          <DetailChips items={categoryNames} color="primary" />
        </div>
      )}

      {hasSocial && (
        <div className="mt-1 pt-1 border-top">
          <div
            className="text-muted text-uppercase fw-bold mb-50"
            style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}
          >
            {t("Social")}
          </div>
          <DetailSocials urls={social} />
        </div>
      )}
    </DetailPanel>
  );
};

export default VendorDetailsPanel;
