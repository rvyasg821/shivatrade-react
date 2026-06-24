// Right-side details panel for the employee detail page.
// Sections: About (contact) · Employment. Mirrors CustomerDetailsPanel so the
// employee page reads like the rest of the app's record-detail pages.

import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  Mail,
  Phone,
  User,
  MapPin,
  Briefcase,
  Users,
  Shield,
  Hash,
  Calendar,
} from "react-feather";
import moment from "moment";

import {
  DetailPanel,
  DetailFieldList,
} from "@src/views/_shared/detail-page";
import { formatPhoneNumber } from "@src/views/auth/profile/formatPhoneNumber";

const EmployeeDetailsPanel = () => {
  const { t } = useTranslation();
  const { employeeItem } = useSelector((s) => s.employee);
  const p = employeeItem || {};

  // Phone formatting (same logic the old info card used).
  const countryObj = p?.country_code || {
    dialCode: "1",
    format: "+.. .....-.....",
  };
  const countryCode = countryObj.code || countryObj.dialCode || "+1";
  const mobileFormat = countryObj.format || "+.. .....-.....";
  const dialCode = countryCode.replace("+", "") || "1";
  const formattedMobile = p?.mobile
    ? formatPhoneNumber(p.mobile, mobileFormat, dialCode)
    : null;

  const locationName =
    typeof p?.location_id === "object" ? p?.location_id?.location_name : "";

  const address = [
    p?.address_line1,
    p?.address_line2,
    p?.city,
    p?.state,
    p?.country,
    p?.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  const aboutFields = [
    {
      icon: Mail,
      label: t("Email"),
      value: p?.email ? (
        <a
          href={`mailto:${p.email}`}
          className="text-reset text-decoration-none"
        >
          {p.email}
        </a>
      ) : null,
    },
    {
      icon: Phone,
      label: t("Phone"),
      value: formattedMobile ? (
        <a
          href={`tel:${formattedMobile.replace(/\s/g, "")}`}
          className="text-reset text-decoration-none"
        >
          {formattedMobile}
        </a>
      ) : null,
    },
    {
      icon: User,
      label: t("Gender"),
      value: p?.gender ? t(p.gender) : null,
    },
    { icon: MapPin, label: t("Location"), value: locationName },
    { icon: MapPin, label: t("Address"), value: address },
  ];

  const employmentFields = [
    {
      icon: Hash,
      label: t("Employee Code"),
      value: p?.employee_code ? (
        <span className="text-uppercase">{p.employee_code}</span>
      ) : null,
    },
    { icon: Briefcase, label: t("Designation"), value: p?.designation },
    { icon: Users, label: t("Department"), value: p?.department },
    {
      icon: Shield,
      label: t("Employment Type"),
      value: p?.employment_type ? t(p.employment_type) : null,
    },
    {
      icon: Calendar,
      label: t("Date of Joining"),
      value: p?.date_of_joining
        ? moment(p.date_of_joining).format("DD MMM YYYY")
        : null,
    },
    {
      icon: Calendar,
      label: t("Date of Birth"),
      value: p?.date_of_birth
        ? moment(p.date_of_birth).format("DD MMM YYYY")
        : null,
    },
  ];

  const hasEmployment = employmentFields.some((f) => f.value);

  return (
    <DetailPanel title={t("Details")}>
      <DetailFieldList title={t("About")} items={aboutFields} />
      {hasEmployment && (
        <DetailFieldList title={t("Employment")} items={employmentFields} />
      )}
    </DetailPanel>
  );
};

export default EmployeeDetailsPanel;
