import { Fragment } from "react";
import { useSelector } from "react-redux";
import { Badge } from "reactstrap";
import { useTranslation } from "react-i18next";

import DatatablePagination from "@components/datatable/DatatablePagination";

const TYPE_LABEL = {
  bill_from: "Bill From",
  ship_from: "Ship From",
  registered: "Registered",
  warehouse: "Warehouse",
  other: "Other",
};

const AddressesTab = () => {
  const { t } = useTranslation();
  const { vendorItem } = useSelector((s) => s.vendor);
  const rows = vendorItem?.addresses || [];

  const columns = [
    {
      name: t("Type"),
      selector: (row) => TYPE_LABEL[row?.type] || row?.type || "-",
    },
    {
      name: t("Label"),
      selector: (row) => row?.label || "-",
    },
    {
      name: t("Address"),
      minWidth: "240px",
      selector: (row) => {
        const line = [row?.address_line1, row?.address_line2]
          .filter(Boolean)
          .join(", ");
        return <span className="text-wrap">{line || "-"}</span>;
      },
    },
    {
      name: t("City"),
      selector: (row) => row?.city || "-",
    },
    {
      name: t("State"),
      selector: (row) => row?.state || "-",
    },
    {
      name: t("Country"),
      selector: (row) => row?.country || "-",
    },
    {
      name: t("Postcode"),
      selector: (row) => row?.postcode || "-",
    },
    {
      name: t("GSTIN"),
      selector: (row) => row?.gstin || "-",
    },
    {
      name: t("Default"),
      center: true,
      selector: (row) =>
        row?.is_default ? (
          <Badge color="light-success">{t("Default")}</Badge>
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

export default AddressesTab;
