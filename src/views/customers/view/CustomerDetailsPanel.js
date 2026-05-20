// Right-side details panel for the customer detail page.
// Sections: About · Tax & Compliance · Social (icon row at the bottom).

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
} from "react-feather";

import {
  DetailPanel,
  DetailFieldList,
  DetailSocials,
} from "@src/views/_shared/detail-page";

const CustomerDetailsPanel = () => {
  const { t } = useTranslation();
  const { customerItem } = useSelector((s) => s.customer);
  const c = customerItem || {};

  const primaryPhone =
    c?.primary_contact_country_code?.formatted ||
    (c?.primary_contact_country_code?.dial_code && c?.primary_contact_phone
      ? `${c.primary_contact_country_code.dial_code} ${c.primary_contact_phone}`
      : c?.primary_contact_phone) ||
    null;

  const aboutFields = [
    {
      icon: User,
      label: t("Primary Contact"),
      value: c?.primary_contact_name,
    },
    {
      icon: Mail,
      label: t("Email"),
      value: c?.primary_contact_email ? (
        <a
          href={`mailto:${c.primary_contact_email}`}
          className="text-reset text-decoration-none"
        >
          {c.primary_contact_email}
        </a>
      ) : null,
    },
    {
      icon: Phone,
      label: t("Phone"),
      value: primaryPhone ? (
        <a
          href={`tel:${primaryPhone.replace(/\s/g, "")}`}
          className="text-reset text-decoration-none"
        >
          {primaryPhone}
        </a>
      ) : null,
    },
    {
      icon: Globe,
      label: t("Website"),
      value: c?.website ? (
        <a
          href={c.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-reset text-decoration-none"
        >
          {c.website}
        </a>
      ) : null,
    },
  ];

  const taxFields = [
    { icon: FileText, label: t("Tax / VAT Number"), value: c?.gstin },
    { icon: Briefcase, label: t("Business Registration #"), value: c?.pan },
    { icon: Hash, label: t("IEC"), value: c?.iec },
  ];

  const hasTax = taxFields.some((f) => f.value);
  const social = c?.social_media || {};
  const hasSocial = Object.values(social).some((v) => !!v);

  return (
    <DetailPanel title={t("Details")}>
      <DetailFieldList title={t("About")} items={aboutFields} />

      {hasTax && (
        <DetailFieldList title={t("Tax & Compliance")} items={taxFields} />
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

export default CustomerDetailsPanel;
