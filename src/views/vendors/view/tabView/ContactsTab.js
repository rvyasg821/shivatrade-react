import { Fragment } from "react";
import { useSelector } from "react-redux";
import { Badge } from "reactstrap";
import { useTranslation } from "react-i18next";

import DatatablePagination from "@components/datatable/DatatablePagination";

const ContactsTab = () => {
  const { t } = useTranslation();
  const { vendorItem } = useSelector((s) => s.vendor);
  const rows = vendorItem?.contacts || [];

  const columns = [
    {
      name: t("Name"),
      minWidth: "180px",
      selector: (row) => (
        <span className="text-capitalize text-wrap">{row?.name || "-"}</span>
      ),
    },
    {
      name: t("Designation"),
      selector: (row) => (
        <span className="text-capitalize">{row?.designation || "-"}</span>
      ),
    },
    {
      name: t("Email"),
      minWidth: "200px",
      selector: (row) => row?.email || "-",
    },
    {
      name: t("Phone"),
      selector: (row) =>
        row?.country_code?.formatted ||
        (row?.country_code?.dial_code && row?.phone
          ? `${row.country_code.dial_code} ${row.phone}`
          : row?.phone) ||
        "-",
    },
    {
      name: t("Primary"),
      center: true,
      selector: (row) =>
        row?.is_primary ? (
          <Badge color="light-success">{t("Primary")}</Badge>
        ) : (
          <span className="text-muted">-</span>
        ),
    },
  ];

  return (
    <Fragment>
      <DatatablePagination columns={columns} data={rows} disablePagination />
    </Fragment>
  );
};

export default ContactsTab;
