// Quotations for a customer. Reuses GET /admin/quotation/list?customer_id=
// — no new BE endpoint.

import { Fragment, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Table, UncontrolledTooltip } from "reactstrap";
import { Eye } from "react-feather";
import { useTranslation } from "react-i18next";

import {
  getQuotationList,
  cleanQuotationMessage,
} from "@src/views/quotations/store";
import { appsRoot } from "@constant/defaultValues";

const QuotationsTab = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const store = useSelector((s) => s.quotation);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    dispatch(
      getQuotationList({
        orderBy: "quotation_date",
        orderDirection: "desc",
        page: 1,
        perPage: 50,
        search: "",
        customer_id: id,
      })
    );
    setLoaded(true);
    return () => {
      dispatch(cleanQuotationMessage(null));
    };
  }, [id, dispatch]);

  const rows = store?.quotationItems || [];

  return (
    <Fragment>
      <h4 className="mb-2">{t("Quotations")}</h4>
      {loaded && rows.length === 0 ? (
        <div className="text-muted py-3 text-center">
          {t("No quotations for this customer yet.")}
        </div>
      ) : (
        <Table responsive bordered className="mb-0">
          <thead>
            <tr>
              <th>{t("Date")}</th>
              <th>{t("Quote #")}</th>
              <th>{t("Valid Until")}</th>
              <th>{t("Total")}</th>
              <th>{t("Status")}</th>
              <th className="text-center">{t("Action")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const sym = row?.currency_symbol || row?.currency_code || "";
              return (
                <tr key={row?._id}>
                  <td>{(row?.quotation_date || "").slice(0, 10) || "-"}</td>
                  <td className="text-wrap">{row?.voucher_no || "-"}</td>
                  <td>{(row?.valid_until || "").slice(0, 10) || "-"}</td>
                  <td>
                    {row?.grand_total !== null &&
                    row?.grand_total !== undefined
                      ? `${sym}${row.grand_total}`
                      : "-"}
                  </td>
                  <td className="text-capitalize">{row?.status || "-"}</td>
                  <td className="text-center">
                    <Link
                      to={`${appsRoot}/quotations/view/${row?._id}`}
                      id={`cust-qt-view-${row?._id}`}
                    >
                      <Eye size={18} />
                    </Link>
                    <UncontrolledTooltip
                      placement="top"
                      target={`cust-qt-view-${row?._id}`}
                    >
                      {t("View")}
                    </UncontrolledTooltip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Fragment>
  );
};

export default QuotationsTab;
