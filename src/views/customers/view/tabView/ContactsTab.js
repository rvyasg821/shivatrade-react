import { Fragment } from "react";
import { useSelector } from "react-redux";
import { Badge, Table } from "reactstrap";
import { useTranslation } from "react-i18next";

const ContactsTab = () => {
  const { t } = useTranslation();
  const { customerItem } = useSelector((s) => s.customer);
  const rows = customerItem?.contacts || [];

  if (rows.length === 0) {
    return (
      <div className="text-muted py-3 text-center">
        {t("No contact persons on file.")}
      </div>
    );
  }

  return (
    <Fragment>
      <h4 className="mb-2">{t("Contacts")}</h4>
      <Table responsive bordered className="mb-0">
        <thead>
          <tr>
            <th>{t("Name")}</th>
            <th>{t("Designation")}</th>
            <th>{t("Email")}</th>
            <th>{t("Phone")}</th>
            <th>{t("Primary")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => {
            const phone =
              c?.country_code?.formatted ||
              (c?.country_code?.dial_code && c?.phone
                ? `${c.country_code.dial_code} ${c.phone}`
                : c?.phone) ||
              "-";
            return (
              <tr key={c?._id || i}>
                <td className="text-capitalize text-wrap">{c?.name || "-"}</td>
                <td className="text-capitalize">{c?.designation || "-"}</td>
                <td>{c?.email || "-"}</td>
                <td>{phone}</td>
                <td>
                  {c?.is_primary ? (
                    <Badge color="light-success">{t("Primary")}</Badge>
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

export default ContactsTab;
