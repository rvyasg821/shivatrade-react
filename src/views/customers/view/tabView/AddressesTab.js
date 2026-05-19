import { Fragment } from "react";
import { useSelector } from "react-redux";
import { Badge, Table } from "reactstrap";
import { useTranslation } from "react-i18next";

const TYPE_LABEL = {
  bill_to: "Bill To",
  ship_to: "Ship To",
  notify: "Notify Party",
  other: "Other",
};

const AddressesTab = () => {
  const { t } = useTranslation();
  const { customerItem } = useSelector((s) => s.customer);
  const rows = customerItem?.addresses || [];

  if (rows.length === 0) {
    return (
      <div className="text-muted py-3 text-center">
        {t("No addresses on file.")}
      </div>
    );
  }

  return (
    <Fragment>
      <h4 className="mb-2">{t("Addresses")}</h4>
      <Table responsive bordered className="mb-0">
        <thead>
          <tr>
            <th>{t("Type")}</th>
            <th>{t("Label")}</th>
            <th>{t("Address")}</th>
            <th>{t("City")}</th>
            <th>{t("State")}</th>
            <th>{t("Country")}</th>
            <th>{t("Postcode")}</th>
            <th>{t("Tax ID")}</th>
            <th>{t("Default")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => {
            const line = [a.address_line1, a.address_line2]
              .filter(Boolean)
              .join(", ");
            return (
              <tr key={a?._id || i}>
                <td>{TYPE_LABEL[a?.type] || a?.type || "-"}</td>
                <td>{a?.label || "-"}</td>
                <td className="text-wrap">{line || "-"}</td>
                <td>{a?.city || "-"}</td>
                <td>{a?.state || "-"}</td>
                <td>{a?.country || "-"}</td>
                <td>{a?.postcode || "-"}</td>
                <td>{a?.gstin || "-"}</td>
                <td>
                  {a?.is_default ? (
                    <Badge color="light-success">{t("Default")}</Badge>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Fragment>
  );
};

export default AddressesTab;
