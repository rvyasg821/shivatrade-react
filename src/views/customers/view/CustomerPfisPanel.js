// Customer detail page — PFIs list. Bare-capable.

import { Fragment, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Table, UncontrolledTooltip, Badge } from "reactstrap";
import { Eye } from "react-feather";
import { useTranslation } from "react-i18next";

import { getPfiList, cleanPfiMessage } from "@src/views/pfi/store";
import { appsRoot } from "@constant/defaultValues";
import { formatDate } from "@src/utility/dateFormat";
import { QUOTATION_STATUS_BADGE_COLOR } from "@constant/options";

const fmt = (v) =>
  v === null || v === undefined || v === ""
    ? "-"
    : Number(v).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const CustomerPfisPanel = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const store = useSelector((s) => s.pfi);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    dispatch(
      getPfiList({
        orderBy: "pfi_date",
        orderDirection: "desc",
        page: 1,
        perPage: 50,
        search: "",
        customer_id: id,
      })
    );
    setLoaded(true);
    return () => {
      dispatch(cleanPfiMessage(null));
    };
  }, [id, dispatch]);

  const rows = store?.pfiItems || [];

  if (loaded && rows.length === 0) {
    return (
      <div className="text-muted py-3 text-center">
        {t("No PFIs for this customer yet.")}
      </div>
    );
  }

  return (
    <Fragment>
      <Table responsive bordered size="sm" className="mb-0 align-middle">
        <thead className="table-light">
          <tr>
            <th>{t("Date")}</th>
            <th>{t("PFI #")}</th>
            <th>{t("Valid Until")}</th>
            <th className="text-end">{t("Total")}</th>
            <th>{t("Status")}</th>
            <th className="text-center">{t("Action")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const sym = row?.currency_symbol || row?.currency_code || "";
            const status = (row?.status || "").toLowerCase();
            const color =
              QUOTATION_STATUS_BADGE_COLOR[status] || "secondary";
            return (
              <tr key={row?._id}>
                <td>{row?.pfi_date ? formatDate(row.pfi_date) : "-"}</td>
                <td className="text-wrap">{row?.voucher_no || "-"}</td>
                <td>{row?.valid_until ? formatDate(row.valid_until) : "-"}</td>
                <td className="text-end fw-bold">
                  {row?.grand_total !== null && row?.grand_total !== undefined
                    ? `${sym}${fmt(row.grand_total)}`
                    : "-"}
                </td>
                <td>
                  <Badge
                    color={`light-${color}`}
                    className={`badge-light-${color} text-capitalize`}
                  >
                    {row?.status || "-"}
                  </Badge>
                </td>
                <td className="text-center">
                  <Link
                    to={`${appsRoot}/pfi/view/${row?._id}`}
                    id={`cust-pfi-view-${row?._id}`}
                  >
                    <Eye size={18} />
                  </Link>
                  <UncontrolledTooltip
                    placement="top"
                    target={`cust-pfi-view-${row?._id}`}
                  >
                    {t("View")}
                  </UncontrolledTooltip>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Fragment>
  );
};

export default CustomerPfisPanel;
